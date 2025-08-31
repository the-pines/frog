// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
  function totalSupply() external view returns (uint256);
  function balanceOf(address) external view returns (uint256);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 value) external returns (bool);
  function transfer(address to, uint256 value) external returns (bool);
  function transferFrom(address from, address to, uint256 value) external returns (bool);
  function decimals() external view returns (uint8);
}

interface IERC4626 {
  function asset() external view returns (address);
  function deposit(uint256 assets, address receiver) external returns (uint256 shares);
  function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
  function previewRedeem(uint256 shares) external view returns (uint256 assets);
  function previewDeposit(uint256 assets) external view returns (uint256 shares);
  function balanceOf(address) external view returns (uint256);
  function approve(address spender, uint256 value) external returns (bool);
}

interface IWETH {
  function deposit() external payable;
  function withdraw(uint256) external;
  function balanceOf(address) external view returns (uint256);
  function approve(address spender, uint256 value) external returns (bool);
}

abstract contract ReentrancyGuard {
  uint256 private _status = 1;
  modifier nonReentrant() {
    require(_status == 1, "REENTRANCY");
    _status = 2;
    _;
    _status = 1;
  }
}

abstract contract Ownable {
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
  address public owner;
  modifier onlyOwner() { require(msg.sender == owner, "NOT_OWNER"); _; }
  constructor(address _owner) {
    require(_owner != address(0), "ZERO_OWNER");
    owner = _owner;
    emit OwnershipTransferred(address(0), _owner);
  }
  function transferOwnership(address newOwner) external onlyOwner {
    require(newOwner != address(0), "ZERO_OWNER");
    emit OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }
}

/**
 * Lisk ETH → wstETH → Mellow wstETH Vault (ERC-4626) restaking vault.
 */
contract SymbioticLiskETHVaultProxy is Ownable, ReentrancyGuard {
  IERC20   public immutable WSTETH;        
  IERC4626 public immutable MELLOW_VAULT; 
  IWETH    public immutable WETH;          

  address public feeRecipient;
  uint16  public feeBps = 5000;            // 50% split
  uint64  public unlockTime;               // time gate
  bool    public withdrawalsEnabled;       // manual override
  uint256 public goalWstETH;               // target wstETH amount for this vault

  // Operator role: can manage router allowlist alongside owner
  address public operator;

  mapping(address => bool) public isRouterAllowed;
  mapping(address => uint256) public userShares;     // shares in ERC-4626 held by this contract, attributed per-user
  mapping(address => uint256) public userPrincipal;  // total wstETH assets deposited (scaled down on partial withdraws)

  event RouterAllowed(address router, bool allowed);
  event ParamsUpdated(address feeRecipient, uint16 feeBps, uint64 unlockTime, bool withdrawalsEnabled);
  event OperatorUpdated(address indexed previousOperator, address indexed newOperator);
  event DepositedETH(address indexed user, address router, uint256 ethIn, uint256 wstBought, uint256 sharesOut);
  event DepositedWst(address indexed user, uint256 wstIn, uint256 sharesOut);
  event WithdrawnToETH(address indexed user, uint256 sharesIn, uint256 ethUser, uint256 ethFee);

  constructor(
    address _owner,
    address _wsteth,
    address _mellowVault,
    address _weth,
    address _feeRecipient,
    uint64  _unlockTime,
    uint256 _goalWstETH
  ) Ownable(_owner) {
    require(_wsteth != address(0) && _mellowVault != address(0) && _weth != address(0) && _feeRecipient != address(0), "ZERO_ADDR");
    WSTETH = IERC20(_wsteth);
    MELLOW_VAULT = IERC4626(_mellowVault);
    WETH = IWETH(_weth);
    feeRecipient = _feeRecipient;
    operator = _feeRecipient; // default operator to feeRecipient
    unlockTime = _unlockTime;
    goalWstETH = _goalWstETH;
    require(IERC20(_wsteth).approve(_mellowVault, type(uint256).max), "APPROVE_FAIL");

  
  }

  modifier onlyOwnerOrOperator() {
    require(msg.sender == owner || msg.sender == operator, "NOT_AUTHORIZED");
    _;
  }

  // --- admin ---

  function setParams(address _feeRecipient, uint16 _feeBps, uint64 _unlockTime, bool _withdrawalsEnabled) external onlyOwner {
    require(_feeRecipient != address(0), "ZERO_FEE_ADDR");
    require(_feeBps <= 10_000, "FEE_TOO_HIGH");
    feeRecipient = _feeRecipient;
    feeBps = _feeBps;
    unlockTime = _unlockTime;
    withdrawalsEnabled = _withdrawalsEnabled;
    emit ParamsUpdated(_feeRecipient, _feeBps, _unlockTime, _withdrawalsEnabled);
  }

  function setOperator(address newOperator) external onlyOwner {
    require(newOperator != address(0), "ZERO_OPERATOR");
    emit OperatorUpdated(operator, newOperator);
    operator = newOperator;
  }

  function setGoalWstETH(uint256 _goalWstETH) external onlyOwner {
    goalWstETH = _goalWstETH;
  }

  function setRouterAllowed(address router, bool allowed) external onlyOwnerOrOperator {
    isRouterAllowed[router] = allowed;
    emit RouterAllowed(router, allowed);
  }

  function resetMellowAllowance() external onlyOwner {
  require(WSTETH.approve(address(MELLOW_VAULT), 0), "APPROVE_ZERO_FAIL");
  require(WSTETH.approve(address(MELLOW_VAULT), type(uint256).max), "APPROVE_MAX_FAIL");
    }

  // --- views ---

  function canWithdraw() public view returns (bool) {
    return withdrawalsEnabled || block.timestamp >= unlockTime;
  }

  function currentAssetsOf(address user) public view returns (uint256 assets) {
    uint256 sh = userShares[user];
    if (sh == 0) return 0;
    assets = MELLOW_VAULT.previewRedeem(sh);
  }

  function rawWstETHBalance() external view returns (uint256) {
    return WSTETH.balanceOf(address(this));
  }

  function totalWstETHAssets() external view returns (uint256 assets) {
    uint256 sh = MELLOW_VAULT.balanceOf(address(this));
    if (sh == 0) return 0;
    assets = MELLOW_VAULT.previewRedeem(sh);
  }

  function profitOf(address user) external view returns (int256) {
    uint256 assets = currentAssetsOf(user);
    uint256 principal = userPrincipal[user];
    if (assets >= principal) return int256(assets - principal);
    return -int256(principal - assets);
  }

  // --- deposits ---

  /// ETH in → router swap (ETH→wstETH) → ERC-4626 deposit; receiver = this, user gets internal shares credit.
  function depositETHViaRouter(address router, bytes calldata swapCalldata, uint256 minWstOut) external payable nonReentrant {
    require(isRouterAllowed[router], "ROUTER_NOT_ALLOWED");
    require(msg.value > 0, "ZERO_ETH");

    uint256 wstBefore = WSTETH.balanceOf(address(this));
    (bool ok, ) = router.call{value: msg.value}(swapCalldata);
    require(ok, "ROUTER_CALL_FAIL");
    uint256 wstAfter = WSTETH.balanceOf(address(this));
    uint256 bought = wstAfter - wstBefore;
    require(bought >= minWstOut && bought > 0, "INSUFFICIENT_OUT");

    uint256 sharesOut = MELLOW_VAULT.deposit(bought, address(this));
    userShares[msg.sender] += sharesOut;
    userPrincipal[msg.sender] += bought;

    emit DepositedETH(msg.sender, router, msg.value, bought, sharesOut);
  }

  /// Direct wstETH deposit (user must approve this contract for `assets` first).
  function depositWstETH(uint256 assets) external nonReentrant {
    require(assets > 0, "ZERO_ASSETS");
    require(WSTETH.transferFrom(msg.sender, address(this), assets), "TRANSFER_IN_FAIL");
    uint256 sharesOut = MELLOW_VAULT.deposit(assets, address(this));
    userShares[msg.sender] += sharesOut;
    userPrincipal[msg.sender] += assets;
    emit DepositedWst(msg.sender, assets, sharesOut);
  }

  // --- withdrawals ---

  function withdrawSplitToETH(
    uint256 sharesToRedeem,
    address router,
    bytes calldata swapCalldata,
    uint256 minEthOut
  ) external nonReentrant {
    require(canWithdraw(), "WITHDRAW_LOCKED");
    require(isRouterAllowed[router], "ROUTER_NOT_ALLOWED");

    uint256 userSh = userShares[msg.sender];
    require(sharesToRedeem > 0 && sharesToRedeem <= userSh, "BAD_SHARE_AMOUNT");

    uint256 wstBefore = WSTETH.balanceOf(address(this));
    uint256 assetsOut = MELLOW_VAULT.redeem(sharesToRedeem, address(this), address(this));
    require(assetsOut > 0, "ZERO_ASSETS_OUT");
    uint256 wstReceived = WSTETH.balanceOf(address(this)) - wstBefore;
    require(wstReceived >= assetsOut, "WST_MISSING");

    uint256 allow = WSTETH.allowance(address(this), router);
    if (allow < wstReceived) {
      require(WSTETH.approve(router, 0), "APPROVE_ZERO_FAIL");
      require(WSTETH.approve(router, wstReceived), "APPROVE_ROUTER_FAIL");
    }

    uint256 ethBefore = address(this).balance;
    (bool ok, ) = router.call{value: 0}(swapCalldata);
    require(ok, "ROUTER_SWAP_FAIL");
    uint256 ethDelta = address(this).balance - ethBefore;

    if (ethDelta == 0) {
      uint256 wethBal = WETH.balanceOf(address(this));
      if (wethBal > 0) {
        WETH.withdraw(wethBal);
        ethDelta = address(this).balance - ethBefore;
      }
    }
    require(ethDelta >= minEthOut && ethDelta > 0, "INSUFFICIENT_ETH_OUT");

    uint256 feePart = (ethDelta * feeBps) / 10_000;
    uint256 userPart = ethDelta - feePart;

    (bool s1, ) = payable(msg.sender).call{value: userPart}("");
    require(s1, "ETH_USER_FAIL");
    (bool s2, ) = payable(feeRecipient).call{value: feePart}("");
    require(s2, "ETH_FEE_FAIL");

    uint256 remainingShares = userSh - sharesToRedeem;
    uint256 principal = userPrincipal[msg.sender];
    userShares[msg.sender] = remainingShares;
    userPrincipal[msg.sender] = (remainingShares == 0) ? 0 : (principal * remainingShares) / userSh;
    emit WithdrawnToETH(msg.sender, sharesToRedeem, userPart, feePart);
  }

  receive() external payable {}
}

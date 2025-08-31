// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
  function balanceOf(address) external view returns (uint256);
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256) external returns (bool);
  function transfer(address to, uint256) external returns (bool);
  function transferFrom(address from, address to, uint256) external returns (bool);
  function decimals() external view returns (uint8);
}

interface IERC4626 {
  function deposit(uint256 assets, address receiver) external returns (uint256 shares);
  function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
  function previewRedeem(uint256 shares) external view returns (uint256 assets);
  function previewDeposit(uint256 assets) external view returns (uint256 shares);
  function balanceOf(address) external view returns (uint256);
}

abstract contract ReentrancyGuard {
  uint256 private _status = 1;
  modifier nonReentrant() {
    require(_status == 1, "REENTRANCY");
    _status = 2; _;
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

contract SymbioticUSDCOperatorOwnerOnlyVault is Ownable, ReentrancyGuard {
  IERC20   public immutable USDC;
  IERC20   public immutable sUSDe;
  IERC4626 public immutable RS_VAULT;

  address public feeRecipient;      // == operator
  uint16  public feeBps = 5000;     // 50%
  uint64  public unlockTime;
  bool    public withdrawalsEnabled;
  address public operator;          // == feeRecipient

  mapping(address => bool) public isRouterAllowed;

  // owner-only position (all shares/principal tracked on owner)
  mapping(address => uint256) public userShares;     // use userShares[owner]
  mapping(address => uint256) public userPrincipal;  // use userPrincipal[owner] (sUSDe units)

  // contributor accounting for UI (sUSDe units)
  mapping(address => uint256) public contribPrincipal;
  uint256 public totalContributed;

  event RouterAllowed(address router, bool allowed);
  event ParamsUpdated(address feeRecipient, uint16 feeBps, uint64 unlockTime, bool withdrawalsEnabled);
  event OperatorUpdated(address operator);
  event Contributed(address indexed contributor, uint256 susdeAmount, uint256 sharesCreditedToOwner);
  event DepositedByOperator(address indexed contributor, address router, uint256 usdcIn, uint256 susdeOut, uint256 sharesOut);
  event WithdrawnToUSDC(address indexed caller, uint256 sharesIn, uint256 usdcOwner, uint256 usdcFee);

  modifier onlyOperator() { require(msg.sender == operator, "NOT_OPERATOR"); _; }

  constructor(
    address _owner,
    address _usdc,
    address _sUSDe,
    address _rsVault,
    address _operatorFeeRecipient, 
    uint64  _unlockTime
  ) Ownable(_owner) {
    require(_usdc != address(0) && _sUSDe != address(0) && _rsVault != address(0) && _operatorFeeRecipient != address(0), "ZERO_ADDR");
    USDC = IERC20(_usdc);
    sUSDe = IERC20(_sUSDe);
    RS_VAULT = IERC4626(_rsVault);
    feeRecipient = _operatorFeeRecipient;
    operator = _operatorFeeRecipient;
    unlockTime = _unlockTime;
    require(sUSDe.approve(_rsVault, type(uint256).max), "APPROVE_RS_FAIL");
  }

  // --- admin ---
  function setParams(address _feeRecipientOperator, uint16 _feeBps, uint64 _unlockTime, bool _withdrawalsEnabled) external onlyOwner {
    require(_feeRecipientOperator != address(0), "ZERO_FEE_ADDR");
    require(_feeBps <= 10_000, "FEE_TOO_HIGH");
    feeRecipient = _feeRecipientOperator;
    operator = _feeRecipientOperator;
    feeBps = _feeBps;
    unlockTime = _unlockTime;
    withdrawalsEnabled = _withdrawalsEnabled;
    emit OperatorUpdated(_feeRecipientOperator);
    emit ParamsUpdated(_feeRecipientOperator, _feeBps, _unlockTime, _withdrawalsEnabled);
  }
  function setRouterAllowed(address router, bool allowed) external onlyOwner {
    isRouterAllowed[router] = allowed;
    emit RouterAllowed(router, allowed);
  }

  // --- views ---
  function canWithdraw() public view returns (bool) {
    return withdrawalsEnabled || block.timestamp >= unlockTime;
  }
  function ownerShares() public view returns (uint256) { return userShares[owner]; }
  function ownerCurrentAssets() public view returns (uint256 assets) {
    uint256 sh = userShares[owner]; if (sh == 0) return 0;
    assets = RS_VAULT.previewRedeem(sh);
  }
  function contributorShareValue(address contributor) external view returns (uint256 susdeValue) {
    uint256 tot = totalContributed; if (tot == 0) return 0;
    uint256 assets = ownerCurrentAssets();
    return (assets * contribPrincipal[contributor]) / tot;
  }

  // --- deposits (operator pattern) ---
  /**
   * Operator must have already pulled USDC from contributor into this contract.
   * Router calldata swaps USDC -> sUSDe to THIS; shares credited to OWNER only.
   */
  function operatorDepositForOwner(
    address contributor,
    uint256 usdcAmount,
    address router,
    bytes calldata swapCalldata,
    uint256 minSusdeOut,
    uint256 minSharesOut
  ) external onlyOperator nonReentrant {
    require(contributor != address(0), "ZERO_CONTRIB");
    require(isRouterAllowed[router], "ROUTER_NOT_ALLOWED");
    require(usdcAmount > 0, "ZERO_AMOUNT");
    require(USDC.balanceOf(address(this)) >= usdcAmount, "INSUFFICIENT_VAULT_USDC");

    uint256 allowU = USDC.allowance(address(this), router);
    if (allowU < usdcAmount) {
      require(USDC.approve(router, 0), "APPROVE_U_ZERO");
      require(USDC.approve(router, usdcAmount), "APPROVE_U_FAIL");
    }

    uint256 sBefore = sUSDe.balanceOf(address(this));
    (bool ok, ) = router.call(swapCalldata);
    require(ok, "ROUTER_SWAP_FAIL");
    uint256 sBought = sUSDe.balanceOf(address(this)) - sBefore;
    require(sBought >= minSusdeOut && sBought > 0, "INSUFFICIENT_SUSDE");

    uint256 sharesOut = RS_VAULT.deposit(sBought, address(this));
    require(sharesOut >= minSharesOut && sharesOut > 0, "INSUFFICIENT_SHARES");

    userShares[owner] += sharesOut;
    userPrincipal[owner] += sBought;
    contribPrincipal[contributor] += sBought;
    totalContributed += sBought;

    emit Contributed(contributor, sBought, sharesOut);
    emit DepositedByOperator(contributor, router, usdcAmount, sBought, sharesOut);
  }

  // Optional direct sUSDe deposit by contributor
  function depositSUSDeForOwner(uint256 assets) external nonReentrant {
    require(assets > 0, "ZERO_ASSETS");
    require(sUSDe.transferFrom(msg.sender, address(this), assets), "SUSDE_IN_FAIL");
    uint256 sharesOut = RS_VAULT.deposit(assets, address(this));
    require(sharesOut > 0, "ZERO_SHARES");
    userShares[owner] += sharesOut;
    userPrincipal[owner] += assets;
    contribPrincipal[msg.sender] += assets;
    totalContributed += assets;
    emit Contributed(msg.sender, assets, sharesOut);
    emit DepositedByOperator(msg.sender, address(0), 0, assets, sharesOut);
  }

  // --- withdrawals (OWNER ONLY) ---
  function ownerWithdrawSplitToUSDC(
    uint256 sharesToRedeem,
    address router,
    bytes calldata swapCalldata,
    uint256 minUsdcOut
  ) external onlyOwner nonReentrant {
    require(canWithdraw(), "WITHDRAW_LOCKED");
    require(isRouterAllowed[router], "ROUTER_NOT_ALLOWED");

    uint256 oSh = userShares[owner];
    require(sharesToRedeem > 0 && sharesToRedeem <= oSh, "BAD_SHARES");

    uint256 sBefore = sUSDe.balanceOf(address(this));
    uint256 assetsOut = RS_VAULT.redeem(sharesToRedeem, address(this), address(this));
    require(assetsOut > 0, "ZERO_ASSETS_OUT");
    uint256 sRecv = sUSDe.balanceOf(address(this)) - sBefore;
    require(sRecv >= assetsOut, "SUSDE_MISSING");

    uint256 allowS = sUSDe.allowance(address(this), router);
    if (allowS < sRecv) {
      require(sUSDe.approve(router, 0), "APPROVE_S_ZERO");
      require(sUSDe.approve(router, sRecv), "APPROVE_S_FAIL");
    }

    uint256 uBefore = USDC.balanceOf(address(this));
    (bool ok, ) = router.call(swapCalldata);
    require(ok, "ROUTER_SWAP_FAIL");
    uint256 uDelta = USDC.balanceOf(address(this)) - uBefore;
    require(uDelta >= minUsdcOut && uDelta > 0, "INSUFFICIENT_USDC");

    uint256 feePart = (uDelta * feeBps) / 10_000;
    uint256 ownerPart = uDelta - feePart;

    require(USDC.transfer(feeRecipient, feePart), "USDC_FEE_FAIL");
    require(USDC.transfer(owner, ownerPart), "USDC_OWNER_FAIL");

    uint256 remainingShares = oSh - sharesToRedeem;
    uint256 principal = userPrincipal[owner];
    userShares[owner] = remainingShares;
    userPrincipal[owner] = (remainingShares == 0) ? 0 : (principal * remainingShares) / oSh;

    emit WithdrawnToUSDC(msg.sender, sharesToRedeem, ownerPart, feePart);
  }

  // --- owner utils ---
  function resetVaultApprovals() external onlyOwner {
    require(sUSDe.approve(address(RS_VAULT), 0), "RS_ZERO_FAIL");
    require(sUSDe.approve(address(RS_VAULT), type(uint256).max), "RS_MAX_FAIL");
  }
  function rescueToken(address token, address to, uint256 amount) external onlyOwner {
    require(to != address(0), "ZERO_TO");
    require(IERC20(token).transfer(to, amount), "RESCUE_FAIL");
  }
}

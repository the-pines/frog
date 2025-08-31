// SPDX-License-Identifier: MIT

// this is old
pragma solidity ^0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Vault
 * @notice Vault holds either ONE ERC20 or native MON, chosen at deploy.
 *         Anyone can contribute the chosen asset. Only creator can withdraw
 */
contract Vault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Immutable config
    address public immutable creator;
    IERC20  public immutable asset;      
    bool    public immutable isNative;   
    uint256 public immutable goal;       
    string  public name;

    bool public isWithdrawn;

    // Events
    event Deposited(address indexed from, uint256 amount, uint256 newBalance, bool isNative);
    event GoalReached(uint256 timestamp, uint256 balance);
    event Withdrawn(address indexed to, uint256 amount, bool isNative);

    // Errors
    error NotCreator();
    error GoalNotReached();
    error AlreadyWithdrawn();
    error InvalidParam();
    error ZeroAmount();
    error WrongAsset(); // sending wrong asset type

    constructor(
        address _creator,
        IERC20 _asset,           // set to IERC20(address(0)) if native
        bool _isNative,
        uint256 _goal,
        string memory _name
    ) payable {
        // Invariants:
        // - if native: asset must be zero
        // - if ERC20 : asset must be non-zero
        if (_creator == address(0) || _goal == 0) revert InvalidParam();
        if (_isNative) {
            if (address(_asset) != address(0)) revert InvalidParam();
        } else {
            if (address(_asset) == address(0)) revert InvalidParam();
        }
        creator = _creator;
        asset = _asset;
        isNative = _isNative;
        goal = _goal;
        name = _name;
    }

    // Views
    function assetBalance() public view returns (uint256) {
        return isNative ? address(this).balance : asset.balanceOf(address(this));
    }

    function canWithdraw() public view returns (bool) {
        return !isWithdrawn && assetBalance() >= goal;
    }

    // ---- Contributions ----

    /// @notice Contribute ERC20 (only for ERC20 vaults). Caller must have approved this contract.
    function contribute(uint256 amount) external nonReentrant {
        if (isNative) revert WrongAsset();
        if (amount == 0) revert ZeroAmount();
        asset.safeTransferFrom(msg.sender, address(this), amount);
        uint256 bal = asset.balanceOf(address(this));
        emit Deposited(msg.sender, amount, bal, false);
        if (!isWithdrawn && bal >= goal) emit GoalReached(block.timestamp, bal);
    }

    /// @notice Contribute native MON (only for native vaults).
    receive() external payable {
        if (!isNative) revert WrongAsset();
        if (msg.value == 0) revert ZeroAmount();
        uint256 bal = address(this).balance;
        emit Deposited(msg.sender, msg.value, bal, true);
        if (!isWithdrawn && bal >= goal) emit GoalReached(block.timestamp, bal);
    }

    /// @notice Explicit payable function (same as receive) for UIs.
    function contributeNative() external payable nonReentrant {
        if (!isNative) revert WrongAsset();
        if (msg.value == 0) revert ZeroAmount();
        uint256 bal = address(this).balance;
        emit Deposited(msg.sender, msg.value, bal, true);
        if (!isWithdrawn && bal >= goal) emit GoalReached(block.timestamp, bal);
    }

    // ---- Withdraw ----

    function withdraw() external nonReentrant {
        if (msg.sender != creator) revert NotCreator();
        if (isWithdrawn) revert AlreadyWithdrawn();

        uint256 bal = assetBalance();
        if (bal < goal) revert GoalNotReached();

        isWithdrawn = true;

        if (isNative) {
            (bool ok, ) = payable(creator).call{value: bal}("");
            require(ok, "native transfer failed");
            emit Withdrawn(creator, bal, true);
        } else {
            asset.safeTransfer(creator, bal);
            emit Withdrawn(creator, bal, false);
        }
    }
}

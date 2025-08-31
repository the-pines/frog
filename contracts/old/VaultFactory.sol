// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Vault} from "./Vault.sol";

/**
 * @notice Deploys vaults that hold either ERC20 OR native MON 
 *        
 */
contract VaultFactory {
    // Errors
    error InvalidOwner();

    event VaultCreated(
        address indexed deployer,
        address indexed owner,
        address vault,
        address indexed asset,
        bool isNative,
        uint256 goal,
        string name
    );

    // Indexes
    mapping(address => address[]) private _ownerVaults;    
    mapping(address => address[]) private _deployerVaults; 
    address[] private _allVaults;


    /// @notice Create an ERC20-denominated vault for `owner`.
    function createVaultERC20For(
        address owner,
        IERC20 asset,
        uint256 goal,
        string calldata name
    ) public returns (address vault) {
        if (owner == address(0)) revert InvalidOwner();
        vault = address(new Vault(owner, asset, false, goal, name));
        _ownerVaults[owner].push(vault);
        _deployerVaults[msg.sender].push(vault);
        _allVaults.push(vault);
        emit VaultCreated(msg.sender, owner, vault, address(asset), false, goal, name);
    }

    /// @notice Create a native MON vault for `owner`. `goal` is in wei.
    function createVaultNativeFor(
        address owner,
        uint256 goal,
        string calldata name
    ) public returns (address vault) {
        if (owner == address(0)) revert InvalidOwner();
        vault = address(new Vault(owner, IERC20(address(0)), true, goal, name));
        _ownerVaults[owner].push(vault);
        _deployerVaults[msg.sender].push(vault);
        _allVaults.push(vault);
        emit VaultCreated(msg.sender, owner, vault, address(0), true, goal, name);
    }

// backwrads compaitilbity 
    function createVaultERC20(
        IERC20 asset,
        uint256 goal,
        string calldata name
    ) external returns (address vault) {
        return createVaultERC20For(msg.sender, asset, goal, name);
    }

    function createVaultNative(
        uint256 goal,
        string calldata name
    ) external returns (address vault) {
        return createVaultNativeFor(msg.sender, goal, name);
    }

    // -------- Views --------

    function getOwnerVaults(address owner) external view returns (address[] memory) {
        return _ownerVaults[owner];
    }

    /// @notice Vaults deployed by a given factory caller.
    function getDeployerVaults(address deployer) external view returns (address[] memory) {
        return _deployerVaults[deployer];
    }

    /// @dev Alias to ease migration if you previously used "creator".
    function getCreatorVaults(address creator) external view returns (address[] memory) {
        return _ownerVaults[creator];
    }

    function allVaultsLength() external view returns (uint256) {
        return _allVaults.length;
    }

    function allVaults(uint256 i) external view returns (address) {
        return _allVaults[i];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SymbioticUSDCVaultProxy.sol";

contract SymbioticUSDCVaultProxyFactory {
  event VaultCreated(address indexed owner, address vault, address operatorFeeRecipient, uint64 unlockTime);

  address public immutable USDC;
  address public immutable SUSDE;
  address public immutable RS_VAULT;

  address[] public allVaults;
  mapping(address => address[]) public vaultsByOwner;

  constructor(address usdc, address susde, address rsVault) {
    require(usdc != address(0) && susde != address(0) && rsVault != address(0), "ZERO_ADDR");
    USDC = usdc;
    SUSDE = susde;
    RS_VAULT = rsVault;
  }

  function createVault(
    address owner_,
    address operatorFeeRecipient, 
    uint64  unlockTime
  ) external returns (address vault) {
    vault = address(new SymbioticUSDCOperatorOwnerOnlyVault(
      owner_,
      USDC,
      SUSDE,
      RS_VAULT,
      operatorFeeRecipient,
      unlockTime
    ));
    allVaults.push(vault);
    vaultsByOwner[owner_].push(vault);
    emit VaultCreated(owner_, vault, operatorFeeRecipient, unlockTime);
  }

  function allVaultsLength() external view returns (uint256) { return allVaults.length; }
  function ownerVaultsLength(address owner_) external view returns (uint256) { return vaultsByOwner[owner_].length; }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {SymbioticLiskETHVaultProxy} from "./SymbioticLiskEthVaultProxy.sol";

contract LiskETHRestakeVaultFactory {
  address public immutable WSTETH;
  address public immutable MELLOW_VAULT;
  address public immutable WETH;

  event VaultCreated(address indexed owner, address indexed feeRecipient, uint64 unlockTime, uint256 goalWstETH, address vault);

  constructor(address _wsteth, address _mellowVault, address _weth) {
    require(_wsteth != address(0) && _mellowVault != address(0) && _weth != address(0), "ZERO_ADDR");
    WSTETH = _wsteth;
    MELLOW_VAULT = _mellowVault;
    WETH = _weth;
  }

  function createVault(address owner_, address feeRecipient, uint64 unlockTime, uint256 goalWstETH)
    external
    returns (address vault)
  {
    vault = address(new SymbioticLiskETHVaultProxy(owner_, WSTETH, MELLOW_VAULT, WETH, feeRecipient, unlockTime, goalWstETH));
    emit VaultCreated(owner_, feeRecipient, unlockTime, goalWstETH, vault);
  }
}

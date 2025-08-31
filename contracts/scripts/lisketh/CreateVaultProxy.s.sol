// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../../typescript/node_modules/forge-std/src/Script.sol";
import {LiskETHRestakeVaultFactory} from "../../contracts/liskEth/SymbioticLiskETHVaultProxyFactory.sol";

contract CreateVaultFromFactory is Script {
    function run(address factoryAddr, address owner, address feeRecipient, uint256 unlockTime, uint256 goalWstETH)
        external
        returns (address vault)
    {
        vm.startBroadcast();
        vault = LiskETHRestakeVaultFactory(factoryAddr).createVault(
            owner, feeRecipient, uint64(unlockTime), goalWstETH
        );
        vm.stopBroadcast();
    }
}

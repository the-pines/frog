// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "../../typescript/node_modules/forge-std/src/Script.sol";
import {LiskETHRestakeVaultFactory} from "../../contracts/liskEth/SymbioticLiskETHVaultProxyFactory.sol";

contract DeployVaultFactory is Script {
    function run(address wsteth, address mellowVault, address weth) external returns (address factory) {
        vm.startBroadcast();
        factory = address(new LiskETHRestakeVaultFactory(wsteth, mellowVault, weth));
        vm.stopBroadcast();
    }
}

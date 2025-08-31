// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VaultFactory} from "contracts/VaultFactory.sol";

contract CreateVaultScript is Script {
    function run(address factoryAddr, address asset, uint256 goal, string memory name) external returns (address vault) {
        vm.startBroadcast();
        vault = VaultFactory(factoryAddr).createVault(IERC20(asset), goal, name);
        vm.stopBroadcast();
    }
}

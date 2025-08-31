// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "../node_modules/forge-std/src/Script.sol";
import {PointsToken} from "contracts/PointsToken.sol";

contract DeployPointsTokenScript is Script {
	function run(address initialMinter) external returns (PointsToken token) {
		vm.startBroadcast();
		token = new PointsToken(initialMinter);
		vm.stopBroadcast();
	}
}

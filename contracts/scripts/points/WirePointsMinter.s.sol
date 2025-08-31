// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "../node_modules/forge-std/src/Script.sol";
import {PointsToken} from "contracts/PointsToken.sol";

contract WirePointsMinterScript is Script {
	function run(address pointsToken, address newMinter) external {
		vm.startBroadcast();
		PointsToken(pointsToken).setMinter(newMinter);
		vm.stopBroadcast();
	}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "../node_modules/forge-std/src/Script.sol";
import {AdminMinterLeaderboard} from "contracts/AdminMinterLeaderboard.sol";

contract DeployAdminMinterLeaderboardScript is Script {
	function run(address pointsToken) external returns (AdminMinterLeaderboard aml) {
		vm.startBroadcast();
		aml = new AdminMinterLeaderboard(pointsToken);
		vm.stopBroadcast();
	}
}

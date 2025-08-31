// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "../node_modules/forge-std/src/Script.sol";
import {PointsToken} from "contracts/PointsToken.sol";
import {AdminMinterLeaderboard} from "contracts/AdminMinterLeaderboard.sol";

contract DeployPointsAndAdminScript is Script {
    function run()
        external
        returns (PointsToken token, AdminMinterLeaderboard aml)
    {
        vm.startBroadcast(); 

        token = new PointsToken(tx.origin);

        aml = new AdminMinterLeaderboard(address(token));

        vm.stopBroadcast();
    }
}

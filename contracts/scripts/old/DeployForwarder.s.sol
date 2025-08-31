// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

contract DeployForwarder is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        ERC2771Forwarder fwd = new ERC2771Forwarder("Monad Pay Forwarder");
        console2.log("ERC2771Forwarder:", address(fwd));
        vm.stopBroadcast();
    }
}

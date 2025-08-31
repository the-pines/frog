// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC2771Context} from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract MyApp is ERC2771Context {
    address public immutable owner;

    constructor(address trustedForwarder)
        ERC2771Context(trustedForwarder)
    {
        owner = _msgSender();
    }

    function doThing(bytes32 id) external {
        address user = _msgSender(); 
       
    }

    // Required overrides when also inheriting from Context elsewhere
    function _msgSender() internal view override returns (address sender) {
        return ERC2771Context._msgSender();
    }
    function _msgData() internal view override returns (bytes calldata) {
        return ERC2771Context._msgData();
    }
}

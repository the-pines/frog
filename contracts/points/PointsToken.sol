// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PointsToken {
    string public constant name = "Hunt Points";
    string public constant symbol = "HPOINT";
    uint8  public constant decimals = 0;

    address public minter; // AdminMinterLeaderboard contract
    mapping(address => uint256) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);

    modifier onlyMinter() { require(msg.sender == minter, "not minter"); _; }

    constructor(address _minter) {
        minter = _minter;
    }

    function setMinter(address _minter) external onlyMinter {
        emit MinterUpdated(minter, _minter);
        minter = _minter;
    }

    function transfer(address, uint256) external pure returns (bool) { revert("soulbound"); }

    function mint(address to, uint256 amount) external onlyMinter {
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external onlyMinter {
        require(balanceOf[from] >= amount, "insufficient");
        balanceOf[from] -= amount;
        emit Transfer(from, address(0), amount);
    }
}

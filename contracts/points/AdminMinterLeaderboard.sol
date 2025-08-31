// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPointsToken {
    function mint(address to, uint256 amount) external;
    function balanceOf(address who) external view returns (uint256);
}

contract AdminMinterLeaderboard {
    IPointsToken public points;
    mapping(address => bool) public admins;

    uint256 public constant TOPK = 20;

    mapping(address => uint256) public lifetime;

    struct Entry { address user; uint256 pts; }
    Entry[TOPK] private _top;

    event AdminUpdated(address indexed admin, bool enabled);
    event Awarded(address indexed user, uint256 amount);
    event AwardedBatch(uint256 count);
    event TopUpdated(address indexed user, uint256 newScore);

    modifier onlyAdmin() {
        require(admins[msg.sender], "AML:not-admin");
        _;
    }

    constructor(address pointsToken) {
        require(pointsToken != address(0), "AML:points-zero");
        points = IPointsToken(pointsToken);
        admins[msg.sender] = true;
        emit AdminUpdated(msg.sender, true);
    }

    function setAdmin(address user, bool ok) external onlyAdmin {
        require(user != address(0), "AML:zero-admin");
        admins[user] = ok;
        emit AdminUpdated(user, ok);
    }

    function award(address user, uint256 amount) public onlyAdmin {
        require(user != address(0) && amount > 0, "AML:bad-award");
        points.mint(user, amount);

        uint256 newScore = lifetime[user] + amount;
        lifetime[user] = newScore;

        _maybeInsertTop(user, newScore);
        emit Awarded(user, amount);
    }

    function awardBatch(address[] calldata users, uint256[] calldata amounts) external onlyAdmin {
        uint256 n = users.length;
        require(n == amounts.length && n > 0, "AML:bad-arrays");
        for (uint256 i = 0; i < n; i++) {
            address u = users[i];
            uint256 a = amounts[i];
            points.mint(u, a);
            uint256 newScore = lifetime[u] + a;
            lifetime[u] = newScore;
            _maybeInsertTop(u, newScore);
        }
        emit AwardedBatch(n);
    }

    function getTop() external view returns (Entry[TOPK] memory snapshot) {
        return _top;
    }

    function topAt(uint256 idx) external view returns (address user, uint256 pts) {
        require(idx < TOPK, "AML:idx");
        Entry memory e = _top[idx];
        return (e.user, e.pts);
    }

    function _maybeInsertTop(address user, uint256 score) internal {
        for (uint256 i = 0; i < TOPK; i++) {
            if (_top[i].user == user) {
                _top[i].pts = score;
                _resort();
                emit TopUpdated(user, score);
                return;
            }
        }

        uint256 idxMin = 0;
        uint256 minPts = type(uint256).max;
        for (uint256 i = 0; i < TOPK; i++) {
            if (_top[i].user == address(0)) {
                _top[i] = Entry(user, score);
                _resort();
                emit TopUpdated(user, score);
                return;
            }
            if (_top[i].pts < minPts) { minPts = _top[i].pts; idxMin = i; }
        }

        if (score > minPts) {
            _top[idxMin] = Entry(user, score);
            _resort();
            emit TopUpdated(user, score);
        }
    }

    function _resort() internal {
        for (uint256 i = 1; i < TOPK; i++) {
            Entry memory key = _top[i];
            uint256 j = i;
            while (j > 0 && _top[j - 1].pts < key.pts) {
                _top[j] = _top[j - 1];
                j--;
            }
            _top[j] = key;
        }
    }
}

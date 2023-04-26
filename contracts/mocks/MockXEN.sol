// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IBurnableToken.sol";
import "../interfaces/IBurnRedeemable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract MockXEN is IBurnableToken {
    mapping(address => uint256) internal userBurns;
    function burn(address user, uint256 amount) external {
        require(
            IERC165(msg.sender).supportsInterface(
                type(IBurnRedeemable).interfaceId
            ),
            "Burn: not a supported contract"
        );

        userBurns[user] += amount;
        IBurnRedeemable(msg.sender).onTokenBurned(user, amount);
    }

    function burnedBy(address user) external view returns (uint256) {
        return userBurns[user];
    }
}

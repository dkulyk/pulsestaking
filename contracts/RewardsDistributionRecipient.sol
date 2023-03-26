// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @notice An abstract contract to define functionality for reward distributer
 */
abstract contract RewardsDistributionRecipient {
    address public rewardsDistribution;

    function notifyRewardAmount(uint256 reward) external virtual;

    modifier onlyRewardsDistribution() {
        require(
            msg.sender == rewardsDistribution,
            "Caller is not RewardsDistribution contract"
        );
        _;
    }
}

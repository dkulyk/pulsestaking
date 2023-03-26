// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../StakingRewards.sol";

/**
 * @notice An extended staking contract. Only to be used for testing
 */
contract MockStakingRewards is StakingRewards {
    constructor(
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken
    ) StakingRewards(_rewardsDistribution, _rewardsToken, _stakingToken) {}

    /**
     * @notice Change the staking period duration. Only use when no active staking period
     * @param newDays New duration of the staking period, in days
     */
    function changeStakingPeriod(uint256 newDays) public {
        uint256 inSeconds = newDays * 60 * 60 * 24;
        rewardsDuration = inSeconds;
    }
}

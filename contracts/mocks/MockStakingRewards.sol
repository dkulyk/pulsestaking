// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../StakingRewards.sol";

contract MockStakingRewards is StakingRewards {
    constructor(
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken
    ) StakingRewards(_rewardsDistribution, _rewardsToken, _stakingToken) {}

    function changeStakingPeriod(uint256 newDays) public {
        uint256 inSeconds = newDays * 60 * 60 * 24;
        rewardsDuration = inSeconds;
    }
}

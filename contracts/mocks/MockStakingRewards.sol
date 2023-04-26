// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../StakingRewards.sol";

/**
 * @notice An extended staking contract. Only to be used for testing
 */
contract MockStakingRewards is StakingRewards {
    constructor(
        address _rewardsDistribution,
        address _stakingToken,
        address _xenToken
    ) StakingRewards(_rewardsDistribution, _stakingToken, _xenToken) {}
}

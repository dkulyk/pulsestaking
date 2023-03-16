// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IWETH.sol";
import "./StakingRewards.sol";

contract Converter {
    StakingRewards public staking;
    IWETH public rewardsToken;

    constructor(address _staking, address _rewardsToken) {
        staking = StakingRewards(_staking);
        rewardsToken = IWETH(payable(_rewardsToken));
    }

    function deposit() public payable {
        rewardsToken.deposit{value: msg.value}();
    }

    receive() external payable {
        deposit();
    }

    function flush() external {
        uint256 balance = rewardsToken.balanceOf(address(this));
        rewardsToken.transfer(address(staking), balance);
        staking.notifyRewardAmount(balance);
    }
}

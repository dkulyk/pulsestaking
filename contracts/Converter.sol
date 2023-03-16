// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IWETH.sol";
import "./StakingRewards.sol";

contract Converter {
    StakingRewards public staking;
    IWETH public rewardsToken;

    constructor(address _rewardsToken) {
        rewardsToken = IWETH(payable(_rewardsToken));
    }

    function setStakingContract(address _staking) public {
        if (address(staking) == address(0x0)) {
            staking = StakingRewards(_staking);
        }
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

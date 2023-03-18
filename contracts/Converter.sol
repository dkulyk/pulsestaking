// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IWETH.sol";
import "./StakingRewards.sol";

/**
 *   @notice Contract for converting native assets to wrapped version, and to flush the wrapped versions to a staking contract
 */
contract Converter {
    StakingRewards public staking;
    IWETH public rewardsToken;

    /**
     * @notice Called upon deployment
     * @param _rewardsToken Address of the token to be used as the rewards token. This has be a wrapped token
     */
    constructor(address _rewardsToken) {
        require(_rewardsToken != address(0x0), "Invalid token");
        rewardsToken = IWETH(payable(_rewardsToken));
    }

    /**
     * @notice Sets a new staking contract. Only callable once.
     * Can't be set in the constructor as the staking contract requires a reference to this contract,
     * so it has to be deployed after deploying this contract but before setting the staking address here.
     * In theory someone may set this to a malicious address before we set it, but in that case we can just redeploy.
     * @param _staking Address of the staking contract
     */
    function setStakingContract(address _staking) public {
        require(address(staking) == address(0x0), "Already set");
        staking = StakingRewards(_staking);
    }

    /**
     * @notice Deposit native asset to be converted into a wrapped version
     */
    function deposit() public payable {
        rewardsToken.deposit{value: msg.value}();
    }

    /**
     * @notice Fallback for any native asset sends. Leads to deposit
     */
    receive() external payable {
        deposit();
    }

    /**
     * @notice Flushes all reward tokens in the contract to the set staking contract
     */
    function flush() external {
        require(address(staking) != address(0x0), "No staking set");
        uint256 balance = rewardsToken.balanceOf(address(this));
        rewardsToken.transfer(address(staking), balance);
        staking.notifyRewardAmount(balance);
    }
}

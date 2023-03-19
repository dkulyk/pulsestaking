# Staking functionality for Pulse project

This project contains two contracts: a staking contract and a separate conversion contract.

## Conversion contract

The conversion contract is in charge of converting the blockchain's native asset into reward ERC20 tokens, and to hold staking reward assets until they are flushed to the staking contract.

Whenever native assets are input to the contract it automatically converts it to the reward token. The tokens are then kept in the contract, until flushed.

Anyone can flush all of the reward tokens in the contract to the staking contract, whenever. Flushing notifies the staking contract of the new rewards and its reward rates are adjusted accordingly.

For the purpose of this project it is assumed that the reward token is a wrapped token which can be obtained by depositing native asset to a specific wrapper contract and getting the wrapped token in return. It is assumed that an address is available for the wrapped token when a real deployment is done. No real trading or anything like is implemented.

### Functionality:

- Whenever native assets are sent to this contract, the assets are converted to a wrapped version (also called the reward token) and kept in this contract
- Function to flush all reward tokens in the contract to the staking contract. This also notifies the staking contract of the new rewards. This is callable by anyone
- Reward tokens can be sent to this contract from wherever for later flushing
- No other functionality: no owners, no special access, nothing more

## Staking contract

The staking contract is based on the staking contract by Synthetix (https://github.com/Synthetixio/synthetix/blob/c53070db9a93e5717ca7f74fcaf3922e991fb71b/contracts/StakingRewards.sol). The contract will be kept as close to the original as possible.

### Original Synthetix features

1. Has one ERC20 staking token.
1. Has one ERC20 rewards token. Can be different than the staking token.
1. Anyone can stake whenever.
1. Any staker can increase their current stake by staking again
1. The amount of stakers does not influence the contract usage costs: the contract scales perfectly
1. Any staker can withdraw current accumulated rewards whenever. Not possible to withdraw only partial rewards.
1. Any staker can withdraw all of his stakes whenever
1. Any staker can withdraw all of his stakes and accumulated rewards whenever
1. A designated address (so called _reward distributer_) can notify the staking contract of new rewards whenever. This extends the current staking period by the default staking period amount. Note that anyone can send whatever tokens to the contract, including reward tokens, but only the reward distributer address can tell the staking contract to update its reward ratios based on new reward tokens.
1. Rewards are never lost for users for any reason
1. All rewards are distributed fairly to users depending on how long they have staked for and how much they have staked
1. The contract has an owner
1. Has functionality to recover any ERC20 which was accidentally sent to the contract. This is callable only by the contract owner
1. The staking period duration can be changed. This is callable only by the contract owner. This can only be performed when there is no active staking period.
1. Prevent (re)staking by pausing the contract. This is callable only by the contract owner

#### Staking algorithm

The algorithm used by the staking contract is rather elegant, but complicated. There is no looping and the contract scales up perfectly - which means that regardless of the amount of stakers, the usage costs remain the same.

You can learn about the algorithm in this awesome video series: https://www.youtube.com/watch?v=6ZO5aYg1GI8

#### Staking period

The staking period is an internal construct, and is typically not visible for the end users in any way. By default the staking period is 7 days.

A staking period starts by a _reward distributer_ entering rewards into the contract. Starting from that point onwards the stakers accumulate rewards. All the input rewards are distributed during that staking period. Once the staking period ends, nobody accumulates rewards until a new period is started explicitly by entering more rewards. Also more rewards can be added during a staking period, and those are distributed fairly to stakers.

When a user stakes he does not stake for any staking period but from the user's perspective the staking period is open ended. User only decides how many tokens he wants to stake and he can unstake whenever he wants to. He participates in whatever internal staking periods are ongoing during his staking. In the worst case, especially if the user stakes only for a very short period, he may not get any rewards if there is no active staking period.

### Changes done to the Synthetix contract

1. Removed all owner-related functionality:
   1. Pausing staking
   1. Changing staking period duration
   1. Recovery of arbitrary ERC20 tokens
   1. Changing reward distributor address
   1. The concept of owner
1. Upgraded used OpenZeppelin contract versions
1. Started using Solidity version 0.8.17
1. Removed the use of SafeMath (no longer needed with new Solidity)
1. Removed the use of IStakingRewards interface

### Usage

- To stake, call the `stake` function. Can be used also to increase your current stake
- To unstake some amount of your stake, call the `withdraw` function
- To collect all of your accumulated rewards, call the `getReward` function
- To unstake everything and collect all rewards, call the `exit` function

### Deployment settings

To deploy the contract the following information is needed:

1. Deployment parameters:
   1. Which address is allowed to add reward tokens to the contract. This should be the 'conversion' contract so it can add rewards.
   1. Which address is the reward token
   1. Which address is the staking token
1. Contract static parameters:
   1. Staking period duration. The default is 7 days.

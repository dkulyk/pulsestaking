# Staking functionality for Pulse project

There will be two contracts: the staking contract and a separate conversion contract.

The staking contract will be based on the staking contract by Synthetix (https://github.com/Synthetixio/synthetix/blob/c53070db9a93e5717ca7f74fcaf3922e991fb71b/contracts/StakingRewards.sol). The contract will be kept as close to the original as possible.

## Conversion contract

We will implement a separate contract which is in charge of converting the blockchain's native asset into reward ERC20 tokens.

Whenever native assets are input to the contract it automatically converts it to the reward token and sends to the staking contract to increase the reward.

For the purpose of this project it is assumed that the reward token is a wrapped token which can be obtained by depositing native asset to a specific wrapper contract and getting the wrapped token in return. It is assumed that an address is available for the wrapped token. No real trading or anything like that will be implemented.

### Functionality:

- Whenever native assets are sent to this contract, the assets are converted to a wrapped version (also called the reward token) and kept in this contract
- Function to flush all reward tokens in the contract to the staking contract. This also notifies the staking contract of the new rewards. This is callable by anyone
- Reward tokens are sent to this contract from the marketplace contract
- No other functionality: no owners, no special access, nothing more

## Staking contract

### Original Synthetix features 

1. Has one ERC20 staking token.
1. Has one ERC20 rewards token. Can be different than the staking token.
1. Anyone can stake whenever.
1. Any staker can increase their current stake by staking again
1. The amount of stakers does not influence the contract usage costs: the contract scales perfectly
1. Any staker can withdraw current accumulated rewards whenever. Not possible to withdraw only partial rewards.
1. Any staker can withdraw all of his stakes whenever
1. Any staker can withdraw all of his stakes and accumulated rewards whenever
1. A designated address (so called *reward distributer*) can notify the staking contract of new rewards whenever. This extends the current staking period by the default staking period amount. Note that anyone can send whatever tokens to the contract, including reward tokens, but only the reward distributer address can tell the staking contract to update its reward ratios based on new reward tokens.
1. Rewards are never lost for users for any reason
1. All rewards are distributed fairly to users depending on how long they have staked for and how much they have staked
1. The contract has an owner
1. Has functionality to recover any ERC20 which was accidentally sent to the contract. This is callable only by the contract owner
1. The staking period duration can be changed. This is callable only by the contract owner. This can only be performed when there is no active staking period.
1. Prevent (re)staking by pausing the contract. This is callable only by the contract owner

#### Staking period

The staking period is an internal construct, and is typically not visible for the end users in any way. By default the staking period is 7 days.

A staking period starts by the owner (or, to be more precise, a *reward distributer*) entering rewards into the contract. Starting from that point onwards the stakers accumulate rewards. All the input rewards are distributed during that staking period. Once the staking period ends, nobody accumulates rewards until a new period is started explicitly by entering more rewards. Also more rewards can be added during a staking period, and those are distributed fairly to stakers.

When a user stakes he does not stake for any staking period but from the user's perspective the staking period is open ended. User only decides how many tokens he wants to stake and he can unstake whenever he wants to. He participates in whatever internal staking periods are ongoing during his staking. In the worst case, especially if the user stakes only for a very short period, he may not get any rewards if there is no active staking period.

#### Staking algorithm

The algorithm used by the staking contract is rather elegant, but complicated. There is no looping and the contract scales up perfectly - which means that regardless of the amount of stakers, the usage costs remain the same.

You can learn about the algorithm in this awesome video series: https://www.youtube.com/watch?v=6ZO5aYg1GI8 

### Contract settings

To deploy the contract the following information is needed:
1. Deployment parameters:
  1. Owner address
  1. Which address is allowed to add reward tokens to the contract. This should be the 'conversion' contract so it can add rewards.
  1. Which address is the reward token
  1. Which address is the staking token
1. Contract static parameters:
  1. Staking period duration. The default is 7 days. 

### Possible issues

#### Don't send rewards directly

The marketplace contract should not be sending rewards directly to the staking contract because if you do, then:
- The marketplace contract would need extra functionality to inform the staking contract that new reward tokens are now available to it. Simply sending the tokens isn't enough
- You have no control over when the rewards are sent (or to be more precise: when the staking contract is notified of new rewards)
- You would have no way of redirecting some of the reward tokens anywhere else (although this may be a good thing also) if that's desired at some point
- The staking contract's staking period would never end, since the period is always extended when new tokens are received. This wouldn't hurt staking rewards, but the owner would not be able to change the reward duration ever, since it can only be done when there is no active staking period. This may not be an issue at all.

Mitigation suggestion: use the conversion contract for relaying all rewards to the staking contract. To be decided: can anyone flush the rewards or only some certain address?

#### Staking period never ends

If you don't control when the rewards are sent to the staking contract, its staking period probably never ends, since each time new rewards are input the staking period restarts.

The only problem with a never ending staking period is that the staking period length can only be changed if there is no active staking period. This may not be a problem at all.

### Changes needed for the original Synthetix contract

1. Possible changes depend on how well the original Synthetix contract suits the client's needs.




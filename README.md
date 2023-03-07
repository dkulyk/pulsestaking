# Staking functionality for Pulse project

There will be two contracts: the staking contract and a separate conversion contract.

The staking contract will be based on the staking contract by Synthetix (https://github.com/Synthetixio/synthetix/blob/c53070db9a93e5717ca7f74fcaf3922e991fb71b/contracts/StakingRewards.sol). The contract will be kept as close to the original as possible.

## Conversion contract

We will implement a separate contract which is in charge of converting the blockchain's native asset into staking ERC20 tokens.

Whenever native assets are input to the contract it automatically converts it to the staking token and sends to the staking to increase stake for the user.

## Staking contract

### Original Synthetix features 

1. Has one ERC20 staking token.
1. Has one ERC20 rewards token. Can be different than the staking token.
1. The contract has an owner.
1. Anyone can stake whenever.
1. Any staker can increase their current stake by staking again
1. The amount of stakers does not influence the contract usage costs: the contract scales perfectly
1. Any staker can withdraw current accumulated rewards whenever. Not possible to withdraw only partial rewards.
1. Any staker can withdraw all of his stakes whenever
1. Any staker can withdraw all of his stakes and accumulated rewards whenever
1. A designated addres (so called *reward distributer*) s can input new rewards (tokens) whenever. This starts a new internal staking period.
1. Rewards are never lost for users for any reason
1. Has functionality to recover any ERC20 which was accidentally sent to the contract. This is callable only by the contract owner
1. The internal staking period duration can be changed by the owner. This can only be performed when there is no active internal staking period.
1. Can be paused by owner. Pausing prevents only (re)staking

#### Staking period

The staking period is an internal construct, and is typically not visible for the end users in any way. By default the staking period is 7 days.

A staking period starts by the owner (or, to be more precise, a *reward distributer*) entering rewards into the contract. Starting from that point onwards the stakers accumulate rewards. All the input rewards are distributed during that staking period. Once the staking period ends, nobody accumulates rewards until a new period is started explicitly by entering more rewards. Also more rewards can be added during a staking period, and those are distributed fairly to stakers.

When a user stakes he does not stake for any staking period but from the user's perspective the staking period is open ended. User only decides how many tokens he wants to stake and he can unstake whenever he wants to. He participates in whatever internal staking periods are ongoing during his staking. In the worst case, especially if the user stakes only for a very short period, he may not get any rewards if there is no active staking period.


### Changes needed for the original Synthetix contract

1. Add functionality to be able to stake on behalf of someone else. This is needed to enable the conversion contract to stake on behalf of a user.




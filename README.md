# Staking functionality for Pulse project

## Functionality

- Staking: user can insert stake whenever, for whatever amount. The staking asset is an ERC20 token. The stake is valid for the next staking period (and periods after that)
- Unstaking: user can unstake whenever. TODO: undecided whether can unstake an arbitrary amount (and when)
- Withdraw: user can withdraw accrued rewards whenever. No rewards are ever lost
- Enter rewards: anyone can enter rewards, which are distributed for the stakers

TODO: Is certain admin functionality needed, for example to change the staking period length?

## Concepts

### Staking and staking periods

Before a staking period starts:

- Users can enter stakes for the upcoming staking period

During a staking period:

- Anyone can enter rewards for the ongoing staking period
- Users can enter stakes for the next staking period

After a staking period has ended:

- Users can withdraw rewards for the ended staking period(s)

#### Staking

User can enter stakes whenever, but they only count for the next starting staking period.

TODO: Unstaking: when can user unstake and which assets?

### Starting and ending a staking period

Any user who interacts with the contract will trigger a staking period start and/or end, if such is needed based on the blockchain's timestamp.

In theory, this means that a staking period may not be explicitly closed at the right time, but it may continue until any user interacts with the contract. TODO: figure out if this causes problems somewhere

## Calculating rewards

When user enters a stake, the staking amount is added for the upcoming staking period's total stake amount. At the end of the staking period, the user's share of the total stakes is calculated and his share of the staking period reward is calculated.

It is possible for users to gain bigger rewards for their stakes if they lock the stake for a longer period. In that case the weighted amount is added to the total stakes. Locked stakes can only be unstaked after the lock period has ended.

## Scalability

The contract scales almost perfectly: the amount of stakers has no influence on how much gas is required for reward calculations. The only minor scalability issue is that rewards need to be calculated for each past staking period: in theory user can have an unlimited amount of past staking period for which his rewards need to be calculated when withdrawing rewards. In reality, if the staking period is 1 month, there are probably a maximum of a few dozes staking periods for any user, which shouldn't be an issue gas-wise.

## Possible issues

- The reward ratio for a staking period is known only once the period has ended, because the rewards for the staking period are accummulated in the contract only during the period. So, in theory, it's possible users get 0% rewards for a staking period if nobody enters rewards.
  - If this is an issue, the rewards could always be for the _next_ staking period, but this makes the logic a bit more complicated and allows users to try to game the system

## Simple example

This is an example where each line happens some time after the previous line:

- User1 stakes `100`
- User2 stakes `400`
- Staking period starts with `1000` rewards. Total stakes: `500`
- User3 stakes `200`. This is valid only for the next staking period
- Staking period ends
- User2 withdraws rewards: he gets `400/500 * 1000 = 800` rewards
- User2 unstakes his tokens
- Second staking period starts with `1500` rewards. Total stakes: `300`
- User3 withdraws rewards: he gets nothing, since the staking period is ongoing
- Second staking period ends
- User1 withdraws rewards: he gets `(100/500 * 1000) + (100/300 * 1500) = 200 + 500 = 700` rewards
- User3 withdraws rewards: he gets `(200/300 * 1500) = 1000` rewards

## Weighted example

This is an example which uses different weights for users (when a user locks his stake for a longer period):

- User1 stakes for a year and gets 50% bonus. He stakes `100`, but is given a weight of `150`
- User2 stakes `350` with no bonuses
- Staking period starts with `1000` rewards. Total (weighted) stakes: `500`
- Staking period ends
- User2 withdraws rewards: he gets `350/500 * 1000 = 700` rewards
- User1 withdraws rewards: he gets `150/500 * 1000 = 300` rewards

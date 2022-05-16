# Staking functionality for Pulse project

## Functionality

- Staking: user can insert stake whenever, for whatever amount. The staking asset is an ERC20 token. The stake is valid for the next staking period (and periods after that) and is locked for the chosen duration (amonut of staking periods)
- Withdraw rewards: user can withdraw accrued rewards whenever. No rewards are ever lost
- Withdraw unlocked stakes: user can withdraw tokens which are on longer staked (their lock has been released)
- Enter rewards: anyone can enter rewards, which are distributed for the stakers for the current staking period

TODO: Is some sort of admin functionality needed, for example to pause staking?

## Concepts

### Staking and staking periods

Before a staking period starts:

- Users can enter stakes for any amount of staking periods

During a staking period:

- Anyone can enter rewards for the ongoing staking period
- Users can enter stakes for the next staking period(s)

After a staking period has ended:

- Users can withdraw rewards for the ended staking period(s)

#### Staking and unstaking

User can enter stakes whenever, but they only count for the next starting staking period(s). When staking, the user has to choose the amount of staking periods he wants to lock the stake for: the longer he stakes for, the better weight he gets for his stake.

User always has only (at maximum) one stake which he can increase or decrease. The change takes effect only for the next staking period. Locked stakes can only be removed once the lock has been lifted.

Since all stakes are locked stakes, there is no explicit unstaking. Once a stake has been unlocked, its assets can be withdrawn. Unlocked stakes do not accumulate rewards.

### Starting and ending a staking period

Any user who interacts with the contract will trigger a staking period start and/or end, if such is needed based on the blockchain's timestamp.

In theory, this means that a staking period may not be explicitly closed at the right time, but it may continue until any user interacts with the contract. TODO: figure out if this causes problems somewhere

## Calculating rewards

When user enters a stake, the staking amount is added to the total staking amount of all of the chosen staking periods. When user chooses to withdraw rewards, his rewards are calculated based on all the previous staking periods in which he participated.

It is possible for users to gain bigger rewards for their stakes if they lock the stake for a longer period. In that case the weighted amount is added to the total stakes. Locked stakes can only be unstaked after the lock period has ended.

## Scalability

The contract scales almost perfectly: the amount of stakers has no influence on how much each user's operations cost (in gas).

The only minor scalability issue is that rewards and unlocked stakes need to be calculated for each past staking period: in theory user can have an unlimited amount of past staking periods for which his rewards need to be calculated when withdrawing rewards. In reality, if the staking period is 1 month, there are probably a maximum of a few dozes staking periods for any user, which isn't be an issue gas-wise.

## Possible issues

- The reward ratio for a staking period is known only once the period has ended, because the rewards for the staking period are accummulated in the contract only during the period. So, in theory, it's possible users get 0% rewards for a staking period if nobody enters rewards.
  - If this is an issue, the rewards could always be for the _next_ staking period, but this makes the logic a bit more complicated and allows users to try to game the system
- It is not possible to change the duration of the staking period since users are already committed for a certain amount of staking periods and expect the staking periods to be of certain length.
- This solution is not super elegant and it has quite many moving parts. This increases the complexity, and therefore possibility for bugs.

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

## Technical sketch

There exists the following general data:

- Precalculated list of staking period start and end times
- Total amount of (weighted) stakes for each staking period
- Total amonut of inputted rewards for each staking period
- Currently active staking period Id (the Ids are subsequent)

When user stakes, the following data is stored:

- For the next starting staking period, increase the total staking amount by the (possibly) weighted stake
- For each staking period when the stake is active, store the weighted stake per user
- For the first staking period when the stake is no longer active (it's unlocked), store information about how many tokens the user can withdraw (the stake amount). This is stored per-user, per staking period (a mapping between the tuple (user address, staking period) and token amount).
- Information is stored per-user about which is the first staking period (`userFirstUnstakedPeriodId`) when user has unstaked assets (so we don't have to loop all of the staking periods). If this value exists already, update it if needed.
- In a similar manner, set `userFirstRewardPeriodId` to be the user's first active staking period. If this value exists already, update it if needed.

When user withdraws unlocked stakes:

- Loop from the `userFirstUnstakedPeriodId` until the currently active staking period and send the user all of the available tokens. Update `userFirstUnstakedPeriodId`

When user withdraws rewards:

- Loop from `userFirstRewardPeriodId` until the currently active staking period, calculate possible rewards and send the rewards to the user. Update `userFirstRewardPeriodId`.

When anyone inserts rewards:

- Add the total amount of rewards for the ongoing staking period

When any user performs staking, withdrawing rewards, withdrawing unlocked tokens or inserting rewards:

- Check if the current staking period should be switched to a new one. Switch if needed. Perform this before any other action.

Other considerations:

- Possibly introduce a restriction on how many loop iterations can be performed, to prevent excessive gas requirements. This applies for reward calculations and unstaked token calculations. If the limit is reached, the user simply needs to call the function again to continue.

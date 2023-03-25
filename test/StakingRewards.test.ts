import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import {
  ERC20,
  IWETH,
  MockERC20,
  MockWETH,
  StakingRewards,
} from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

describe("StakingRewards", function () {
  let stakingContract: StakingRewards;
  let stakingToken: MockERC20;
  let rewardsToken: MockWETH;
  let deployer: SignerWithAddress;
  let rewardsDistributer: SignerWithAddress;
  let staker1: SignerWithAddress;
  let staker2: SignerWithAddress;
  let staker3: SignerWithAddress;

  const oneToken = ethers.utils.parseUnits("1", 18);
  const twoTokens = ethers.utils.parseUnits("2", 18);
  const twentyTokens = ethers.utils.parseUnits("20", 18);
  const thousandTokens = ethers.utils.parseUnits("1000", 18);

  async function deployStakingFixture() {
    // Contracts are deployed using the first signer/account by default
    const [_deployer, _rewardsDistributer, _user1, _user2, _user3] =
      await ethers.getSigners();

    const StakingFactory = await ethers.getContractFactory("StakingRewards");
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const WETHFactory = await ethers.getContractFactory("MockWETH");

    const _rewardsToken = await WETHFactory.connect(_deployer).deploy();
    const _stakingToken = await ERC20Factory.connect(_deployer).deploy();

    const _staking = await StakingFactory.connect(_deployer).deploy(
      _rewardsDistributer.address,
      _rewardsToken.address,
      _stakingToken.address
    );

    await _rewardsToken.deployed();
    await _stakingToken.deployed();
    await _staking.deployed();

    return {
      _deployer,
      _rewardsDistributer,
      _user1,
      _user2,
      _user3,
      _rewardsToken,
      _stakingToken,
      _staking,
    };
  }

  beforeEach(async function () {
    const {
      _deployer,
      _rewardsDistributer,
      _user1,
      _user2,
      _user3,
      _rewardsToken,
      _stakingToken,
      _staking,
    } = await loadFixture(deployStakingFixture);

    deployer = _deployer;
    rewardsDistributer = _rewardsDistributer;
    staker1 = _user1;
    staker2 = _user2;
    staker3 = _user3;
    rewardsToken = _rewardsToken;
    stakingToken = _stakingToken;
    stakingContract = _staking;
  });

  xdescribe("Deployment", async function () {
    it("Sets the right data", async function () {
      const setRewardsDistribution =
        await stakingContract.rewardsDistribution();
      const setStaking = await stakingContract.stakingToken();
      const setRewards = await stakingContract.rewardsToken();

      expect(setRewardsDistribution).to.equal(rewardsDistributer.address);
      expect(setStaking).to.equal(stakingToken.address);
      expect(setRewards).to.equal(rewardsToken.address);
    });
  });

  xdescribe("Notify rewards", async function () {
    const mintAmount = BigNumber.from(10).pow(18).mul(100);
    beforeEach(async function () {
      await rewardsToken.connect(rewardsDistributer).freeMint(mintAmount);
    });

    it("Works", async function () {
      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 1);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(1);

      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(stakingBalance).to.equal(1);
    });

    it("Works for subsequent calls", async function () {
      const balanceBefore = await rewardsToken.balanceOf(
        stakingContract.address
      );

      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 1);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(1);

      const balanceMiddle = await rewardsToken.balanceOf(
        stakingContract.address
      );

      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 2);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(2);

      const balanceAfter = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(balanceBefore).to.equal(0);
      expect(balanceMiddle).to.equal(1);
      expect(balanceAfter).to.equal(3);
    });

    it("Sets timestamp", async function () {
      const periodFinishBefore = await stakingContract.periodFinish();

      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 1);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(1);

      const periodFinishAfter = await stakingContract.periodFinish();

      expect(periodFinishBefore).to.below(periodFinishAfter);
    });

    it("Updates timestamp for subsequent calls", async function () {
      const periodFinishBefore = await stakingContract.periodFinish();

      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 1);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(1);

      const periodFinishMiddle = await stakingContract.periodFinish();

      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 2);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(2);

      const periodFinishAfter = await stakingContract.periodFinish();

      expect(periodFinishBefore).to.below(periodFinishMiddle);
      expect(periodFinishMiddle).to.below(periodFinishAfter);
    });

    it("Possibly to only notify part of the token balance", async function () {
      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, mintAmount);
      await stakingContract
        .connect(rewardsDistributer)
        .notifyRewardAmount(mintAmount.div(2));

      const rewardsDuration = await stakingContract.rewardsDuration();
      const rewardRate = await stakingContract.rewardRate();

      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );

      const expectedRate = mintAmount.div(2).div(rewardsDuration);

      expect(stakingBalance).to.equal(mintAmount);
      expect(expectedRate).to.equal(rewardRate);
    });

    it("Empty reward updates the timestamp", async function () {
      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 0);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(0);

      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );
      const periodFinish = await stakingContract.periodFinish();

      expect(stakingBalance).to.equal(0);
      expect(periodFinish).to.above(0);
    });

    it("Fails if called by anyone but the reward distributor", async function () {
      await expect(
        stakingContract.connect(staker1).notifyRewardAmount(1)
      ).to.be.revertedWith("Caller is not RewardsDistribution contract");
    });
  });

  describe("Staking", async function () {
    // Solidity calculations are not exact, so we have to allow some error tolerance when calculating rewards.
    // The tolerance is negligible compared to the amounts: the error tolerance we use is around 0,000000000001%.
    const errorTolerance = twoTokens.div(10_000_000_000_000);
    beforeEach(async function () {
      const amount = thousandTokens;

      const prepareTokens = async (user: SignerWithAddress) => {
        await stakingToken.connect(user).freeMint(amount);
        await stakingToken
          .connect(user)
          .approve(stakingContract.address, amount);
      };
      await prepareTokens(staker1);
      await prepareTokens(staker2);
      await prepareTokens(staker3);

      await rewardsToken.connect(rewardsDistributer).freeMint(amount);
    });
    describe("One staker", async function () {
      it("Sets the right data", async function () {
        await stakingContract.connect(staker1).stake(oneToken);

        const totalSupply = await stakingContract.totalSupply();
        const tokenBalance = await stakingContract.balanceOf(staker1.address);
        const earned = await stakingContract.earned(staker1.address);
        const balance = await stakingToken.balanceOf(stakingContract.address);

        expect(totalSupply).to.equal(oneToken);
        expect(tokenBalance).to.equal(oneToken);
        expect(earned).to.equal(0);
        expect(balance).to.equal(oneToken);
      });

      it("Staking without rewards gives nothing", async function () {
        await stakingContract.connect(staker1).stake(oneToken);

        await timeTravelDays(4);

        const earned = await stakingContract.earned(staker1.address);

        expect(earned).to.equal(0);
      });

      it("Staking alone gives all rewards", async function () {
        await stakingContract.connect(staker1).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(7);

        const earned = await stakingContract.earned(staker1.address);

        expect(earned).to.be.approximately(twoTokens, errorTolerance);
        // 19999999999 9 9 814400
        // 20000000000 0 0 000000
        //      200000 10000000000000
      });

      it("Can withdraw stake", async function () {
        const balanceBefore = await stakingToken.balanceOf(staker1.address);
        await stakingContract.connect(staker1).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(7);

        await stakingContract.connect(staker1).withdraw(oneToken);

        const balanceAfter = await stakingToken.balanceOf(staker1.address);

        const earned = await stakingContract.earned(staker1.address);

        expect(earned).to.be.approximately(twoTokens, errorTolerance);
        expect(balanceBefore).to.equal(balanceAfter);
      });

      it("Can withdraw rewards", async function () {
        const balanceBefore = await rewardsToken.balanceOf(staker1.address);
        await stakingContract.connect(staker1).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(7);

        const earned = await stakingContract.earned(staker1.address);

        await stakingContract.connect(staker1).getReward();

        const balanceAfter = await rewardsToken.balanceOf(staker1.address);

        expect(earned).to.be.approximately(twoTokens, errorTolerance);
        expect(balanceAfter.sub(balanceBefore)).to.equal(earned);
      });

      it("Rewards don't disappear after staking period", async function () {
        await stakingContract.connect(staker1).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(70);

        const earned = await stakingContract.earned(staker1.address);

        expect(earned).to.be.approximately(twoTokens, errorTolerance);
      });

      it("Rewards don't disappear even when not participating", async function () {
        await stakingContract.connect(staker1).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(10);

        // unstake all
        await stakingContract.connect(staker1).withdraw(oneToken);

        // Start a new staking period where staker1 is not partipating
        await sendRewards(twoTokens);
        await stakingContract.connect(staker2).stake(oneToken);
        await timeTravelDays(10);

        const earned = await stakingContract.earned(staker1.address);

        expect(earned).to.be.approximately(twoTokens, errorTolerance);
      });

      it("Same stake is valid for multiple staking periods", async function () {
        await stakingContract.connect(staker1).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(10);

        await sendRewards(twoTokens);
        await timeTravelDays(10);

        const earned = await stakingContract.earned(staker1.address);

        expect(earned).to.be.approximately(
          twoTokens.mul(2),
          errorTolerance.mul(2)
        );
      });

      it("Not ending the reward period give correct rewards", async function () {
        await stakingContract.connect(staker1).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(4);

        await sendRewards(twoTokens);
        await timeTravelDays(5);

        await sendRewards(twoTokens);
        await timeTravelDays(6);

        await sendRewards(twoTokens);
        await timeTravelDays(4);

        await sendRewards(twoTokens);
        await timeTravelDays(7); // end the staking period

        const earned = await stakingContract.earned(staker1.address);

        expect(earned).to.be.approximately(
          twoTokens.mul(5),
          errorTolerance.mul(15) // more calculations requires more tolerance
        );
      });
    });

    describe("Multiple stakers", async function () {
      it("Equal two stakes divides rewards", async function () {
        await stakingContract.connect(staker1).stake(oneToken);
        await stakingContract.connect(staker2).stake(oneToken);

        await sendRewards(twoTokens);
        await timeTravelDays(7);

        const earned1 = await stakingContract.earned(staker1.address);
        const earned2 = await stakingContract.earned(staker2.address);

        expect(earned1).to.be.approximately(
          twoTokens.div(2),
          errorTolerance.div(2)
        );
        expect(earned2).to.equal(earned1);
      });
    });
  });

  // Useful for debugging tests
  const printall = async (user: SignerWithAddress) => {
    const totalSupply = await stakingContract.totalSupply();
    const tokenBalance = await stakingContract.balanceOf(user.address);
    const earned = await stakingContract.earned(user.address);
    const periodFinish = await stakingContract.periodFinish();
    const rewardRate = await stakingContract.rewardRate();
    const rewardPerTokenStored = await stakingContract.rewardPerTokenStored();
    const rewards = await stakingContract.rewards(user.address);

    console.log(`Supply: ${totalSupply.toString()}, Token balance: ${tokenBalance.toString()}, Earned: ${earned.toString()},
PeriodFinish: ${periodFinish.toString()}, RewardRate: ${rewardRate.toString()}, 
TokenStored: ${rewardPerTokenStored.toString()}, Rewards: ${rewards.toString()}`);
  };

  const sendRewards = async (amount: BigNumber) => {
    await rewardsToken
      .connect(rewardsDistributer)
      .transfer(stakingContract.address, amount);
    await stakingContract
      .connect(rewardsDistributer)
      .notifyRewardAmount(amount);
  };

  const timeTravelDays = async (days: number) => {
    const seconds = 24 * 60 * 60 * days;
    await time.increase(seconds);
  };
});

import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
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
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

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
    user1 = _user1;
    user2 = _user2;
    user3 = _user3;
    rewardsToken = _rewardsToken;
    stakingToken = _stakingToken;
    stakingContract = _staking;
  });

  describe("Deployment", async function () {
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

  describe("Notify rewards", async function () {
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

      expect(stakingBalance).to.be.equal(1);
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

      expect(balanceBefore).to.be.equal(0);
      expect(balanceMiddle).to.be.equal(1);
      expect(balanceAfter).to.be.equal(3);
    });

    it("Sets timestamp", async function () {
      const periodFinishBefore = await stakingContract.periodFinish();

      await rewardsToken
        .connect(rewardsDistributer)
        .transfer(stakingContract.address, 1);
      await stakingContract.connect(rewardsDistributer).notifyRewardAmount(1);

      const periodFinishAfter = await stakingContract.periodFinish();

      expect(periodFinishBefore).to.be.lessThan(periodFinishAfter);
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

      expect(periodFinishBefore).to.be.lessThan(periodFinishMiddle);
      expect(periodFinishMiddle).to.be.lessThan(periodFinishAfter);
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

      expect(stakingBalance).to.be.equal(mintAmount);
      expect(expectedRate).to.be.equal(rewardRate);
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

      expect(stakingBalance).to.be.equal(0);
      expect(periodFinish).to.be.greaterThan(0);
    });

    it("Fails if called by anyone but the converter", async function () {
      await expect(
        stakingContract.connect(user1).notifyRewardAmount(1)
      ).to.be.revertedWith("Caller is not RewardsDistribution contract");
    });
  });
});

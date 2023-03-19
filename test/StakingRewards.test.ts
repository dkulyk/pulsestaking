import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  Converter,
  ERC20,
  IWETH,
  MockERC20,
  MockWETH,
  StakingRewards,
} from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("StakingRewards", function () {
  let stakingContract: StakingRewards;
  let stakingToken: MockERC20;
  let rewardsToken: MockWETH;
  let converterContract: Converter;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  async function deployStakingFixture() {
    // Contracts are deployed using the first signer/account by default
    const [_deployer, _user1, _user2, _user3] = await ethers.getSigners();

    const StakingFactory = await ethers.getContractFactory("StakingRewards");
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const WETHFactory = await ethers.getContractFactory("MockWETH");
    const ConverterFactory = await ethers.getContractFactory("Converter");

    const _rewardsToken = await WETHFactory.connect(_deployer).deploy();
    const _stakingToken = await ERC20Factory.connect(_deployer).deploy();

    const _converter = await ConverterFactory.connect(_deployer).deploy(
      _rewardsToken.address
    );

    const _staking = await StakingFactory.connect(_deployer).deploy(
      _converter.address,
      _rewardsToken.address,
      _stakingToken.address
    );

    await _converter.setStakingContract(_staking.address);

    await _rewardsToken.deployed();
    await _stakingToken.deployed();
    await _staking.deployed();
    await _converter.deployed();

    return {
      _deployer,
      _user1,
      _user2,
      _user3,
      _rewardsToken,
      _stakingToken,
      _staking,
      _converter,
    };
  }

  beforeEach(async function () {
    const {
      _deployer,
      _user1,
      _user2,
      _user3,
      _rewardsToken,
      _stakingToken,
      _staking,
      _converter,
    } = await loadFixture(deployStakingFixture);

    deployer = _deployer;
    user1 = _user1;
    user2 = _user2;
    user3 = _user3;
    rewardsToken = _rewardsToken;
    stakingToken = _stakingToken;
    stakingContract = _staking;
    converterContract = _converter;
  });

  describe("Deployment", async function () {
    it("Sets the right data", async function () {
      const setRewardsDistribution =
        await stakingContract.rewardsDistribution();
      const setStaking = await stakingContract.stakingToken();
      const setRewards = await stakingContract.rewardsToken();

      expect(setRewardsDistribution).to.equal(converterContract.address);
      expect(setStaking).to.equal(stakingToken.address);
      expect(setRewards).to.equal(rewardsToken.address);
    });
  });

  describe("Notify rewards through converter flush", async function () {
    it("Works", async function () {
      await converterContract.deposit({ value: 1 });
      await converterContract.flush();

      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(stakingBalance).to.be.equal(1);
    });

    it("Works for subsequent calls", async function () {
      const balanceBefore = await rewardsToken.balanceOf(
        stakingContract.address
      );

      await converterContract.deposit({ value: 1 });
      await converterContract.flush();

      const balanceMiddle = await rewardsToken.balanceOf(
        stakingContract.address
      );

      await converterContract.deposit({ value: 2 });
      await converterContract.flush();

      const balanceAfter = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(balanceBefore).to.be.equal(0);
      expect(balanceMiddle).to.be.equal(1);
      expect(balanceAfter).to.be.equal(3);
    });

    it("Sets timestamp", async function () {
      const periodFinishBefore = await stakingContract.periodFinish();

      await converterContract.deposit({ value: 1 });
      await converterContract.flush();

      const periodFinishAfter = await stakingContract.periodFinish();

      expect(periodFinishBefore).to.be.lessThan(periodFinishAfter);
    });

    it("Updates timestamp for subsequent calls", async function () {
      const periodFinishBefore = await stakingContract.periodFinish();

      await converterContract.deposit({ value: 1 });
      await converterContract.flush();

      const periodFinishMiddle = await stakingContract.periodFinish();

      await converterContract.deposit({ value: 2 });
      await converterContract.flush();

      const periodFinishAfter = await stakingContract.periodFinish();

      expect(periodFinishBefore).to.be.lessThan(periodFinishMiddle);
      expect(periodFinishMiddle).to.be.lessThan(periodFinishAfter);
    });

    it("Empty reward updates the timestamp", async function () {
      await converterContract.flush();
      await converterContract.flush();

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

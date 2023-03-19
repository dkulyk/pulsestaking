import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Converter, IWETH, MockWETH, StakingRewards } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Converter", function () {
  let stakingContract: StakingRewards;
  let rewardsToken: MockWETH;
  let converterContract: Converter;
  let deployer: SignerWithAddress;
  let user1: SignerWithAddress;

  async function deployConverterFixture() {
    // Contracts are deployed using the first signer/account by default
    const [_deployer, _user1] = await ethers.getSigners();

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

    await _rewardsToken.deployed();
    await _stakingToken.deployed();
    await _staking.deployed();
    await _converter.deployed();

    return {
      _deployer,
      _user1,
      _rewardsToken,
      _staking,
      _converter,
    };
  }

  beforeEach(async function () {
    const { _deployer, _user1, _rewardsToken, _staking, _converter } =
      await loadFixture(deployConverterFixture);

    deployer = _deployer;
    user1 = _user1;
    rewardsToken = _rewardsToken;
    stakingContract = _staking;
    converterContract = _converter;
  });

  describe("Deployment", async function () {
    it("Sets the right data", async function () {
      const setStaking = await converterContract.staking();
      const setRewards = await converterContract.rewardsToken();

      expect(setStaking).to.equal(ethers.constants.AddressZero);
      expect(setRewards).to.equal(rewardsToken.address);
    });

    it("Fails for zero token address", async function () {
      const ConverterFactory = await ethers.getContractFactory("Converter");
      await expect(
        ConverterFactory.connect(deployer).deploy(ethers.constants.AddressZero)
      ).to.be.revertedWith("Invalid token");
    });
  });

  describe("Setting staking contract", async function () {
    it("Works", async function () {
      await converterContract.setStakingContract(stakingContract.address);

      const setStaking = await converterContract.staking();

      expect(setStaking).to.equal(stakingContract.address);
    });

    it("Is callable by anyone", async function () {
      await converterContract
        .connect(user1)
        .setStakingContract(stakingContract.address);

      const setStaking = await converterContract.staking();

      expect(setStaking).to.equal(stakingContract.address);
    });

    it("Doesn't do anything for zero address and can be reset", async function () {
      await converterContract.setStakingContract(ethers.constants.AddressZero);

      const setStakingBefore = await converterContract.staking();

      await converterContract.setStakingContract(stakingContract.address);

      const setStakingAfter = await converterContract.staking();

      expect(setStakingBefore).to.equal(ethers.constants.AddressZero);
      expect(setStakingAfter).to.equal(stakingContract.address);
    });

    it("Works for arbitrary address", async function () {
      await converterContract.setStakingContract(user1.address);

      const setStaking = await converterContract.staking();

      expect(setStaking).to.equal(user1.address);
    });

    it("Fails if trying to reset", async function () {
      await converterContract.setStakingContract(stakingContract.address);
      await expect(
        converterContract.setStakingContract(deployer.address)
      ).to.be.revertedWith("Already set");
      await expect(
        converterContract.setStakingContract(stakingContract.address)
      ).to.be.revertedWith("Already set");
    });
  });

  describe("Deposit", async function () {
    beforeEach(async function () {
      await converterContract.setStakingContract(stakingContract.address);
    });

    it("Works", async function () {
      await converterContract.deposit({ value: 1 });

      const nativeBalance = await ethers.provider.getBalance(
        converterContract.address
      );
      const rewardBalance = await rewardsToken.balanceOf(
        converterContract.address
      );

      expect(nativeBalance).to.be.equal(0);
      expect(rewardBalance).to.be.equal(1);
    });

    it("Is callable by anyone", async function () {
      await converterContract.connect(user1).deposit({ value: 1 });
    });

    it("Zero deposit does nothing", async function () {
      await converterContract.deposit({ value: 0 });

      const nativeBalance = await ethers.provider.getBalance(
        converterContract.address
      );
      const rewardBalance = await rewardsToken.balanceOf(
        converterContract.address
      );

      expect(nativeBalance).to.be.equal(0);
      expect(rewardBalance).to.be.equal(0);
    });

    it("Works for subsequent deposits", async function () {
      await converterContract.deposit({ value: 1 });
      await converterContract.deposit({ value: 10 });

      const nativeBalance = await ethers.provider.getBalance(
        converterContract.address
      );
      const rewardBalance = await rewardsToken.balanceOf(
        converterContract.address
      );

      expect(nativeBalance).to.be.equal(0);
      expect(rewardBalance).to.be.equal(11);
    });
  });

  describe("Receive", async function () {
    beforeEach(async function () {
      await converterContract.setStakingContract(stakingContract.address);
    });

    it("Works", async function () {
      await deployer.sendTransaction({
        to: converterContract.address,
        value: 1,
        gasLimit: 100000,
      });

      const nativeBalance = await ethers.provider.getBalance(
        converterContract.address
      );
      const rewardBalance = await rewardsToken.balanceOf(
        converterContract.address
      );

      expect(nativeBalance).to.be.equal(0);
      expect(rewardBalance).to.be.equal(1);
    });

    it("Is callable by anyone", async function () {
      await user1.sendTransaction({
        to: converterContract.address,
        value: 1,
        gasLimit: 100000,
      });
    });

    it("Zero deposit does nothing", async function () {
      await deployer.sendTransaction({
        to: converterContract.address,
        value: 0,
        gasLimit: 100000,
      });

      const nativeBalance = await ethers.provider.getBalance(
        converterContract.address
      );
      const rewardBalance = await rewardsToken.balanceOf(
        converterContract.address
      );

      expect(nativeBalance).to.be.equal(0);
      expect(rewardBalance).to.be.equal(0);
    });

    it("Works for subsequent deposits", async function () {
      await deployer.sendTransaction({
        to: converterContract.address,
        value: 1,
        gasLimit: 100000,
      });
      await deployer.sendTransaction({
        to: converterContract.address,
        value: 10,
        gasLimit: 100000,
      });

      const nativeBalance = await ethers.provider.getBalance(
        converterContract.address
      );
      const rewardBalance = await rewardsToken.balanceOf(
        converterContract.address
      );

      expect(nativeBalance).to.be.equal(0);
      expect(rewardBalance).to.be.equal(11);
    });
  });

  describe("Flush", async function () {
    beforeEach(async function () {
      await converterContract.setStakingContract(stakingContract.address);
    });

    it("Works", async function () {
      await converterContract.deposit({ value: 1 });
      await converterContract.flush();

      const converterBalance = await rewardsToken.balanceOf(
        converterContract.address
      );
      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(converterBalance).to.be.equal(0);
      expect(stakingBalance).to.be.equal(1);
    });

    it("Is callable by anyone", async function () {
      await converterContract.connect(user1).flush();
    });

    it("Flushes everything", async function () {
      await converterContract.deposit({ value: 1 });
      await converterContract.deposit({ value: 2 });
      await converterContract.flush();

      const converterBalance = await rewardsToken.balanceOf(
        converterContract.address
      );
      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(converterBalance).to.be.equal(0);
      expect(stakingBalance).to.be.equal(3);
    });

    it("Works for subsequent flushes", async function () {
      await converterContract.deposit({ value: 1 });
      await converterContract.flush();

      await converterContract.deposit({ value: 2 });
      await converterContract.flush();

      const converterBalance = await rewardsToken.balanceOf(
        converterContract.address
      );
      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(converterBalance).to.be.equal(0);
      expect(stakingBalance).to.be.equal(3);
    });

    it("Notifies about rewards", async function () {
      const periodFinishBefore = await stakingContract.periodFinish();

      await converterContract.deposit({ value: 1 });
      await converterContract.flush();

      const periodFinishAfter = await stakingContract.periodFinish();

      expect(periodFinishBefore).to.be.lessThan(periodFinishAfter);
    });

    it("Notifies about rewards for subsequent flushes", async function () {
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

    it("Empty flush doesn't do anything", async function () {
      await converterContract.flush();
      await converterContract.flush();

      const converterBalance = await rewardsToken.balanceOf(
        converterContract.address
      );
      const stakingBalance = await rewardsToken.balanceOf(
        stakingContract.address
      );

      expect(converterBalance).to.be.equal(0);
      expect(stakingBalance).to.be.equal(0);
    });
  });

  describe("Flush without staking set", async function () {
    it("Fails", async function () {
      await converterContract.deposit({ value: 1 });
      await expect(converterContract.flush()).to.be.revertedWith(
        "No staking set"
      );
    });
  });
});

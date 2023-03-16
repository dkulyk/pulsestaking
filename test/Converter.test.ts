import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Converter, ERC20, IWETH, StakingRewards } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

describe("Voting", function () {
  let stakingContract: StakingRewards;
  let stakingToken: ERC20;
  let rewardsToken: IWETH;
  let converterContract: Converter;
  let deployer: SignerWithAddress;

  async function deployConverterFixture() {
    // Contracts are deployed using the first signer/account by default
    const [_deployer] = await ethers.getSigners();

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

    return { _deployer, _rewardsToken, _stakingToken, _staking, _converter };
  }

  beforeEach(async function () {
    const { _deployer, _rewardsToken, _stakingToken, _staking, _converter } =
      await loadFixture(deployConverterFixture);

    deployer = _deployer;
    rewardsToken = _rewardsToken;
    stakingToken = _stakingToken;
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
  });

  describe("Setting staking contract", async function () {
    it("Works", async function () {
      await converterContract.setStakingContract(stakingContract.address);

      const setStaking = await converterContract.staking();

      expect(setStaking).to.equal(stakingContract.address);
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
});

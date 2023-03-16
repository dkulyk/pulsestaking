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

    await _converter.setStakingContract(_staking.address);

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

      expect(setStaking).to.equal(stakingContract.address);
      expect(setRewards).to.equal(rewardsToken.address);
      /*       expect(await votingContract.isVoter(voter1.address)).to.true;
      expect(await votingContract.isVoter(voter2.address)).to.true;
      expect(await votingContract.isVoter(voter3.address)).to.true; */
    });
  });
});

import { ethers, network } from "hardhat";
import hre from "hardhat";
import * as fs from "fs";
import {
  Converter,
  IWETH,
  MockERC20,
  MockERC20__factory,
  MockWETH,
  StakingRewards,
} from "../typechain-types";

const addressFile = "contract_addresses.md";

const verify = async (addr: string, args: any[]) => {
  try {
    await hre.run("verify:verify", {
      address: addr,
      constructorArguments: args,
    });
  } catch (ex: any) {
    if (ex.toString().indexOf("Already Verified") == -1) {
      throw ex;
    }
  }
};

async function main() {
  console.log("Starting deployments");
  const accounts = await hre.ethers.getSigners();

  const deployer = accounts[0];

  if (!deployer) {
    throw "Invalid config";
  }

  const StakingFactory = await ethers.getContractFactory("StakingRewards");
  const ERC20Factory = await ethers.getContractFactory("MockERC20");
  const WETHFactory = await ethers.getContractFactory("MockWETH");
  const ConverterFactory = await ethers.getContractFactory("Converter");
  let _rewardsToken: IWETH,
    _stakingToken: MockERC20,
    _staking: StakingRewards,
    _converter: Converter;

  if (network.name == "mainnet") {
    // Only deploy staking + converter when deploying to mainnet
    // TODO: fill in the addresses
    const REWARDS_TOKEN_ADDRESS: string = "";
    const STAKING_TOKEN_ADDRESS: string = "";

    if (
      !REWARDS_TOKEN_ADDRESS ||
      REWARDS_TOKEN_ADDRESS.length == 0 ||
      !STAKING_TOKEN_ADDRESS ||
      STAKING_TOKEN_ADDRESS.length == 0
    ) {
      throw "Incorrect configuration";
    }

    _rewardsToken = await WETHFactory.attach(REWARDS_TOKEN_ADDRESS);
    _stakingToken = await ERC20Factory.attach(STAKING_TOKEN_ADDRESS);

    _converter = await ConverterFactory.connect(deployer).deploy(
      _rewardsToken.address
    );

    _staking = await StakingFactory.connect(deployer).deploy(
      _converter.address,
      _rewardsToken.address,
      _stakingToken.address
    );

    await _staking.deployed();
    await _converter.deployed();

    _converter.setStakingContract(_staking.address);
  } else {
    // When deploying anywhere else, deploy everything

    _rewardsToken = await WETHFactory.connect(deployer).deploy();
    _stakingToken = await ERC20Factory.connect(deployer).deploy();

    _converter = await ConverterFactory.connect(deployer).deploy(
      _rewardsToken.address
    );

    _staking = await StakingFactory.connect(deployer).deploy(
      _converter.address,
      _rewardsToken.address,
      _stakingToken.address
    );

    await _rewardsToken.deployed();
    await _stakingToken.deployed();
    await _staking.deployed();
    await _converter.deployed();

    _converter.setStakingContract(_staking.address);
  }

  if (network.name != "localhost" && network.name != "hardhat") {
    console.log("Deployments done, waiting for etherscan verifications");
    // Wait for the contracts to be propagated inside Etherscan
    await new Promise((f) => setTimeout(f, 60000));

    await verify(_staking.address, [
      _converter.address,
      _rewardsToken.address,
      _stakingToken.address,
    ]);

    await verify(_rewardsToken.address, []);
    await verify(_stakingToken.address, []);
    await verify(_converter.address, [_rewardsToken.address]);

    if (fs.existsSync(addressFile)) {
      fs.rmSync(addressFile);
    }

    fs.appendFileSync(
      addressFile,
      "This file contains the latest test deployment addresses in the Sepolia network<br/>"
    );

    const writeAddr = (addr: string, name: string) => {
      fs.appendFileSync(
        addressFile,
        `${name}: [https://sepolia.etherscan.io/address/${addr}](https://sepolia.etherscan.io/address/${addr})<br/>`
      );
    };

    writeAddr(_staking.address, "Staking contract");
    writeAddr(_rewardsToken.address, "Rewards token");
    writeAddr(_stakingToken.address, "Staking token");
    writeAddr(_converter.address, "Converter contract");
  }

  console.log("Deployments done");
  console.log(
    `Staking contract: ${_staking.address}, Staking token: ${_stakingToken.address}, 
    Rewards token: ${_rewardsToken.address}, Converter token: ${_converter.address}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

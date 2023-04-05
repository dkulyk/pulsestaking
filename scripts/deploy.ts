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

// TODO: fill in the addresses when deploying to mainnet
const REWARDS_TOKEN_ADDRESS_MAINNET: string =
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; //WETH in eth mainnet
const STAKING_TOKEN_ADDRESS_MAINNET: string =
  "0x6B175474E89094C44Da98b954EedeAC495271d0F"; // DAI in eth mainnet
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

  const forking = !!process.env.forking;

  if (network.name == "mainnet" || forking) {
    // Only deploy staking + converter when deploying to mainnet

    console.log("Using preset addresses");

    if (
      !REWARDS_TOKEN_ADDRESS_MAINNET ||
      REWARDS_TOKEN_ADDRESS_MAINNET.length == 0 ||
      !STAKING_TOKEN_ADDRESS_MAINNET ||
      STAKING_TOKEN_ADDRESS_MAINNET.length == 0
    ) {
      throw "Incorrect configuration";
    }

    _rewardsToken = await WETHFactory.attach(REWARDS_TOKEN_ADDRESS_MAINNET);
    _stakingToken = await ERC20Factory.attach(STAKING_TOKEN_ADDRESS_MAINNET);

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

    console.log("Deploying all contracts");

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

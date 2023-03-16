import { ethers, network } from "hardhat";
import hre from "hardhat";
import * as fs from "fs";

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

  const rewardsDistributor = deployer.address;

  const _rewardsToken = await WETHFactory.connect(deployer).deploy();
  const _stakingToken = await ERC20Factory.connect(deployer).deploy();

  const _staking = await StakingFactory.connect(deployer).deploy(
    rewardsDistributor,
    _rewardsToken.address,
    _stakingToken.address
  );

  const _converter = await ConverterFactory.connect(deployer).deploy(
    _staking.address,
    _rewardsToken.address
  );

  await _rewardsToken.deployed();
  await _stakingToken.deployed();
  await _staking.deployed();
  await _converter.deployed();

  if (network.name != "localhost" && network.name != "hardhat") {
    console.log("Deployments done, waiting for etherscan verifications");
    // Wait for the contracts to be propagated inside Etherscan
    await new Promise((f) => setTimeout(f, 60000));

    await verify(_staking.address, [
      rewardsDistributor,
      _rewardsToken.address,
      _stakingToken.address,
    ]);

    await verify(_rewardsToken.address, []);
    await verify(_stakingToken.address, []);
    await verify(_converter.address, [_staking.address, _rewardsToken.address]);

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

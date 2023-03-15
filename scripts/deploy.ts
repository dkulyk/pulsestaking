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

  const rewardsDistributor = deployer.address;
  const rewardsToken = deployer.address;
  const stakingToken = deployer.address;

  const _staking = await StakingFactory.connect(deployer).deploy(rewardsDistributor, rewardsToken, stakingToken);
  await _staking.deployed();

  if (network.name != "localhost" && network.name != "hardhat") {
    console.log("Deployments done, waiting for etherscan verifications");
    // Wait for the contracts to be propagated inside Etherscan
    await new Promise((f) => setTimeout(f, 60000));

    await verify(_staking.address, [rewardsDistributor, rewardsToken, stakingToken]);

   /*  await verify(_wallet.address, []);
    await verify(_manager.address, [xenAddress, _wallet.address, feeReceiver]); */

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

/*     writeAddr(_manager.address, "Wallet manager");
    writeAddr(xenAddress, "XENCrypto");
    writeAddr(_wallet.address, "Initial wallet");
    writeAddr(_xelToken, "XEL token");
    writeAddr(_math.address, "Math library"); */
  }

  console.log("Deployments done");
  console.log(`Staking contract: ${_staking.address}, Staking token: ${stakingToken}, Rewards token: ${rewardsToken}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


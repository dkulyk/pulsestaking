import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import "@nomiclabs/hardhat-etherscan";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
      gasPrice: 0,
      initialBaseFeePerGas: 0,
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_PROVIDER_URL,
      accounts: [process.env.SEPOLIA_PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;

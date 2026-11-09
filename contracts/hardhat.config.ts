import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const HEDERA_TESTNET_RPC =
  process.env.HEDERA_TESTNET_RPC_URL || "https://testnet.hashio.io/api";

const accounts: string[] = process.env.HEDERA_OPERATOR_PRIVATE_KEY
  ? [process.env.HEDERA_OPERATOR_PRIVATE_KEY]
  : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    hedera_testnet: {
      url: HEDERA_TESTNET_RPC,
      chainId: 296,
      accounts: accounts.length > 0 ? accounts : undefined,
      timeout: 90000,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;

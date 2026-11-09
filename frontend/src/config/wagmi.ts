/**
 * ChainPlay - Wagmi v2 & RainbowKit Web3 Client Configuration
 *
 * Configures Wagmi v2 with RainbowKit connectors, SSR support,
 * multi-chain routing (Sepolia, Arbitrum Sepolia, Hardhat local),
 * and persistent cookie storage.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, cookieStorage, createStorage } from "wagmi";
import { sepolia, arbitrumSepolia, hardhat } from "wagmi/chains";
import type { Chain } from "viem";
import { CHAIN_IDS } from "./constants";

/**
 * Custom Hardhat chain definition (EVM Chain ID 31337).
 */
export const hardhatChain = {
  ...hardhat,
  id: CHAIN_IDS.HARDHAT,
  name: "Hardhat Local",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_HARDHAT_RPC_URL || "http://127.0.0.1:8545",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_HARDHAT_RPC_URL || "http://127.0.0.1:8545",
      ],
    },
  },
} as const satisfies Chain;

/**
 * Hedera Testnet definition (EVM Chain ID 296).
 */
export const hederaTestnetChain = {
  id: CHAIN_IDS.HEDERA_TESTNET,
  name: "Hedera Testnet",
  nativeCurrency: {
    name: "Hedera",
    symbol: "HBAR",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api",
      ],
    },
    public: {
      http: [
        process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "HashScan",
      url: "https://hashscan.io/testnet",
    },
  },
  testnet: true,
} as const satisfies Chain;

/**
 * All supported EVM networks for ChainPlay.
 */
export const supportedChains = [
  hederaTestnetChain,
  sepolia,
  arbitrumSepolia,
  hardhatChain,
] as const;

/**
 * Project ID for WalletConnect (v2).
 */
export const WALLET_CONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "chainplay-web3-arcade";

/**
 * Wagmi v2 configuration initialized via RainbowKit getDefaultConfig.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "ChainPlay - Web3 Arcade",
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: supportedChains,
  transports: {
    [hederaTestnetChain.id]: http(
      process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api"
    ),
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [hardhatChain.id]: http(
      process.env.NEXT_PUBLIC_HARDHAT_RPC_URL || "http://127.0.0.1:8545"
    ),
  },
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export default wagmiConfig;

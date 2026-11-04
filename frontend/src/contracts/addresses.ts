/**
 * ChainPlay - Multi-Chain Smart Contract Address Registry
 * Maps supported networks to their deployed contract addresses with fallback to zeroAddress.
 */

import { CHAIN_IDS, ZERO_ADDRESS } from "@/config/constants";

export interface ContractAddresses {
  gameManager: `0x${string}`;
  ticTacToe: `0x${string}`;
  battleship: `0x${string}`;
  memoryDuel: `0x${string}`;
  rewardManager: `0x${string}`;
}

export const FALLBACK_ADDRESSES: ContractAddresses = {
  gameManager: ZERO_ADDRESS,
  ticTacToe: ZERO_ADDRESS,
  battleship: ZERO_ADDRESS,
  memoryDuel: ZERO_ADDRESS,
  rewardManager: ZERO_ADDRESS,
} as const;

/**
 * Address lookup table per chain ID.
 * Defaults to ZERO_ADDRESS when contracts are not yet deployed or in local mock mode.
 */
export const CONTRACT_ADDRESSES: Record<number, ContractAddresses> = {
  // Sepolia Testnet (11155111)
  [CHAIN_IDS.SEPOLIA]: {
    gameManager:
      (process.env.NEXT_PUBLIC_SEPOLIA_GAME_MANAGER as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_GAME_MANAGER_ADDRESS as `0x${string}`) ||
      ZERO_ADDRESS,
    ticTacToe:
      (process.env.NEXT_PUBLIC_SEPOLIA_TICTACTOE as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_TICTACTOE_ADDRESS as `0x${string}`) ||
      ZERO_ADDRESS,
    battleship:
      (process.env.NEXT_PUBLIC_SEPOLIA_BATTLESHIP as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_BATTLESHIP_ADDRESS as `0x${string}`) ||
      ZERO_ADDRESS,
    memoryDuel:
      (process.env.NEXT_PUBLIC_SEPOLIA_MEMORY_DUEL as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_MEMORY_DUEL_ADDRESS as `0x${string}`) ||
      ZERO_ADDRESS,
    rewardManager:
      (process.env.NEXT_PUBLIC_SEPOLIA_REWARD_MANAGER as `0x${string}`) ||
      (process.env.NEXT_PUBLIC_REWARD_MANAGER_ADDRESS as `0x${string}`) ||
      ZERO_ADDRESS,
  },

  // Arbitrum Sepolia Testnet (421614)
  [CHAIN_IDS.ARBITRUM_SEPOLIA]: {
    gameManager:
      (process.env.NEXT_PUBLIC_ARB_SEPOLIA_GAME_MANAGER as `0x${string}`) ||
      ZERO_ADDRESS,
    ticTacToe:
      (process.env.NEXT_PUBLIC_ARB_SEPOLIA_TICTACTOE as `0x${string}`) ||
      ZERO_ADDRESS,
    battleship:
      (process.env.NEXT_PUBLIC_ARB_SEPOLIA_BATTLESHIP as `0x${string}`) ||
      ZERO_ADDRESS,
    memoryDuel:
      (process.env.NEXT_PUBLIC_ARB_SEPOLIA_MEMORY_DUEL as `0x${string}`) ||
      ZERO_ADDRESS,
    rewardManager:
      (process.env.NEXT_PUBLIC_ARB_SEPOLIA_REWARD_MANAGER as `0x${string}`) ||
      ZERO_ADDRESS,
  },

  // Hardhat Local Node (31337)
  [CHAIN_IDS.HARDHAT]: {
    gameManager:
      (process.env.NEXT_PUBLIC_HARDHAT_GAME_MANAGER as `0x${string}`) ||
      ZERO_ADDRESS,
    ticTacToe:
      (process.env.NEXT_PUBLIC_HARDHAT_TICTACTOE as `0x${string}`) ||
      ZERO_ADDRESS,
    battleship:
      (process.env.NEXT_PUBLIC_HARDHAT_BATTLESHIP as `0x${string}`) ||
      ZERO_ADDRESS,
    memoryDuel:
      (process.env.NEXT_PUBLIC_HARDHAT_MEMORY_DUEL as `0x${string}`) ||
      ZERO_ADDRESS,
    rewardManager:
      (process.env.NEXT_PUBLIC_HARDHAT_REWARD_MANAGER as `0x${string}`) ||
      ZERO_ADDRESS,
  },
};

/**
 * Returns contract addresses for a given chainId, falling back to ZERO_ADDRESS mapping.
 */
export function getContractAddresses(chainId?: number): ContractAddresses {
  if (!chainId || !CONTRACT_ADDRESSES[chainId]) {
    return FALLBACK_ADDRESSES;
  }
  return CONTRACT_ADDRESSES[chainId] ?? FALLBACK_ADDRESSES;
}

/**
 * Checks if a contract address is configured and not the zeroAddress.
 */
export function isContractConfigured(address: string | undefined): boolean {
  if (!address) return false;
  return address.toLowerCase() !== ZERO_ADDRESS.toLowerCase();
}

/**
 * Checks if all contracts for a chain are configured.
 */
export function areContractsDeployed(chainId?: number): boolean {
  const addresses = getContractAddresses(chainId);
  return (
    isContractConfigured(addresses.gameManager) &&
    isContractConfigured(addresses.ticTacToe) &&
    isContractConfigured(addresses.battleship) &&
    isContractConfigured(addresses.memoryDuel) &&
    isContractConfigured(addresses.rewardManager)
  );
}

/**
 * ChainPlay - Environment & Network Mode Dispatcher Hook
 *
 * Inspects runtime preference (`isMockMode` from `useAppStore`),
 * wallet connectivity (`useAccount`), and contract deployment registry (`addresses.ts`).
 * Transparently determines whether operations execute against the local mock engine
 * or live on-chain smart contracts.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { useAccount, useChainId } from "wagmi";
import { useAppStore } from "@/store/useAppStore";
import {
  areContractsDeployed,
  getContractAddresses,
  type ContractAddresses,
} from "@/contracts/addresses";
import { CHAIN_IDS } from "@/config/constants";

export interface ChainPlayModeInfo {
  /**
   * Whether the active runtime should execute against the Mock Engine
   * (either by user selection or because contracts are not deployed on current chain).
   */
  isMock: boolean;

  /**
   * Whether the runtime is operating against live on-chain EVM smart contracts.
   */
  isLiveOnChain: boolean;

  /**
   * Currently active EVM chain ID (from connected wallet or fallback to configured store chain).
   */
  activeChainId: number;

  /**
   * Smart contract addresses for the active chain.
   */
  contractAddresses: ContractAddresses;

  /**
   * Whether smart contracts are deployed and configured on the active chain.
   */
  contractsAvailable: boolean;

  /**
   * Effective player address for game operations (wallet address if connected, or mock address).
   */
  effectiveAddress: string;

  /**
   * Connected wallet address, if any.
   */
  walletAddress: `0x${string}` | undefined;

  /**
   * Whether a Web3 wallet is actively connected.
   */
  isConnected: boolean;

  /**
   * Local mock player address assigned to this browser session.
   */
  mockPlayerAddress: string;

  /**
   * Toggle between Mock Mode and On-Chain Mode.
   */
  toggleMockMode: () => void;

  /**
   * Set Mock Mode state directly.
   */
  setMockMode: (enabled: boolean) => void;
}

export function useChainPlayMode(): ChainPlayModeInfo {
  const { isConnected, address: walletAddress } = useAccount();
  const wagmiChainId = useChainId();

  const isMockModeSetting = useAppStore((state) => state.isMockMode);
  const appChainId = useAppStore((state) => state.activeChainId);
  const mockPlayerAddress = useAppStore((state) => state.mockPlayerAddress);
  const setMockMode = useAppStore((state) => state.setMockMode);
  const toggleMockMode = useAppStore((state) => state.toggleMockMode);

  // Active chain ID: prioritize connected wallet chain ID if valid, else app store chain
  const activeChainId =
    isConnected && wagmiChainId ? wagmiChainId : (appChainId || CHAIN_IDS.SEPOLIA);

  const contractsAvailable = areContractsDeployed(activeChainId);
  const contractAddresses = getContractAddresses(activeChainId);

  // If user opted for mock mode OR contracts are not deployed on this chain -> Mock Mode
  const isMock = isMockModeSetting || !contractsAvailable;
  const isLiveOnChain = !isMock;

  // Effective player address: prioritize connected wallet address whenever available
  const effectiveAddress = walletAddress || mockPlayerAddress;

  return {
    isMock,
    isLiveOnChain,
    activeChainId,
    contractAddresses,
    contractsAvailable,
    effectiveAddress,
    walletAddress,
    isConnected,
    mockPlayerAddress,
    toggleMockMode,
    setMockMode,
  };
}

export default useChainPlayMode;

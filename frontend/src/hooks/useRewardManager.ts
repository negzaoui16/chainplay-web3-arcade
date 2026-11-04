/**
 * ChainPlay - Unified Reward Manager Hook
 *
 * Manages player winnings, escrowed claims, and XP progression:
 * - getRewardStats(playerAddress?) -> { claimableWei, totalWins, xpPoints }
 * - withdrawRewards() -> { success, txHash? }
 *
 * Seamlessly routes between:
 * 1. Mock Mode: tracks mock wager earnings, level XP, and local claim state.
 * 2. On-Chain Mode: queries `claimableRewards(player)` on `RewardManagerABI`,
 *    executes `withdrawRewards()` via Wagmi v2 `useWriteContract`, and listens to
 *    `RewardsClaimed` events.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { useCallback, useEffect, useState } from "react";
import { parseEther } from "viem";
import { useWriteContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { RewardManagerABI } from "@/contracts/abis/RewardManagerABI";
import { isContractConfigured } from "@/contracts/addresses";
import { useChainPlayMode } from "./useChainPlayMode";
import { useLobbyStore } from "@/store/useLobbyStore";
import { useAppStore } from "@/store/useAppStore";
import { simulateTxDelay } from "@/lib/mock/mockChainEngine";
import { playVictory } from "@/lib/utils/soundEffects";
import { RoomStatus } from "@/types/lobby.types";

const MOCK_WITHDRAWN_STORAGE_KEY = "chainplay_mock_withdrawn_wei";

export interface RewardStats {
  claimableWei: bigint;
  totalWins: number;
  xpPoints: number;
}

export interface WithdrawResult {
  success: boolean;
  txHash?: `0x${string}`;
}

export interface UseRewardManagerReturn {
  getRewardStats: (playerAddress?: string) => Promise<RewardStats>;
  withdrawRewards: () => Promise<WithdrawResult>;
  refreshRewards: () => Promise<void>;
  rewardStats: RewardStats;
  isPending: boolean;
  error: Error | null;
}

let inMemoryMockWithdrawnWei: bigint = 0n;

/**
 * Safely gets mock withdrawn amount from localStorage with in-memory fallback.
 */
function getMockWithdrawnWei(): bigint {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(MOCK_WITHDRAWN_STORAGE_KEY);
      return raw ? BigInt(raw) : inMemoryMockWithdrawnWei;
    } catch {
      return inMemoryMockWithdrawnWei;
    }
  }
  return inMemoryMockWithdrawnWei;
}

/**
 * Persists mock withdrawn amount to localStorage and in-memory cache.
 */
function setMockWithdrawnWei(amount: bigint): void {
  inMemoryMockWithdrawnWei = amount;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(MOCK_WITHDRAWN_STORAGE_KEY, amount.toString());
    } catch {
      // ignore
    }
  }
}

export function useRewardManager(): UseRewardManagerReturn {
  const {
    isMock,
    isLiveOnChain,
    contractAddresses,
    effectiveAddress,
    walletAddress,
  } = useChainPlayMode();

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const getActiveAddress = useCallback((): string => {
    return isLiveOnChain && walletAddress
      ? walletAddress
      : useAppStore.getState().mockPlayerAddress;
  }, [isLiveOnChain, walletAddress]);

  const [rewardStats, setRewardStats] = useState<RewardStats>({
    claimableWei: parseEther("0.05"),
    totalWins: 2,
    xpPoints: 450,
  });

  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const rewardAddress = contractAddresses.rewardManager;
  const isRewardConfigured = isContractConfigured(rewardAddress);

  // --------------------------------------------------------------------------
  // On-Chain Contract Event Listeners
  // --------------------------------------------------------------------------

  useWatchContractEvent({
    address: rewardAddress,
    abi: RewardManagerABI,
    eventName: "RewardsClaimed",
    enabled: isLiveOnChain && isRewardConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { player } = log.args;
        if (player && player.toLowerCase() === effectiveAddress.toLowerCase()) {
          // Immediately reset claimable balance
          setRewardStats((prev) => ({
            ...prev,
            claimableWei: 0n,
          }));
        }
      }
    },
  });

  // --------------------------------------------------------------------------
  // Query Reward Stats
  // --------------------------------------------------------------------------

  const getRewardStats = useCallback(
    async (playerAddress?: string): Promise<RewardStats> => {
      const targetAddress = (playerAddress || getActiveAddress()).toLowerCase();

      if (isMock) {
        const rooms = useLobbyStore.getState().rooms;

        // Count finished games won by player
        const wonRooms = rooms.filter(
          (r) =>
            r.status === RoomStatus.FINISHED &&
            r.winner?.toLowerCase() === targetAddress
        );

        const totalWins = wonRooms.length;

        // Base reward of 0.05 ETH + accumulated wagers
        const baseWinnings = parseEther("0.05");
        let accumulatedWinsWei = 0n;
        for (const room of wonRooms) {
          accumulatedWinsWei += (room.wager * 195n) / 100n; // ~97.5% net pot
        }

        const totalEarned = baseWinnings + accumulatedWinsWei;
        const withdrawn = getMockWithdrawnWei();
        const claimableWei = totalEarned > withdrawn ? totalEarned - withdrawn : 0n;
        const xpPoints = totalWins * 250 + 200;

        const stats: RewardStats = {
          claimableWei,
          totalWins,
          xpPoints,
        };

        setRewardStats(stats);
        return stats;
      }

      // Live On-Chain mode
      if (!isRewardConfigured || !publicClient) {
        return rewardStats;
      }

      try {
        const claimable = await publicClient.readContract({
          address: rewardAddress,
          abi: RewardManagerABI,
          functionName: "claimableRewards",
          args: [targetAddress as `0x${string}`],
        });

        // Query won games from lobby store
        const rooms = useLobbyStore.getState().rooms;
        const wonRooms = rooms.filter(
          (r) =>
            r.status === RoomStatus.FINISHED &&
            r.winner?.toLowerCase() === targetAddress
        );

        const totalWins = wonRooms.length;
        const xpPoints = totalWins * 250 + 100;

        const stats: RewardStats = {
          claimableWei: claimable,
          totalWins,
          xpPoints,
        };

        setRewardStats(stats);
        return stats;
      } catch (err) {
        console.warn("Failed to read on-chain rewards:", err);
        return rewardStats;
      }
    },
    [
      isMock,
      getActiveAddress,
      isRewardConfigured,
      publicClient,
      rewardAddress,
      rewardStats,
    ]
  );

  const refreshRewards = useCallback(async (): Promise<void> => {
    await getRewardStats();
  }, [getRewardStats]);

  // Initial load and whenever effective address / network changes
  useEffect(() => {
    void getRewardStats();
  }, [getRewardStats]);

  // --------------------------------------------------------------------------
  // Withdraw Actions
  // --------------------------------------------------------------------------

  const withdrawRewards = useCallback(async (): Promise<WithdrawResult> => {
    setIsPending(true);
    setError(null);

    try {
      if (isMock) {
        await simulateTxDelay(500, 900);

        const current = await getRewardStats();
        if (current.claimableWei <= 0n) {
          throw new Error("No claimable rewards currently available to withdraw.");
        }

        const currentWithdrawn = getMockWithdrawnWei();
        setMockWithdrawnWei(currentWithdrawn + current.claimableWei);

        // Update local state
        setRewardStats((prev) => ({
          ...prev,
          claimableWei: 0n,
        }));

        playVictory();

        return { success: true };
      }

      // Live On-Chain mode
      if (!isRewardConfigured) {
        throw new Error("RewardManager contract address is not configured for this chain.");
      }

      const hash = await writeContractAsync({
        address: rewardAddress,
        abi: RewardManagerABI,
        functionName: "withdrawRewards",
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setRewardStats((prev) => ({
        ...prev,
        claimableWei: 0n,
      }));

      playVictory();

      return { success: true, txHash: hash };
    } catch (err) {
      const caughtError =
        err instanceof Error ? err : new Error(String(err));
      setError(caughtError);
      throw caughtError;
    } finally {
      setIsPending(false);
    }
  }, [
    isMock,
    getRewardStats,
    isRewardConfigured,
    writeContractAsync,
    rewardAddress,
    publicClient,
  ]);

  return {
    getRewardStats,
    withdrawRewards,
    refreshRewards,
    rewardStats,
    isPending,
    error,
  };
}

export default useRewardManager;

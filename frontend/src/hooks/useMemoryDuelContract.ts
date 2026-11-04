/**
 * ChainPlay - Unified Memory Duel Contract Hook
 *
 * Provides operations for 4x4 cryptographic card matching duels:
 * - initializeDeck(gameId, clientSeed?)
 * - flipPair(gameId, cardIndex1, cardIndex2)
 * - claimTimeoutWin(gameId)
 *
 * Seamlessly routes between:
 * 1. Mock Mode: delegates to `useMemoryStore`, synchronizes turns via P2P BroadcastChannel,
 *    and simulates probabilistic bot recall AI (~45% retention).
 * 2. On-Chain Mode: executes transactions on `MemoryDuelABI` via Wagmi v2 `useWriteContract`,
 *    waits for confirmation, and listens to `PairFlipped` and `MemoryDuelWon` events.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { useCallback, useState } from "react";
import { keccak256, toHex } from "viem";
import { useWriteContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { MemoryDuelABI } from "@/contracts/abis/MemoryDuelABI";
import { isContractConfigured } from "@/contracts/addresses";
import { useChainPlayMode } from "./useChainPlayMode";
import { useMemoryStore } from "@/store/useMemoryStore";
import { useAppStore } from "@/store/useAppStore";
import {
  simulateTxDelay,
  broadcastP2PMessage,
  triggerBotTurn,
  resetBotMemoryCache,
} from "@/lib/mock/mockChainEngine";
import { GameType } from "@/types/lobby.types";

export interface MemoryDuelContractResult {
  success: boolean;
  txHash?: `0x${string}`;
}

export interface UseMemoryDuelContractReturn {
  initializeDeck: (
    gameId: string,
    clientSeed?: `0x${string}`
  ) => Promise<MemoryDuelContractResult>;
  flipPair: (
    gameId: string,
    cardIndex1: number,
    cardIndex2: number
  ) => Promise<MemoryDuelContractResult>;
  claimTimeoutWin: (gameId: string) => Promise<MemoryDuelContractResult>;
  isPending: boolean;
  error: Error | null;
}

export function useMemoryDuelContract(boundGameId?: string): UseMemoryDuelContractReturn {
  const {
    isMock,
    isLiveOnChain,
    contractAddresses,
    effectiveAddress,
    walletAddress,
  } = useChainPlayMode();

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const memoryAddress = contractAddresses.memoryDuel;
  const isMemoryConfigured = isContractConfigured(memoryAddress);

  const getActiveAddress = useCallback((): string => {
    return isLiveOnChain && walletAddress
      ? walletAddress
      : useAppStore.getState().mockPlayerAddress;
  }, [isLiveOnChain, walletAddress]);

  // --------------------------------------------------------------------------
  // On-Chain Contract Event Listeners
  // --------------------------------------------------------------------------

  useWatchContractEvent({
    address: memoryAddress,
    abi: MemoryDuelABI,
    eventName: "PairFlipped",
    enabled: isLiveOnChain && isMemoryConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, player, cardIndex1, cardIndex2 } = log.args;
        if (
          gameId !== undefined &&
          player &&
          cardIndex1 !== undefined &&
          cardIndex2 !== undefined
        ) {
          const targetId = boundGameId || useMemoryStore.getState().gameId;
          if (targetId === gameId.toString()) {
            if (player.toLowerCase() !== effectiveAddress.toLowerCase()) {
              const store = useMemoryStore.getState();
              store.selectCard(cardIndex1, player);
              setTimeout(() => {
                useMemoryStore.getState().selectCard(cardIndex2, player);
              }, 400);
            }
          }
        }
      }
    },
  });

  useWatchContractEvent({
    address: memoryAddress,
    abi: MemoryDuelABI,
    eventName: "MemoryDuelWon",
    enabled: isLiveOnChain && isMemoryConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, winner } = log.args;
        if (gameId !== undefined && winner) {
          const targetId = boundGameId || useMemoryStore.getState().gameId;
          if (targetId === gameId.toString()) {
            // Update store winner if not already set
          }
        }
      }
    },
  });

  // --------------------------------------------------------------------------
  // Contract Actions
  // --------------------------------------------------------------------------

  const initializeDeck = useCallback(
    async (
      gameId: string,
      clientSeed?: `0x${string}`
    ): Promise<MemoryDuelContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          await simulateTxDelay(350, 700);

          const store = useMemoryStore.getState();
          const currentAddress = getActiveAddress();
          const p1 = store.player1 || currentAddress;
          const p2 = store.player2 || "0xBOT000000000000000000000000000000000B07";

          store.initDeck(gameId, p1, p2);
          resetBotMemoryCache();

          return { success: true };
        }

        // Live On-Chain mode
        if (!isMemoryConfigured) {
          throw new Error("MemoryDuel contract address is not configured for this chain.");
        }

        const deckCommitment =
          clientSeed ||
          keccak256(toHex(`chainplay_memory_${gameId}_${Date.now()}`));

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: memoryAddress,
          abi: MemoryDuelABI,
          functionName: "initializeDeck",
          args: [numericId, deckCommitment],
        });

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        return { success: true, txHash: hash };
      } catch (err) {
        const caughtError =
          err instanceof Error ? err : new Error(String(err));
        setError(caughtError);
        throw caughtError;
      } finally {
        setIsPending(false);
      }
    },
    [
      isMock,
      getActiveAddress,
      isMemoryConfigured,
      writeContractAsync,
      memoryAddress,
      publicClient,
    ]
  );

  const flipPair = useCallback(
    async (
      gameId: string,
      cardIndex1: number,
      cardIndex2: number
    ): Promise<MemoryDuelContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          const store = useMemoryStore.getState();
          const currentAddress = getActiveAddress();

          // Flip first card
          const firstSelected = store.selectCard(cardIndex1, currentAddress);
          if (!firstSelected) {
            return { success: false };
          }

          const mockSubMode = useAppStore.getState().mockSubMode;
          if (mockSubMode === "p2p") {
            broadcastP2PMessage("MEMORY_SELECT", {
              index: cardIndex1,
              player: currentAddress,
            });
          }

          // Short human delay before flipping second card
          await simulateTxDelay(300, 500);

          // Flip second card
          store.selectCard(cardIndex2, currentAddress);
          if (mockSubMode === "p2p") {
            broadcastP2PMessage("MEMORY_SELECT", {
              index: cardIndex2,
              player: currentAddress,
            });
          } else {
            // Check if turn switches to bot
            setTimeout(() => {
              const currentStore = useMemoryStore.getState();
              if (
                currentStore.currentTurn.toLowerCase() ===
                "0xBOT000000000000000000000000000000000B07".toLowerCase()
              ) {
                void triggerBotTurn(GameType.MEMORY_DUEL, gameId);
              }
            }, 1200);
          }

          return { success: true };
        }

        // Live On-Chain mode
        if (!isMemoryConfigured) {
          throw new Error("MemoryDuel contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: memoryAddress,
          abi: MemoryDuelABI,
          functionName: "flipPair",
          args: [numericId, cardIndex1, cardIndex2],
        });

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        return { success: true, txHash: hash };
      } catch (err) {
        const caughtError =
          err instanceof Error ? err : new Error(String(err));
        setError(caughtError);
        throw caughtError;
      } finally {
        setIsPending(false);
      }
    },
    [
      isMock,
      getActiveAddress,
      isMemoryConfigured,
      writeContractAsync,
      memoryAddress,
      publicClient,
    ]
  );

  const claimTimeoutWin = useCallback(
    async (gameId: string): Promise<MemoryDuelContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          await simulateTxDelay(300, 600);
          return { success: true };
        }

        // Live On-Chain mode
        if (!isMemoryConfigured) {
          throw new Error("MemoryDuel contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: memoryAddress,
          abi: MemoryDuelABI,
          functionName: "claimTimeoutWin",
          args: [numericId],
        });

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        return { success: true, txHash: hash };
      } catch (err) {
        const caughtError =
          err instanceof Error ? err : new Error(String(err));
        setError(caughtError);
        throw caughtError;
      } finally {
        setIsPending(false);
      }
    },
    [
      isMock,
      isMemoryConfigured,
      writeContractAsync,
      memoryAddress,
      publicClient,
    ]
  );

  return {
    initializeDeck,
    flipPair,
    claimTimeoutWin,
    isPending,
    error,
  };
}

export default useMemoryDuelContract;

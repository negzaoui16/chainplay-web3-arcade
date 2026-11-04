/**
 * ChainPlay - Unified Tic-Tac-Toe Contract Hook
 *
 * Provides operations for 3x3 XO duels:
 * - makeMove(gameId, cellIndex)
 * - claimTimeoutWin(gameId)
 *
 * Seamlessly routes between:
 * 1. Mock Mode: delegates to `useTicTacToeStore.playMoveOptimistic`,
 *    broadcasts to P2P peers or triggers Smart Tactical Bot.
 * 2. On-Chain Mode: calls `makeMove` on `TicTacToeABI` via Wagmi v2 `useWriteContract`,
 *    waits for confirmation, and listens to `MoveMade` / `TicTacToeWon` / `TicTacToeDraw` events.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { useCallback, useState } from "react";
import { useWriteContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { TicTacToeABI } from "@/contracts/abis/TicTacToeABI";
import { isContractConfigured } from "@/contracts/addresses";
import { useChainPlayMode } from "./useChainPlayMode";
import { useTicTacToeStore } from "@/store/useTicTacToeStore";
import { useAppStore } from "@/store/useAppStore";
import {
  simulateTxDelay,
  broadcastP2PMessage,
  triggerBotTurn,
} from "@/lib/mock/mockChainEngine";
import { GameType } from "@/types/lobby.types";
import { ZERO_ADDRESS } from "@/config/constants";
import { playVictory } from "@/lib/utils/soundEffects";
import type { CellValue, XOWinningLine } from "@/types/tictactoe.types";

export interface TicTacToeMoveResult {
  success: boolean;
  txHash?: `0x${string}`;
}

export interface TicTacToeBoardData {
  board: CellValue[];
  currentTurn: string;
  status: number;
  winner: string | null;
}

export interface UseTicTacToeContractReturn {
  makeMove: (gameId: string, cellIndex: number) => Promise<TicTacToeMoveResult>;
  claimTimeoutWin: (gameId: string) => Promise<TicTacToeMoveResult>;
  getBoard: (gameId: string) => Promise<TicTacToeBoardData | null>;
  isPending: boolean;
  error: Error | null;
}

export function useTicTacToeContract(boundGameId?: string): UseTicTacToeContractReturn {
  const {
    isMock,
    isLiveOnChain,
    contractAddresses,
    walletAddress,
  } = useChainPlayMode();

  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [isPending, setIsPending] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const tttAddress = contractAddresses.ticTacToe;
  const isTttConfigured = isContractConfigured(tttAddress);

  const getActiveAddress = useCallback((): string => {
    return isLiveOnChain && walletAddress
      ? walletAddress
      : useAppStore.getState().mockPlayerAddress;
  }, [isLiveOnChain, walletAddress]);

  // --------------------------------------------------------------------------
  // On-Chain Contract Event Listeners
  // --------------------------------------------------------------------------

  useWatchContractEvent({
    address: tttAddress,
    abi: TicTacToeABI,
    eventName: "MoveMade",
    enabled: isLiveOnChain && isTttConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, player, cellIndex, symbol } = log.args;
        if (
          gameId !== undefined &&
          player !== undefined &&
          cellIndex !== undefined &&
          symbol !== undefined
        ) {
          const gameIdStr = gameId.toString();
          const activeStoreId = boundGameId || useTicTacToeStore.getState().gameId;
          if (activeStoreId === gameIdStr) {
            useTicTacToeStore
              .getState()
              .confirmMove(cellIndex, symbol as 1 | 2, player);
          }
        }
      }
    },
  });

  useWatchContractEvent({
    address: tttAddress,
    abi: TicTacToeABI,
    eventName: "TicTacToeWon",
    enabled: isLiveOnChain && isTttConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, winner, winningLine } = log.args;
        if (gameId !== undefined && winner !== undefined) {
          const gameIdStr = gameId.toString();
          const store = useTicTacToeStore.getState();
          if (store.gameId === gameIdStr) {
            const line =
              winningLine && winningLine.length === 3
                ? ([winningLine[0], winningLine[1], winningLine[2]] as XOWinningLine)
                : null;
            const resolvedWinner =
              winner.toLowerCase() === ZERO_ADDRESS.toLowerCase() ? null : winner;
            useTicTacToeStore.setState({
              winner: resolvedWinner,
              winningLine: line,
              isDraw: false,
            });
            playVictory();
          }
        }
      }
    },
  });

  useWatchContractEvent({
    address: tttAddress,
    abi: TicTacToeABI,
    eventName: "TicTacToeDraw",
    enabled: isLiveOnChain && isTttConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId } = log.args;
        if (gameId !== undefined) {
          const store = useTicTacToeStore.getState();
          if (store.gameId === gameId.toString()) {
            useTicTacToeStore.setState({ isDraw: true, winner: null });
          }
        }
      }
    },
  });

  // --------------------------------------------------------------------------
  // Move & Action Handlers
  // --------------------------------------------------------------------------

  const makeMove = useCallback(
    async (gameId: string, cellIndex: number): Promise<TicTacToeMoveResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          const store = useTicTacToeStore.getState();
          const targetGameId = gameId || store.gameId || "";
          const activePlayer = getActiveAddress();

          // Optimistic local move execution
          const played = store.playMoveOptimistic(cellIndex, activePlayer);
          if (!played) {
            return { success: false };
          }

          const mockSubMode = useAppStore.getState().mockSubMode;
          const symbol: 1 | 2 =
            store.player1?.toLowerCase() === activePlayer.toLowerCase() ? 1 : 2;

          if (mockSubMode === "p2p") {
            broadcastP2PMessage("XO_MOVE", {
              cellIndex,
              symbol,
              player: activePlayer,
            });
          } else {
            // Smart Bot Sub-Mode: trigger bot reaction
            void triggerBotTurn(GameType.TIC_TAC_TOE, targetGameId);
          }

          return { success: true };
        }

        // Live On-Chain mode
        if (!isTttConfigured) {
          throw new Error("TicTacToe contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: tttAddress,
          abi: TicTacToeABI,
          functionName: "makeMove",
          args: [numericId, cellIndex],
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
      isTttConfigured,
      writeContractAsync,
      tttAddress,
      publicClient,
    ]
  );

  const claimTimeoutWin = useCallback(
    async (gameId: string): Promise<TicTacToeMoveResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          await simulateTxDelay(300, 600);
          const store = useTicTacToeStore.getState();
          const activePlayer = getActiveAddress();
          const claimed = store.claimTimeoutWin(activePlayer);

          if (claimed) {
            broadcastP2PMessage("XO_TIMEOUT_CLAIM", {
              claimingPlayer: activePlayer,
            });
          }

          return { success: claimed };
        }

        // Live On-Chain mode
        if (!isTttConfigured) {
          throw new Error("TicTacToe contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: tttAddress,
          abi: TicTacToeABI,
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
      getActiveAddress,
      isTttConfigured,
      writeContractAsync,
      tttAddress,
      publicClient,
    ]
  );

  const getBoard = useCallback(
    async (gameId: string): Promise<TicTacToeBoardData | null> => {
      if (isMock) {
        const store = useTicTacToeStore.getState();
        const status = store.winner ? 2 : store.isDraw ? 3 : 1;
        return {
          board: [...store.board],
          currentTurn: store.currentTurn,
          status,
          winner: store.winner,
        };
      }

      if (!isTttConfigured || !publicClient) {
        return null;
      }

      try {
        const numericId = BigInt(gameId);
        const [board, currentTurn, status, winner] =
          await publicClient.readContract({
            address: tttAddress,
            abi: TicTacToeABI,
            functionName: "getBoard",
            args: [numericId],
          });

        return {
          board: Array.from(board) as CellValue[],
          currentTurn,
          status,
          winner:
            winner.toLowerCase() === ZERO_ADDRESS.toLowerCase()
              ? null
              : winner,
        };
      } catch {
        return null;
      }
    },
    [isMock, isTttConfigured, publicClient, tttAddress]
  );

  return {
    makeMove,
    claimTimeoutWin,
    getBoard,
    isPending,
    error,
  };
}

export default useTicTacToeContract;

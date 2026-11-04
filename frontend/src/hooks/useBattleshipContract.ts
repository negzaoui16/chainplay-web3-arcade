/**
 * ChainPlay - Unified Battleship Contract Hook
 *
 * Provides cryptographic commit-reveal naval warfare methods:
 * - commitBoard(gameId, boardHash)
 * - fireShot(gameId, x, y)
 * - revealShotAndFireNext(params)
 * - verifyFinalBoard(gameId, flatBoard, salt)
 * - claimTimeoutWin(gameId)
 *
 * Seamlessly routes between:
 * 1. Mock Mode: updates Zustand `useBattleshipStore`, simulates bot radar AI
 *    or synchronizes cross-tab via BroadcastChannel P2P.
 * 2. On-Chain Mode: executes transactions on `BattleshipABI` via Wagmi v2 `useWriteContract`,
 *    listens to on-chain shot/reveal events, and maintains real-time state.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { useCallback, useState } from "react";
import { useWriteContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { BattleshipABI } from "@/contracts/abis/BattleshipABI";
import { isContractConfigured } from "@/contracts/addresses";
import { useChainPlayMode } from "./useChainPlayMode";
import { useBattleshipStore } from "@/store/useBattleshipStore";
import { useAppStore } from "@/store/useAppStore";
import {
  simulateTxDelay,
  broadcastP2PMessage,
  triggerBotTurn,
  botReceiveShot,
} from "@/lib/mock/mockChainEngine";
import { GameType } from "@/types/lobby.types";
import { ZERO_ADDRESS } from "@/config/constants";
import { playVictory } from "@/lib/utils/soundEffects";
import type { ShipId } from "@/types/battleship.types";

export interface BattleshipContractResult {
  success: boolean;
  valid?: boolean;
  txHash?: `0x${string}`;
}

export interface RevealShotAndFireNextParams {
  gameId: string;
  prevX: number;
  prevY: number;
  isHit: boolean;
  sunkShipId: number;
  proof: `0x${string}`;
  nextX: number;
  nextY: number;
}

export interface UseBattleshipContractReturn {
  commitBoard: (gameId: string, boardHash: `0x${string}`) => Promise<BattleshipContractResult>;
  fireShot: (gameId: string, x: number, y: number) => Promise<BattleshipContractResult>;
  revealShotAndFireNext: (params: RevealShotAndFireNextParams) => Promise<BattleshipContractResult>;
  verifyFinalBoard: (
    gameId: string,
    flatBoard: number[],
    salt: `0x${string}`
  ) => Promise<BattleshipContractResult>;
  claimTimeoutWin: (gameId: string) => Promise<BattleshipContractResult>;
  isPending: boolean;
  error: Error | null;
}

export function useBattleshipContract(boundGameId?: string): UseBattleshipContractReturn {
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

  const battleshipAddress = contractAddresses.battleship;
  const isBattleshipConfigured = isContractConfigured(battleshipAddress);

  const getActiveAddress = useCallback((): string => {
    return isLiveOnChain && walletAddress
      ? walletAddress
      : useAppStore.getState().mockPlayerAddress;
  }, [isLiveOnChain, walletAddress]);

  // --------------------------------------------------------------------------
  // On-Chain Contract Event Listeners
  // --------------------------------------------------------------------------

  useWatchContractEvent({
    address: battleshipAddress,
    abi: BattleshipABI,
    eventName: "BoardCommitted",
    enabled: isLiveOnChain && isBattleshipConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, player, boardHash } = log.args;
        if (gameId !== undefined && player && boardHash) {
          const targetGameId = boundGameId || useBattleshipStore.getState().gameId;
          if (targetGameId === gameId.toString()) {
            if (player.toLowerCase() !== effectiveAddress.toLowerCase()) {
              useBattleshipStore.getState().setOpponentCommitment(boardHash);
            }
          }
        }
      }
    },
  });

  useWatchContractEvent({
    address: battleshipAddress,
    abi: BattleshipABI,
    eventName: "ShotFired",
    enabled: isLiveOnChain && isBattleshipConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, attacker, x, y } = log.args;
        if (
          gameId !== undefined &&
          attacker !== undefined &&
          x !== undefined &&
          y !== undefined
        ) {
          const targetGameId = boundGameId || useBattleshipStore.getState().gameId;
          if (targetGameId === gameId.toString()) {
            if (attacker.toLowerCase() !== effectiveAddress.toLowerCase()) {
              useBattleshipStore.getState().receiveShot(x, y);
            }
          }
        }
      }
    },
  });

  useWatchContractEvent({
    address: battleshipAddress,
    abi: BattleshipABI,
    eventName: "ShotRevealed",
    enabled: isLiveOnChain && isBattleshipConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, defender, x, y, isHit, sunkShipId } = log.args;
        if (
          gameId !== undefined &&
          defender !== undefined &&
          x !== undefined &&
          y !== undefined &&
          isHit !== undefined
        ) {
          const targetGameId = boundGameId || useBattleshipStore.getState().gameId;
          if (targetGameId === gameId.toString()) {
            if (defender.toLowerCase() !== effectiveAddress.toLowerCase()) {
              const res = isHit ? (sunkShipId && sunkShipId > 0 ? "SUNK" : "HIT") : "MISS";
              const sId = sunkShipId && sunkShipId > 0 ? (sunkShipId as ShipId) : undefined;
              useBattleshipStore.getState().revealShotResult(x, y, res, sId);
            }
          }
        }
      }
    },
  });

  useWatchContractEvent({
    address: battleshipAddress,
    abi: BattleshipABI,
    eventName: "BattleshipWon",
    enabled: isLiveOnChain && isBattleshipConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, winner } = log.args;
        if (gameId !== undefined && winner) {
          const targetGameId = boundGameId || useBattleshipStore.getState().gameId;
          if (targetGameId === gameId.toString()) {
            const resolvedWinner =
              winner.toLowerCase() === ZERO_ADDRESS.toLowerCase()
                ? null
                : winner;
            useBattleshipStore.setState({
              winner: resolvedWinner,
              phase: "FINISHED",
            });
            playVictory();
          }
        }
      }
    },
  });

  // --------------------------------------------------------------------------
  // Contract Actions
  // --------------------------------------------------------------------------

  const commitBoard = useCallback(
    async (gameId: string, boardHash: `0x${string}`): Promise<BattleshipContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          await simulateTxDelay(350, 700);

          const store = useBattleshipStore.getState();
          if (!store.isCommitted) {
            useBattleshipStore.setState({
              isCommitted: true,
              myBoardHash: boardHash,
              phase: store.opponentCommitted ? "COMBAT" : "WAITING_COMMIT",
            });
          }

          const mockSubMode = useAppStore.getState().mockSubMode;
          if (mockSubMode === "p2p") {
            broadcastP2PMessage("BATTLESHIP_COMMIT", { boardHash });
          } else {
            // Smart Bot Sub-Mode: bot commits and starts combat phase
            void triggerBotTurn(GameType.BATTLESHIP, gameId);
          }

          return { success: true };
        }

        // Live On-Chain mode
        if (!isBattleshipConfigured) {
          throw new Error("Battleship contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: battleshipAddress,
          abi: BattleshipABI,
          functionName: "commitBoard",
          args: [numericId, boardHash],
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
      isBattleshipConfigured,
      writeContractAsync,
      battleshipAddress,
      publicClient,
    ]
  );

  const fireShot = useCallback(
    async (gameId: string, x: number, y: number): Promise<BattleshipContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          const store = useBattleshipStore.getState();
          const shotQueued = store.fireShotOptimistic(x, y);

          if (!shotQueued) {
            return { success: false };
          }

          const currentAddress = getActiveAddress();
          const mockSubMode = useAppStore.getState().mockSubMode;
          if (mockSubMode === "p2p") {
            broadcastP2PMessage("BATTLESHIP_SHOT", {
              x,
              y,
              attacker: currentAddress,
            });
          } else {
            // Against Smart Bot: bot evaluates shot locally
            const botResponse = botReceiveShot(x, y);
            store.revealShotResult(x, y, botResponse.result, botResponse.sunkShipId);
            store.switchTurn("0xBOT000000000000000000000000000000000B07");
            void triggerBotTurn(GameType.BATTLESHIP, gameId);
          }

          return { success: true };
        }

        // Live On-Chain mode
        if (!isBattleshipConfigured) {
          throw new Error("Battleship contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: battleshipAddress,
          abi: BattleshipABI,
          functionName: "fireShot",
          args: [numericId, x, y],
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
      isBattleshipConfigured,
      writeContractAsync,
      battleshipAddress,
      publicClient,
    ]
  );

  const revealShotAndFireNext = useCallback(
    async (params: RevealShotAndFireNextParams): Promise<BattleshipContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          const store = useBattleshipStore.getState();
          const result = params.isHit
            ? params.sunkShipId > 0
              ? "SUNK"
              : "HIT"
            : "MISS";
          const sId =
            params.sunkShipId > 0 ? (params.sunkShipId as ShipId) : undefined;

          // Reveal previous incoming shot
          store.revealShotResult(params.prevX, params.prevY, result, sId);

          // Fire next outgoing shot
          store.fireShotOptimistic(params.nextX, params.nextY);

          const currentAddress = getActiveAddress();
          const mockSubMode = useAppStore.getState().mockSubMode;
          if (mockSubMode === "p2p") {
            broadcastP2PMessage("BATTLESHIP_REVEAL", {
              x: params.prevX,
              y: params.prevY,
              result,
              sunkShipId: sId,
              defender: currentAddress,
            });
            broadcastP2PMessage("BATTLESHIP_SHOT", {
              x: params.nextX,
              y: params.nextY,
              attacker: currentAddress,
            });
          } else {
            const botResponse = botReceiveShot(params.nextX, params.nextY);
            store.revealShotResult(
              params.nextX,
              params.nextY,
              botResponse.result,
              botResponse.sunkShipId
            );
            void triggerBotTurn(GameType.BATTLESHIP, params.gameId);
          }

          return { success: true };
        }

        // Live On-Chain mode
        if (!isBattleshipConfigured) {
          throw new Error("Battleship contract address is not configured for this chain.");
        }

        const numericId = BigInt(params.gameId);
        const hash = await writeContractAsync({
          address: battleshipAddress,
          abi: BattleshipABI,
          functionName: "revealShotAndFireNext",
          args: [
            numericId,
            params.prevX,
            params.prevY,
            params.isHit,
            params.sunkShipId,
            params.proof,
            params.nextX,
            params.nextY,
          ],
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
      isBattleshipConfigured,
      writeContractAsync,
      battleshipAddress,
      publicClient,
    ]
  );

  const verifyFinalBoard = useCallback(
    async (
      gameId: string,
      flatBoard: number[],
      salt: `0x${string}`
    ): Promise<BattleshipContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          await simulateTxDelay(300, 600);
          const valid = useBattleshipStore
            .getState()
            .verifyFinalBoard(flatBoard, salt);
          return { success: true, valid };
        }

        // Live On-Chain mode
        if (!isBattleshipConfigured) {
          throw new Error("Battleship contract address is not configured for this chain.");
        }

        // Format exactly 100 cells
        const paddedBoard = Array.from({ length: 100 }, (_, i) => flatBoard[i] ?? 0);
        const numericId = BigInt(gameId);

        const hash = await writeContractAsync({
          address: battleshipAddress,
          abi: BattleshipABI,
          functionName: "verifyFinalBoard",
          args: [numericId, paddedBoard, salt],
        });

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }

        return { success: true, valid: true, txHash: hash };
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
      isBattleshipConfigured,
      writeContractAsync,
      battleshipAddress,
      publicClient,
    ]
  );

  const claimTimeoutWin = useCallback(
    async (gameId: string): Promise<BattleshipContractResult> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          await simulateTxDelay(300, 600);
          const activeAddress = getActiveAddress();
          useBattleshipStore.setState({
            winner: activeAddress,
            phase: "FINISHED",
          });
          return { success: true };
        }

        // Live On-Chain mode
        if (!isBattleshipConfigured) {
          throw new Error("Battleship contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: battleshipAddress,
          abi: BattleshipABI,
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
      isBattleshipConfigured,
      writeContractAsync,
      battleshipAddress,
      publicClient,
    ]
  );

  return {
    commitBoard,
    fireShot,
    revealShotAndFireNext,
    verifyFinalBoard,
    claimTimeoutWin,
    isPending,
    error,
  };
}

export default useBattleshipContract;

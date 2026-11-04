/**
 * ChainPlay - Unified Game Manager Hook
 *
 * Provides high-level room lifecycle methods:
 * - createGame(gameType, wagerEth)
 * - joinGame(gameId, wagerEth)
 * - cancelWaitingGame(gameId)
 * - getGameInfo(gameId)
 *
 * Seamlessly routes between:
 * 1. Mock Mode: updates Zustand `useLobbyStore` & broadcasts via BroadcastChannel.
 * 2. On-Chain Mode: executes transactions via Wagmi v2 `useWriteContract` and watches
 *    events with `useWatchContractEvent` to keep the lobby synchronized in real time.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { useCallback, useState } from "react";
import { parseEther, decodeEventLog } from "viem";
import { useWriteContract, usePublicClient, useWatchContractEvent } from "wagmi";
import { GameManagerABI } from "@/contracts/abis/GameManagerABI";
import { isContractConfigured } from "@/contracts/addresses";
import { useChainPlayMode } from "./useChainPlayMode";
import { useLobbyStore } from "@/store/useLobbyStore";
import { useAppStore } from "@/store/useAppStore";
import { simulateTxDelay, broadcastP2PMessage } from "@/lib/mock/mockChainEngine";
import { GameType, RoomStatus, type RoomMetadata } from "@/types/lobby.types";
import { ZERO_ADDRESS } from "@/config/constants";

export interface CreateGameResult {
  gameId: string;
  txHash?: `0x${string}`;
}

export interface JoinGameResult {
  success: boolean;
  txHash?: `0x${string}`;
}

export interface UseGameManagerReturn {
  createGame: (gameType: GameType, wagerEth: string) => Promise<CreateGameResult>;
  joinGame: (gameId: string, wagerEth: string) => Promise<JoinGameResult>;
  cancelWaitingGame: (gameId: string) => Promise<void>;
  getGameInfo: (gameId: string) => Promise<RoomMetadata | null>;
  isPending: boolean;
  error: Error | null;
}

export function useGameManager(): UseGameManagerReturn {
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

  const managerAddress = contractAddresses.gameManager;
  const isManagerConfigured = isContractConfigured(managerAddress);

  // Helper to resolve current active address at invocation time
  const getActiveAddress = useCallback((): string => {
    return isLiveOnChain && walletAddress
      ? walletAddress
      : useAppStore.getState().mockPlayerAddress;
  }, [isLiveOnChain, walletAddress]);

  // --------------------------------------------------------------------------
  // On-Chain Event Listeners (Synchronize Lobby Store)
  // --------------------------------------------------------------------------

  useWatchContractEvent({
    address: managerAddress,
    abi: GameManagerABI,
    eventName: "GameCreated",
    enabled: isLiveOnChain && isManagerConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, creator, gameType, wager } = log.args;
        if (
          gameId !== undefined &&
          creator !== undefined &&
          gameType !== undefined &&
          wager !== undefined
        ) {
          const newRoom: RoomMetadata = {
            id: gameId.toString(),
            gameType: gameType as GameType,
            player1: creator,
            player2: null,
            wager,
            status: RoomStatus.WAITING,
            winner: null,
            createdAt: Date.now(),
          };
          const lobby = useLobbyStore.getState();
          if (!lobby.rooms.some((r) => r.id === newRoom.id)) {
            lobby.syncRooms([newRoom, ...lobby.rooms]);
          }
        }
      }
    },
  });

  useWatchContractEvent({
    address: managerAddress,
    abi: GameManagerABI,
    eventName: "GameJoined",
    enabled: isLiveOnChain && isManagerConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, joiner } = log.args;
        if (gameId !== undefined && joiner) {
          useLobbyStore.getState().joinRoom(gameId.toString(), joiner);
        }
      }
    },
  });

  useWatchContractEvent({
    address: managerAddress,
    abi: GameManagerABI,
    eventName: "GameCancelled",
    enabled: isLiveOnChain && isManagerConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, player } = log.args;
        if (gameId !== undefined && player) {
          useLobbyStore.getState().cancelRoom(gameId.toString(), player);
        }
      }
    },
  });

  useWatchContractEvent({
    address: managerAddress,
    abi: GameManagerABI,
    eventName: "GameFinished",
    enabled: isLiveOnChain && isManagerConfigured,
    onLogs(logs) {
      for (const log of logs) {
        const { gameId, winner } = log.args;
        if (gameId !== undefined && winner) {
          useLobbyStore
            .getState()
            .updateRoomStatus(gameId.toString(), RoomStatus.FINISHED, winner);
        }
      }
    },
  });

  // --------------------------------------------------------------------------
  // Room Actions
  // --------------------------------------------------------------------------

  const createGame = useCallback(
    async (gameType: GameType, wagerEth: string): Promise<CreateGameResult> => {
      setIsPending(true);
      setError(null);

      try {
        const wagerWei = parseEther(wagerEth);

        if (isMock) {
          // Mock mode: simulate EVM block latency
          await simulateTxDelay(400, 750);
          const currentAddress = getActiveAddress();

          const room = useLobbyStore.getState().createRoom({
            gameType,
            wager: wagerWei,
            player1: currentAddress,
          });

          // Broadcast to other tabs
          broadcastP2PMessage("ROOM_CREATED", room);

          return { gameId: room.id };
        }

        // Live On-Chain mode
        if (!isManagerConfigured) {
          throw new Error("GameManager contract address is not configured for this chain.");
        }

        const hash = await writeContractAsync({
          address: managerAddress,
          abi: GameManagerABI,
          functionName: "createGame",
          args: [gameType],
          value: wagerWei,
        });

        let createdGameId = "";

        if (publicClient) {
          const receipt = await publicClient.waitForTransactionReceipt({ hash });
          for (const log of receipt.logs) {
            try {
              const decoded = decodeEventLog({
                abi: GameManagerABI,
                data: log.data,
                topics: log.topics,
              });
              if (decoded.eventName === "GameCreated") {
                const args = decoded.args as { gameId: bigint };
                createdGameId = args.gameId.toString();
                break;
              }
            } catch {
              // Ignore non-matching logs
            }
          }
        }

        return {
          gameId: createdGameId || hash,
          txHash: hash,
        };
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
      isManagerConfigured,
      writeContractAsync,
      managerAddress,
      publicClient,
    ]
  );

  const joinGame = useCallback(
    async (gameId: string, wagerEth: string): Promise<JoinGameResult> => {
      setIsPending(true);
      setError(null);

      try {
        const wagerWei = parseEther(wagerEth);

        if (isMock) {
          await simulateTxDelay(400, 750);
          const currentAddress = getActiveAddress();

          const success = useLobbyStore
            .getState()
            .joinRoom(gameId, currentAddress);

          if (!success) {
            throw new Error(`Room ${gameId} cannot be joined or is no longer waiting.`);
          }

          broadcastP2PMessage("ROOM_JOINED", {
            roomId: gameId,
            player2: currentAddress,
          });

          return { success: true };
        }

        // Live On-Chain mode
        if (!isManagerConfigured) {
          throw new Error("GameManager contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: managerAddress,
          abi: GameManagerABI,
          functionName: "joinGame",
          args: [numericId],
          value: wagerWei,
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
      isManagerConfigured,
      writeContractAsync,
      managerAddress,
      publicClient,
    ]
  );

  const cancelWaitingGame = useCallback(
    async (gameId: string): Promise<void> => {
      setIsPending(true);
      setError(null);

      try {
        if (isMock) {
          await simulateTxDelay(300, 600);
          const currentAddress = getActiveAddress();

          const success = useLobbyStore
            .getState()
            .cancelRoom(gameId, currentAddress);

          if (success) {
            broadcastP2PMessage("ROOM_CANCELLED", {
              roomId: gameId,
              playerAddress: currentAddress,
            });
          }
          return;
        }

        // Live On-Chain mode
        if (!isManagerConfigured) {
          throw new Error("GameManager contract address is not configured for this chain.");
        }

        const numericId = BigInt(gameId);
        const hash = await writeContractAsync({
          address: managerAddress,
          abi: GameManagerABI,
          functionName: "cancelWaitingGame",
          args: [numericId],
        });

        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash });
        }
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
      isManagerConfigured,
      writeContractAsync,
      managerAddress,
      publicClient,
    ]
  );

  const getGameInfo = useCallback(
    async (gameId: string): Promise<RoomMetadata | null> => {
      if (isMock) {
        const found = useLobbyStore
          .getState()
          .rooms.find((r) => r.id === gameId);
        return found ?? null;
      }

      // Live On-Chain mode
      if (!isManagerConfigured || !publicClient) {
        return null;
      }

      try {
        const numericId = BigInt(gameId);
        const [player1, player2, gameTypeNum, wager, statusNum, winner] =
          await publicClient.readContract({
            address: managerAddress,
            abi: GameManagerABI,
            functionName: "getGameInfo",
            args: [numericId],
          });

        return {
          id: gameId,
          gameType: gameTypeNum as GameType,
          player1,
          player2: player2.toLowerCase() === ZERO_ADDRESS.toLowerCase() ? null : player2,
          wager,
          status: statusNum as RoomStatus,
          winner: winner.toLowerCase() === ZERO_ADDRESS.toLowerCase() ? null : winner,
          createdAt: Date.now(),
        };
      } catch {
        return null;
      }
    },
    [isMock, isManagerConfigured, publicClient, managerAddress]
  );

  return {
    createGame,
    joinGame,
    cancelWaitingGame,
    getGameInfo,
    isPending,
    error,
  };
}

export default useGameManager;

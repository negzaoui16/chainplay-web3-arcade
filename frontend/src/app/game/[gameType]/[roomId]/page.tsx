"use client";

/**
 * ChainPlay - Dynamic Game Arena Router
 *
 * Route: `/game/[gameType]/[roomId]`
 *
 * Responsibilities:
 * 1. Resolves dynamic route parameters (`gameType`, `roomId`).
 * 2. Fetches or synchronizes room metadata via `useLobbyStore` & `useGameManager`.
 * 3. If room status is `WAITING`: mounts `WaitingRoomOverlay` with 1v1 invite sharing,
 *    radar scanner, and cancel wager options.
 * 4. When room status becomes `ACTIVE`: mounts the respective arena:
 *    - `TicTacToeArena`
 *    - `BattleshipArena`
 *    - `MemoryDuelArena`
 * 5. Handles invalid game types or cancelled rooms gracefully.
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  GameType,
  RoomStatus,
  type RoomMetadata,
} from "@/types/lobby.types";
import { useLobbyStore } from "@/store/useLobbyStore";
import { useGameManager } from "@/hooks/useGameManager";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import { MOCK_PLAYER_1_ADDRESS } from "@/store/useAppStore";
import { WaitingRoomOverlay } from "@/components/lobby/WaitingRoomOverlay";
import { TicTacToeArena } from "@/components/games/tictactoe";
import { BattleshipArena } from "@/components/games/battleship";
import { MemoryDuelArena } from "@/components/games/memory";
import { soundEffects } from "@/lib/utils/soundEffects";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

function resolveGameType(raw: string): GameType | null {
  const s = raw.toLowerCase().trim();
  if (s === "tictactoe" || s === "tic-tac-toe" || s === "0") {
    return GameType.TIC_TAC_TOE;
  }
  if (s === "battleship" || s === "1") {
    return GameType.BATTLESHIP;
  }
  if (s === "memory" || s === "memoryduel" || s === "memory-duel" || s === "2") {
    return GameType.MEMORY_DUEL;
  }
  return null;
}

export default function GameRoomPage(): JSX.Element {
  const params = useParams<{ gameType: string; roomId: string }>();
  const router = useRouter();

  const gameTypeParam = params?.gameType ?? "";
  const roomIdParam = params?.roomId ?? "";

  const resolvedGameType = resolveGameType(gameTypeParam);

  const rooms = useLobbyStore((s) => s.rooms);
  const { getGameInfo } = useGameManager();
  const { isMock } = useChainPlayMode();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [roomData, setRoomData] = useState<RoomMetadata | null>(null);

  // Sync room from local store or query contract
  const loadRoom = useCallback(async (): Promise<void> => {
    if (!roomIdParam || resolvedGameType === null) {
      setIsLoading(false);
      return;
    }

    // 1. Check existing lobby store
    const localRoom = rooms.find((r) => r.id === roomIdParam);
    if (localRoom) {
      setRoomData(localRoom);
      setIsLoading(false);
      return;
    }

    // 2. Query contract / engine
    try {
      const fetched = await getGameInfo(roomIdParam);
      if (fetched) {
        setRoomData(fetched);
      } else if (isMock) {
        // Fallback for direct mock tab testing
        const fallback: RoomMetadata = {
          id: roomIdParam,
          gameType: resolvedGameType,
          player1: MOCK_PLAYER_1_ADDRESS,
          player2: null,
          wager: 10000000000000000n, // 0.01 ETH
          status: RoomStatus.WAITING,
          winner: null,
          createdAt: Date.now(),
        };
        useLobbyStore.getState().syncRooms([fallback, ...rooms]);
        setRoomData(fallback);
      }
    } catch (err) {
      console.warn("Failed to retrieve room details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [roomIdParam, resolvedGameType, rooms, getGameInfo, isMock]);

  useEffect(() => {
    void loadRoom();
  }, [loadRoom]);

  // Keep roomData synchronized with store updates (e.g. when opponent joins)
  useEffect(() => {
    if (roomIdParam) {
      const updated = rooms.find((r) => r.id === roomIdParam);
      if (updated) {
        setRoomData(updated);
      }
    }
  }, [rooms, roomIdParam]);

  // --------------------------------------------------------------------------
  // Invalid Game Type Fallback
  // --------------------------------------------------------------------------
  if (resolvedGameType === null) {
    return (
      <div className="w-full max-w-md mx-auto my-24 p-6 rounded-2xl bg-[#0D121F] border border-rose-500/40 text-center flex flex-col items-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
        <h2 className="text-xl font-black text-white font-mono uppercase mb-2">
          Unknown Arena
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          The requested game mode &quot;{gameTypeParam}&quot; does not exist on ChainPlay.
        </p>
        <button
          type="button"
          onClick={() => router.push("/lobby")}
          className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Matchmaking</span>
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">
          Initializing Arena Shard...
        </span>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Cancelled or Missing Room
  // --------------------------------------------------------------------------
  if (!roomData || roomData.status === RoomStatus.CANCELLED) {
    return (
      <div className="w-full max-w-md mx-auto my-24 p-6 rounded-2xl bg-[#0D121F] border border-slate-800 text-center flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-white font-mono uppercase mb-2">
          Arena Closed or Not Found
        </h2>
        <p className="text-xs text-slate-400 mb-6">
          This match room is no longer active or was cancelled by the host.
        </p>
        <button
          type="button"
          onClick={() => {
            soundEffects.playTileClick();
            router.push("/lobby");
          }}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-2 shadow-cyan-glow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Find Another Arena</span>
        </button>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Case A: Room is WAITING for Opponent
  // --------------------------------------------------------------------------
  if (roomData.status === RoomStatus.WAITING) {
    return (
      <WaitingRoomOverlay
        roomId={roomData.id}
        gameType={roomData.gameType}
        wager={roomData.wager}
        player1={roomData.player1}
        player2={roomData.player2}
        onOpponentJoined={() => {
          // Refresh room status
          const updated = rooms.find((r) => r.id === roomData.id);
          if (updated) {
            setRoomData(updated);
          }
        }}
        onCancelled={() => {
          router.push("/lobby");
        }}
      />
    );
  }

  // --------------------------------------------------------------------------
  // Case B: Room is ACTIVE or FINISHED -> Mount the Arena Component
  // --------------------------------------------------------------------------
  const handleBackToLobby = (): void => {
    soundEffects.playTileClick();
    router.push("/lobby");
  };

  switch (resolvedGameType) {
    case GameType.TIC_TAC_TOE:
      return (
        <TicTacToeArena
          gameId={roomData.id}
          initialWager={roomData.wager}
          initialPlayer1={roomData.player1}
          initialPlayer2={roomData.player2}
          onBackToLobby={handleBackToLobby}
        />
      );

    case GameType.BATTLESHIP:
      return (
        <BattleshipArena
          gameId={roomData.id}
          initialWager={roomData.wager}
          initialPlayer1={roomData.player1}
          initialPlayer2={roomData.player2}
          onBackToLobby={handleBackToLobby}
        />
      );

    case GameType.MEMORY_DUEL:
      return (
        <MemoryDuelArena
          gameId={roomData.id}
          initialWager={roomData.wager}
          initialPlayer1={roomData.player1}
          initialPlayer2={roomData.player2}
          onBackToLobby={handleBackToLobby}
        />
      );
  }
}

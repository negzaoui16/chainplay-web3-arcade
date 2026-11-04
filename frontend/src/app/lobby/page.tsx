"use client";

/**
 * ChainPlay - Matchmaking Lobby Page
 *
 * Full featured PvP matchmaking hub:
 * - Real-time open lobbies table with live filters and search
 * - Create Arena Modal integration with query-parameter deep linking
 * - Network state banner & quick statistics (Open Arenas, Total Staked ETH)
 * - Waiting room transition handler
 * - Wrapped with Suspense boundary for Next.js App Router client bailout safety
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PlusCircle,
  Users,
  Coins,
  ShieldCheck,
  Trophy,
  Loader2,
} from "lucide-react";
import { GameType } from "@/types/lobby.types";
import { RoomListTable } from "@/components/lobby/RoomListTable";
import { CreateRoomModal } from "@/components/lobby/CreateRoomModal";
import { useLobbyStore } from "@/store/useLobbyStore";
import { formatEther } from "@/lib/utils/formatters";
import { soundEffects } from "@/lib/utils/soundEffects";

function LobbyContent(): JSX.Element {
  const searchParams = useSearchParams();
  const rooms = useLobbyStore((s) => s.rooms);

  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [modalDefaultGame, setModalDefaultGame] = useState<GameType>(
    GameType.TIC_TAC_TOE
  );

  // Check query params for instant create modal trigger
  useEffect(() => {
    const createQuery = searchParams.get("create");
    if (createQuery) {
      if (createQuery === "battleship") {
        setModalDefaultGame(GameType.BATTLESHIP);
      } else if (createQuery === "memory") {
        setModalDefaultGame(GameType.MEMORY_DUEL);
      } else {
        setModalDefaultGame(GameType.TIC_TAC_TOE);
      }
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  const openRooms = rooms.filter((r) => r.status === 0);
  const totalStakedWei = rooms.reduce((acc, r) => acc + r.wager, 0n);

  const handleOpenCreateModal = (
    gameType: GameType = GameType.TIC_TAC_TOE
  ): void => {
    soundEffects.playTileClick();
    setModalDefaultGame(gameType);
    setCreateModalOpen(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8">
      {/* Lobby Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-wider">
              Real-Time Matchmaking
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-mono uppercase tracking-wide">
            PvP Battle Lobby
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse open arenas, stake ETH, or create your own custom challenge
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCreateModal()}
          className="w-full md:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-cyan-glow hover:shadow-cyan-glow-lg flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Arena & Stake</span>
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#0D121F]/80 border border-slate-800 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Open Arenas
            </span>
            <p className="text-lg font-mono font-bold text-white">
              {openRooms.length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D121F]/80 border border-slate-800 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Total Staked
            </span>
            <p className="text-lg font-mono font-bold text-amber-300">
              {formatEther(totalStakedWei, 3)} ETH
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D121F]/80 border border-slate-800 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-pink-950/60 border border-pink-500/40 flex items-center justify-center text-pink-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Active Matches
            </span>
            <p className="text-lg font-mono font-bold text-white">
              {rooms.filter((r) => r.status === 1).length}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0D121F]/80 border border-slate-800 backdrop-blur-md flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">
              Smart Escrow
            </span>
            <p className="text-lg font-mono font-bold text-emerald-400">
              100% On-Chain
            </p>
          </div>
        </div>
      </div>

      {/* Main Room List Table with Integrated Filters */}
      <RoomListTable
        showFilters={true}
        onOpenCreateModal={() => handleOpenCreateModal()}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createModalOpen}
        defaultGameType={modalDefaultGame}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}

export default function LobbyPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">
            Loading Battle Arenas...
          </span>
        </div>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}

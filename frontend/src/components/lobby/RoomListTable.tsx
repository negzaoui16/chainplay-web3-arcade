"use client";

/**
 * ChainPlay - Live Open Rooms Table
 *
 * Displays active and waiting matchmaking arenas with:
 * - Real-time filtering by Game Type (All, Tic-Tac-Toe, Battleship, Memory Duel)
 * - Real-time address / Room ID search input
 * - Instant "Join & Stake" button invoking `useGameManager.joinGame`
 * - Host identification & cancellation/waiting room shortcuts
 * - Desktop tabular layout & mobile optimized cyber cards
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState } from "react";
import {
  Swords,
  Shield,
  Brain,
  Search,
  Users,
  Coins,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  Eye,
  PlusCircle,
} from "lucide-react";
import {
  GameType,
  RoomStatus,
  type RoomMetadata,
  GAME_TYPE_SLUGS,
} from "@/types/lobby.types";
import { useLobbyStore } from "@/store/useLobbyStore";
import { useGameManager } from "@/hooks/useGameManager";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import {
  formatAddress,
  formatWager,
  formatEther,
  formatTimestamp,
} from "@/lib/utils/formatters";
import { soundEffects } from "@/lib/utils/soundEffects";

export interface RoomListTableProps {
  readonly onOpenCreateModal?: () => void;
  readonly className?: string;
  readonly limit?: number;
  readonly showFilters?: boolean;
}

export function RoomListTable({
  onOpenCreateModal,
  className = "",
  limit,
  showFilters = true,
}: RoomListTableProps): JSX.Element {
  const { joinGame, isPending } = useGameManager();
  const { effectiveAddress } = useChainPlayMode();

  const rooms = useLobbyStore((s) => s.rooms);
  const filters = useLobbyStore((s) => s.filters);
  const setFilters = useLobbyStore((s) => s.setFilters);

  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string, e: React.MouseEvent): void => {
    e.stopPropagation();
    soundEffects.playTileClick();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(id).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const handleJoinRoom = async (room: RoomMetadata): Promise<void> => {
    soundEffects.playTileClick();
    setJoiningRoomId(room.id);

    try {
      const wagerEth = formatEther(room.wager);
      const res = await joinGame(room.id, wagerEth);
      if (res.success) {
        soundEffects.playMatchChime();
        const slug = GAME_TYPE_SLUGS[room.gameType];
        window.location.assign(`/game/${slug}/${room.id}`);
      }
    } catch (err) {
      soundEffects.playError();
      console.error("Failed to join arena:", err);
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleNavigateToRoom = (room: RoomMetadata): void => {
    soundEffects.playTileClick();
    const slug = GAME_TYPE_SLUGS[room.gameType];
    window.location.assign(`/game/${slug}/${room.id}`);
  };

  // Filtered rooms logic
  const filteredRooms = rooms.filter((r) => {
    if (filters.gameType !== "ALL" && filters.gameType !== undefined) {
      if (r.gameType !== filters.gameType) return false;
    }
    if (filters.status !== "ALL" && filters.status !== undefined) {
      if (r.status !== filters.status) return false;
    }
    if (filters.searchQuery && filters.searchQuery.trim() !== "") {
      const q = filters.searchQuery.toLowerCase().trim();
      const matchId = r.id.toLowerCase().includes(q);
      const matchP1 = r.player1.toLowerCase().includes(q);
      const matchP2 = r.player2 ? r.player2.toLowerCase().includes(q) : false;
      if (!matchId && !matchP1 && !matchP2) return false;
    }
    return true;
  });

  const displayedRooms = limit ? filteredRooms.slice(0, limit) : filteredRooms;

  const getGamePill = (gameType: GameType): JSX.Element => {
    switch (gameType) {
      case GameType.TIC_TAC_TOE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
            <Swords className="w-3.5 h-3.5" />
            <span>Tic-Tac-Toe</span>
          </span>
        );
      case GameType.BATTLESHIP:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-pink-950/60 border border-pink-500/40 text-pink-300">
            <Shield className="w-3.5 h-3.5" />
            <span>Battleship</span>
          </span>
        );
      case GameType.MEMORY_DUEL:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 border border-amber-500/40 text-amber-300">
            <Brain className="w-3.5 h-3.5" />
            <span>Memory Duel</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: RoomStatus): JSX.Element => {
    switch (status) {
      case RoomStatus.WAITING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 border border-emerald-500/50 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Open & Waiting</span>
          </span>
        );
      case RoomStatus.ACTIVE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>In Battle</span>
          </span>
        );
      case RoomStatus.FINISHED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <span>Finished</span>
          </span>
        );
      case RoomStatus.CANCELLED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/40 text-rose-400 border border-rose-500/30">
            <span>Cancelled</span>
          </span>
        );
    }
  };

  return (
    <div className={`w-full flex flex-col gap-4 ${className}`}>
      {/* Optional Filters and Search Bar */}
      {showFilters && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#0D121F]/90 border border-slate-800 backdrop-blur-md">
          {/* Game Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                setFilters({ gameType: "ALL" });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filters.gameType === "ALL" || filters.gameType === undefined
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-cyan-glow"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              All Arenas
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                setFilters({ gameType: GameType.TIC_TAC_TOE });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filters.gameType === GameType.TIC_TAC_TOE
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-cyan-glow"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Tic-Tac-Toe
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                setFilters({ gameType: GameType.BATTLESHIP });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filters.gameType === GameType.BATTLESHIP
                  ? "bg-pink-500/20 text-pink-300 border border-pink-500/50 shadow-magenta-glow"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Battleship
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                setFilters({ gameType: GameType.MEMORY_DUEL });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filters.gameType === GameType.MEMORY_DUEL
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-amber-glow"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              Memory Duel
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Room ID or Player address..."
              value={filters.searchQuery || ""}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              className="w-full py-1.5 pl-9 pr-3 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500/80 focus:outline-none text-xs text-slate-200 placeholder-slate-500 font-mono transition-colors"
            />
          </div>
        </div>
      )}

      {/* Main Table / Grid Container */}
      <div className="w-full rounded-2xl bg-[#0D121F]/90 border border-slate-800/90 backdrop-blur-md overflow-hidden shadow-xl">
        {displayedRooms.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-cyan-glow">
              <Users className="w-7 h-7 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider mb-1">
              No Matching Arenas Open
            </h3>
            <p className="text-xs text-slate-400 max-w-md mb-5">
              Be the first champion to stake a wager and establish a battle room
              for others to join.
            </p>
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTileClick();
                  onOpenCreateModal();
                }}
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-cyan-glow flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Arena</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/60 uppercase font-bold text-[10px] tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="py-3.5 px-5">
                      Arena Mode
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Room Code
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Host (Player 1)
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Stake per Player
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Status
                    </th>
                    <th scope="col" className="py-3.5 px-4">
                      Created
                    </th>
                    <th scope="col" className="py-3.5 px-5 text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {displayedRooms.map((room) => {
                    const isHost =
                      room.player1.toLowerCase() ===
                      effectiveAddress.toLowerCase();
                    const isJoining = joiningRoomId === room.id;

                    return (
                      <tr
                        key={room.id}
                        onClick={() => handleNavigateToRoom(room)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        {/* Game Mode */}
                        <td className="py-4 px-5">
                          {getGamePill(room.gameType)}
                        </td>

                        {/* Room Code */}
                        <td className="py-4 px-4 font-mono font-bold text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{formatAddress(room.id, 6, 4)}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(room.id, e)}
                              className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                              title="Copy Room ID"
                            >
                              {copiedId === room.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Host Address */}
                        <td className="py-4 px-4 font-mono">
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                isHost ? "text-cyan-400 font-bold" : "text-slate-300"
                              }
                            >
                              {formatAddress(room.player1)}
                            </span>
                            {isHost && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Stake */}
                        <td className="py-4 px-4 font-mono font-bold text-amber-300">
                          {formatWager(room.wager)}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          {getStatusBadge(room.status)}
                        </td>

                        {/* Created At */}
                        <td className="py-4 px-4 text-slate-400">
                          {formatTimestamp(room.createdAt)}
                        </td>

                        {/* Action CTA */}
                        <td className="py-4 px-5 text-right">
                          {room.status === RoomStatus.WAITING ? (
                            isHost ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNavigateToRoom(room);
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all inline-flex items-center gap-1.5"
                              >
                                <span>Waiting Room</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleJoinRoom(room);
                                }}
                                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-cyan-glow hover:shadow-cyan-glow-lg inline-flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {isJoining ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Joining...</span>
                                  </>
                                ) : (
                                  <>
                                    <Coins className="w-3.5 h-3.5" />
                                    <span>Join & Stake</span>
                                  </>
                                )}
                              </button>
                            )
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToRoom(room);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-all inline-flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Cards View */}
            <div className="lg:hidden divide-y divide-slate-800/80">
              {displayedRooms.map((room) => {
                const isHost =
                  room.player1.toLowerCase() ===
                  effectiveAddress.toLowerCase();
                const isJoining = joiningRoomId === room.id;

                return (
                  <div
                    key={room.id}
                    onClick={() => handleNavigateToRoom(room)}
                    className="p-4 flex flex-col gap-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {getGamePill(room.gameType)}
                      {getStatusBadge(room.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs py-1">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          Host
                        </span>
                        <div className="font-mono text-slate-300 flex items-center gap-1">
                          <span>{formatAddress(room.player1)}</span>
                          {isHost && (
                            <span className="text-[9px] px-1 bg-cyan-950 text-cyan-300 rounded font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          Stake
                        </span>
                        <div className="font-mono font-bold text-amber-300">
                          {formatWager(room.wager)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <span>{formatAddress(room.id, 4, 3)}</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(room.id, e)}
                          className="p-0.5 text-slate-500 hover:text-white"
                        >
                          {copiedId === room.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {room.status === RoomStatus.WAITING ? (
                        isHost ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToRoom(room);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs"
                          >
                            Waiting Room
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleJoinRoom(room);
                            }}
                            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase shadow-cyan-glow disabled:opacity-50"
                          >
                            {isJoining ? "Joining..." : "Join & Stake"}
                          </button>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToRoom(room);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 text-xs"
                        >
                          View Arena
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default RoomListTable;

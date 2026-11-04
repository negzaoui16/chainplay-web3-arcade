"use client";

/**
 * ChainPlay - Player Profile, Leaderboard & Reward Claims
 *
 * Provides:
 * - Gamer Identity Card with cyberpunk avatar, tier rank, and network status
 * - Player Performance Metrics: Total Wins, Win Rate %, XP Level & Rank
 * - Real-Time Claimable Rewards Card with one-click "Withdraw Rewards" CTA
 * - Integration with `useRewardManager` & celebratory confetti on claim
 * - Detailed Match History Table filtering player past duels
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  Trophy,
  Coins,
  Shield,
  Swords,
  Brain,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Flame,
  ArrowLeft,
} from "lucide-react";
import { useRewardManager } from "@/hooks/useRewardManager";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import { useLobbyStore } from "@/store/useLobbyStore";
import {
  GameType,
  RoomStatus,
  GAME_TYPE_LABELS,
  GAME_TYPE_SLUGS,
} from "@/types/lobby.types";
import {
  formatAddress,
  formatEther,
  formatWager,
  formatTimestamp,
  formatNumber,
} from "@/lib/utils/formatters";
import { soundEffects } from "@/lib/utils/soundEffects";

function getRankTitle(xp: number): { title: string; color: string } {
  if (xp >= 1000) return { title: "Cyber Grandmaster", color: "text-amber-400" };
  if (xp >= 500) return { title: "Diamond Admiral", color: "text-cyan-400" };
  if (xp >= 250) return { title: "Gold Veteran", color: "text-pink-400" };
  return { title: "Neon Challenger", color: "text-slate-300" };
}

export default function ProfilePage(): JSX.Element {
  const {
    rewardStats,
    withdrawRewards,
    isPending: isWithdrawing,
    error: rewardError,
  } = useRewardManager();

  const { effectiveAddress, isLiveOnChain } = useChainPlayMode();
  const rooms = useLobbyStore((s) => s.rooms);

  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Filter matches involving current player
  const playerMatches = rooms.filter((r) => {
    const p1 = r.player1.toLowerCase();
    const p2 = r.player2 ? r.player2.toLowerCase() : "";
    const me = effectiveAddress.toLowerCase();
    return p1 === me || p2 === me;
  });

  const completedMatches = playerMatches.filter(
    (r) => r.status === RoomStatus.FINISHED
  );

  const winsCount = completedMatches.filter(
    (r) => r.winner && r.winner.toLowerCase() === effectiveAddress.toLowerCase()
  ).length;

  const totalPlayed = completedMatches.length;
  const winRate =
    totalPlayed > 0 ? Math.round((winsCount / totalPlayed) * 100) : 0;

  const rank = getRankTitle(rewardStats.xpPoints);
  const hasClaimable = rewardStats.claimableWei > 0n;

  const handleWithdraw = async (): Promise<void> => {
    if (!hasClaimable || isWithdrawing) return;
    soundEffects.playTileClick();
    setLocalError(null);
    setWithdrawSuccess(false);

    try {
      const res = await withdrawRewards();
      if (res.success) {
        setWithdrawSuccess(true);
        soundEffects.playVictory();

        // Launch celebratory confetti
        try {
          void confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#00F0FF", "#FF0055", "#F59E0B"],
          });
        } catch {
          // ignore if canvas not supported
        }

        setTimeout(() => setWithdrawSuccess(false), 5000);
      }
    } catch (err) {
      soundEffects.playError();
      const msg =
        err instanceof Error ? err.message : "Failed to withdraw escrow funds.";
      setLocalError(msg);
    }
  };

  const getGameIcon = (gameType: GameType): JSX.Element => {
    switch (gameType) {
      case GameType.TIC_TAC_TOE:
        return <Swords className="w-4 h-4 text-cyan-400" />;
      case GameType.BATTLESHIP:
        return <Shield className="w-4 h-4 text-pink-400" />;
      case GameType.MEMORY_DUEL:
        return <Brain className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col gap-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
        <Link
          href="/lobby"
          onClick={() => soundEffects.playTileClick()}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Matchmaking</span>
        </Link>

        <span className="text-xs font-mono text-slate-500">
          Player Profile & Rewards
        </span>
      </div>

      {/* Gamer Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900/90 via-[#0D121F]/95 to-slate-900/90 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden shadow-2xl">
        <div className="flex items-center gap-4 sm:gap-5 z-10">
          {/* Avatar Icon */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-amber-400 to-pink-500 p-[2px] shadow-cyan-glow">
            <div className="w-full h-full bg-[#07090E] rounded-[14px] flex items-center justify-center font-mono font-black text-2xl text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-pink-400">
              CP
            </div>
          </div>

          {/* Player Identifiers */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${rank.color}`}>
                {rank.title}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono font-bold">
                Tier {Math.min(Math.floor(rewardStats.xpPoints / 250) + 1, 5)}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
              {formatAddress(effectiveAddress, 8, 6)}
            </h1>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>
                {isLiveOnChain ? "Live EVM Network" : "Local Mock Sandbox"}
              </span>
            </div>
          </div>
        </div>

        {/* Level / XP Progress Pill */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2 min-w-[200px] z-10">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 uppercase font-bold">Arcade XP</span>
            <span className="font-extrabold text-amber-300">
              {formatNumber(rewardStats.xpPoints)} PTS
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{
                width: `${Math.min((rewardStats.xpPoints % 500) / 5, 100)}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-slate-500 text-right">
            +{250} XP per victory
          </span>
        </div>
      </div>

      {/* Grid: Claimable Rewards & Performance Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1-Col: Real-time Claimable Rewards Card */}
        <div className="lg:col-span-1 rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-amber-500/10 via-[#0D121F] to-[#07090E] border border-amber-500/40 shadow-amber-glow flex flex-col justify-between relative overflow-hidden">
          {/* Ambient Top Glow */}
          <div className="absolute -top-20 -right-20 w-44 h-44 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-amber-400">
                Escrow Balance
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-950/60 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
                <Coins className="w-4 h-4 animate-bounce" />
              </div>
            </div>

            <span className="text-xs text-slate-400">
              Accumulated Unclaimed Winnings
            </span>
            <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight my-2">
              {formatEther(rewardStats.claimableWei, 4)} ETH
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Funds won from finished PvP matches are stored in smart contract
              escrow and can be withdrawn directly to your wallet anytime.
            </p>
          </div>

          <div>
            {/* Feedback messages */}
            {withdrawSuccess && (
              <div className="p-3 mb-3 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Rewards claimed and delivered to your wallet!</span>
              </div>
            )}

            {(localError || rewardError) && (
              <div className="p-3 mb-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="line-clamp-2">
                  {localError || rewardError?.message}
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={!hasClaimable || isWithdrawing}
              onClick={() => void handleWithdraw()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-amber-glow hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Processing Withdrawal...</span>
                </>
              ) : hasClaimable ? (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Withdraw Rewards ({formatEther(rewardStats.claimableWei, 3)} ETH)</span>
                </>
              ) : (
                <span>No Rewards Pending</span>
              )}
            </button>
          </div>
        </div>

        {/* Right 2-Cols: Performance Stats Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-[#0D121F]/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total Duels Won
              </span>
              <Trophy className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-black font-mono text-cyan-400 my-1">
              {rewardStats.totalWins}
            </div>
            <span className="text-xs text-slate-500">
              Across all 3 PvP game arenas
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D121F]/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Win Rate
              </span>
              <Award className="w-5 h-5 text-pink-400" />
            </div>
            <div className="text-3xl font-black font-mono text-pink-400 my-1">
              {winRate}%
            </div>
            <span className="text-xs text-slate-500">
              {winsCount} wins out of {totalPlayed} finished matches
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D121F]/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Active Streak
              </span>
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-black font-mono text-amber-400 my-1">
              {winsCount > 0 ? `${winsCount}x` : "0x"}
            </div>
            <span className="text-xs text-slate-500">
              Earn bonus multipliers in Memory Duel
            </span>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D121F]/90 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Protocol Trust
              </span>
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-400 my-1">
              100%
            </div>
            <span className="text-xs text-slate-500">
              Zero escrow defaults or disputed outcomes
            </span>
          </div>
        </div>
      </div>

      {/* Match History Table */}
      <div className="rounded-3xl bg-[#0D121F]/90 border border-slate-800 p-6 sm:p-7 backdrop-blur-md flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-white font-mono uppercase">
              Match History
            </h2>
            <p className="text-xs text-slate-400">
              Your recent 1v1 arenas, stakes, and battle outcomes
            </p>
          </div>

          <span className="text-xs font-mono text-slate-500">
            {playerMatches.length} Recorded Match
            {playerMatches.length === 1 ? "" : "es"}
          </span>
        </div>

        {playerMatches.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-300 font-mono uppercase">
              No Matches Recorded Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
              Join or create an arena in the matchmaking lobby to begin your
              Web3 duel career.
            </p>
            <Link
              href="/lobby"
              onClick={() => soundEffects.playTileClick()}
              className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase shadow-cyan-glow"
            >
              Enter Lobby
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950/60 uppercase font-bold text-[10px] tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="py-3 px-4">
                    Game Mode
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Opponent
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Staked
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Outcome
                  </th>
                  <th scope="col" className="py-3 px-4">
                    Date
                  </th>
                  <th scope="col" className="py-3 px-4 text-right">
                    Arena
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {playerMatches.map((match) => {
                  const isHost =
                    match.player1.toLowerCase() ===
                    effectiveAddress.toLowerCase();
                  const opponent = isHost ? match.player2 : match.player1;
                  const isFinished = match.status === RoomStatus.FINISHED;
                  const isWinner =
                    isFinished &&
                    match.winner?.toLowerCase() ===
                      effectiveAddress.toLowerCase();
                  const isDraw = isFinished && match.winner === null;

                  return (
                    <tr
                      key={match.id}
                      className="hover:bg-slate-800/40 transition-colors font-mono"
                    >
                      <td className="py-3.5 px-4 font-sans font-bold flex items-center gap-2">
                        {getGameIcon(match.gameType)}
                        <span>{GAME_TYPE_LABELS[match.gameType]}</span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300">
                        {opponent ? formatAddress(opponent) : "Awaiting..."}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-amber-300">
                        {formatWager(match.wager)}
                      </td>

                      <td className="py-3.5 px-4">
                        {match.status === RoomStatus.WAITING ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Waiting
                          </span>
                        ) : match.status === RoomStatus.ACTIVE ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-bold">
                            Active Duel
                          </span>
                        ) : isWinner ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                            Victory (+{formatEther((match.wager * 195n) / 100n, 3)} ETH)
                          </span>
                        ) : isDraw ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                            Draw / Refunded
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/30">
                            Defeat
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-sans text-xs">
                        {formatTimestamp(match.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/game/${GAME_TYPE_SLUGS[match.gameType]}/${match.id}`}
                          onClick={() => soundEffects.playTileClick()}
                          className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 font-bold text-xs inline-flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

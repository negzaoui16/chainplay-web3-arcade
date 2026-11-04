"use client";

/**
 * ChainPlay - Memory Duel Streak Scoreboard
 *
 * Implements:
 * - Live pair counts: P1 (Cyan) vs P2 (Magenta)
 * - Remaining pairs counter (e.g. 8 - matched = 3 remaining)
 * - Combo streak multiplier (1x, 2x, 3x...)
 * - Pulsing dynamic combo badge: "EXTRA TURN! ⚡"
 * - High-craft cyberpunk layout with progress bar
 *
 * Zero `any` types. Strict TypeScript.
 */

import React from "react";
import { Sparkles, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface StreakScoreboardProps {
  /**
   * Total points accumulated by Player 1
   */
  readonly p1Score: number;

  /**
   * Total points accumulated by Player 2
   */
  readonly p2Score: number;

  /**
   * Number of token pairs matched by Player 1 (0 to 8)
   */
  readonly p1Pairs: number;

  /**
   * Number of token pairs matched by Player 2 (0 to 8)
   */
  readonly p2Pairs: number;

  /**
   * Total pairs in match (default: 8)
   */
  readonly totalPairs?: number;

  /**
   * Current active streak multiplier (starts at 1, increments on consecutive matches)
   */
  readonly streakMultiplier: number;

  /**
   * Address of Player 1
   */
  readonly player1Address?: string | null;

  /**
   * Address of Player 2
   */
  readonly player2Address?: string | null;

  /**
   * Whether it is currently the active local user's turn
   */
  readonly isMyTurn: boolean;

  /**
   * Whether local user is Player 1
   */
  readonly isUserP1: boolean;

  /**
   * Whether local user is Player 2
   */
  readonly isUserP2: boolean;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

export function StreakScoreboard({
  p1Score,
  p2Score,
  p1Pairs,
  p2Pairs,
  totalPairs = 8,
  streakMultiplier,
  isMyTurn,
  isUserP1,
  isUserP2,
  className = "",
}: StreakScoreboardProps): JSX.Element {
  const totalMatched = p1Pairs + p2Pairs;
  const remainingPairs = Math.max(0, totalPairs - totalMatched);

  const hasActiveStreak = streakMultiplier > 1;

  return (
    <div
      className={`w-full max-w-xl mx-auto rounded-2xl bg-[#0B0F1C]/80 backdrop-blur-md border border-slate-800/90 p-3.5 sm:p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden ${className}`}
    >
      {/* Ambient background glow if streak active */}
      {hasActiveStreak && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-amber-400/15 blur-2xl pointer-events-none" />
      )}

      {/* Top Row: P1 Pairs | Remaining Pairs | P2 Pairs */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Player 1 (Cyan) */}
        <div
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all ${
            isUserP1 && isMyTurn
              ? "bg-cyan-950/40 border-cyan-500/60 shadow-cyan-glow"
              : "bg-slate-900/50 border-slate-800/80"
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
              <span>P1 Pairs</span>
              {isUserP1 && (
                <span className="text-[8px] px-1 rounded bg-cyan-500/20 text-cyan-300">
                  YOU
                </span>
              )}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono font-black text-xl sm:text-2xl text-cyan-300">
                {p1Pairs}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({p1Score} pts)
              </span>
            </div>
          </div>
        </div>

        {/* Center: Remaining Pairs & Combo Streak Badge */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-extrabold text-slate-300">
              {remainingPairs}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Remaining
            </span>
          </div>

          {/* Dynamic Combo Streak Badge */}
          <AnimatePresence mode="wait">
            {hasActiveStreak ? (
              <motion.div
                key={`streak-${streakMultiplier}`}
                initial={{ scale: 0.8, opacity: 0, y: 5 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: -5 }}
                className="mt-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-mono font-black text-[10px] uppercase tracking-wider shadow-amber-glow animate-pulse flex items-center gap-1"
              >
                <Flame className="w-3 h-3 text-red-600 animate-bounce" />
                <span>EXTRA TURN! ⚡ ({streakMultiplier}x)</span>
              </motion.div>
            ) : (
              <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-slate-500" />
                <span>1x Combo</span>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Player 2 (Magenta) */}
        <div
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-right ${
            isUserP2 && isMyTurn
              ? "bg-pink-950/40 border-pink-500/60 shadow-magenta-glow"
              : "bg-slate-900/50 border-slate-800/80"
          }`}
        >
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1">
              {isUserP2 && (
                <span className="text-[8px] px-1 rounded bg-pink-500/20 text-pink-300">
                  YOU
                </span>
              )}
              <span>P2 Pairs</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">
                ({p2Score} pts)
              </span>
              <span className="font-mono font-black text-xl sm:text-2xl text-pink-300">
                {p2Pairs}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar: Total 8 Pairs */}
      <div className="w-full flex flex-col gap-1">
        <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800/80 flex">
          {/* P1 Progress */}
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
            style={{ width: `${(p1Pairs / totalPairs) * 100}%` }}
          />
          {/* Remaining un-matched gap */}
          <div
            className="h-full bg-transparent"
            style={{ width: `${(remainingPairs / totalPairs) * 100}%` }}
          />
          {/* P2 Progress */}
          <div
            className="h-full bg-gradient-to-r from-pink-400 to-pink-600 transition-all duration-500"
            style={{ width: `${(p2Pairs / totalPairs) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
          <span>{p1Pairs} / 8 matched</span>
          <span>Target: 5 pairs for win</span>
          <span>{p2Pairs} / 8 matched</span>
        </div>
      </div>
    </div>
  );
}

export default StreakScoreboard;

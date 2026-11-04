"use client";

/**
 * ChainPlay - 1v1 Cyberpunk Player HUD
 *
 * Provides:
 * - Player 1 (Cyan #00F0FF) and Player 2 (Magenta #FF0055) avatar badges
 * - Staked wager amount display with token denomination
 * - Active Turn Indicator: "YOUR TURN" (pulsing cyan glow) vs "OPPONENT'S TURN" (pulsing magenta glow)
 * - Animated SVG circular 60-second countdown timer with stroke-dashoffset transition
 * - Color shift based on urgency (>30s Cyan, 11-30s Amber, <=10s Neon Magenta)
 * - 60s Timeout Forfeit CTA when opponent runs out of time
 *
 * Zero `any` types. Strict TypeScript.
 */

import React from "react";
import {
  User,
  Bot,
  Coins,
  Zap,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";
import { formatAddress, formatWager, formatCountdown } from "@/lib/utils/formatters";
import { MOCK_BOT_ADDRESS } from "@/store/useAppStore";
import { soundEffects } from "@/lib/utils/soundEffects";

export type TurnPlayer = "player1" | "player2";

export interface PlayerHudProps {
  /**
   * Address of Player 1 (Game Host/Creator)
   */
  readonly player1Address: string;

  /**
   * Address of Player 2 (Challenger/Joiner or Bot)
   */
  readonly player2Address?: string | null;

  /**
   * Currently connected or active user address
   */
  readonly currentUserAddress: string;

  /**
   * Staked wager amount in wei
   */
  readonly wager: bigint;

  /**
   * Which player currently holds the active turn
   */
  readonly currentTurn: TurnPlayer;

  /**
   * Remaining seconds on active player's turn clock (0 to 60)
   */
  readonly timeRemaining: number;

  /**
   * Total seconds per turn (default: 60)
   */
  readonly maxTurnTime?: number;

  /**
   * Whether match has concluded
   */
  readonly isGameOver?: boolean;

  /**
   * Optional custom game status badge text (e.g. "MATCH IN PROGRESS")
   */
  readonly gameStatusText?: string;

  /**
   * Whether opponent is the smart bot
   */
  readonly isBotOpponent?: boolean;

  /**
   * Callback fired when current player claims a timeout forfeit victory
   */
  readonly onClaimTimeout?: () => void;

  /**
   * Pending state for timeout claim transaction
   */
  readonly isClaimingTimeout?: boolean;

  /**
   * Optional custom wrapper class name
   */
  readonly className?: string;
}

export function PlayerHud({
  player1Address,
  player2Address,
  currentUserAddress,
  wager,
  currentTurn,
  timeRemaining,
  maxTurnTime = 60,
  isGameOver = false,
  gameStatusText,
  isBotOpponent = false,
  onClaimTimeout,
  isClaimingTimeout = false,
  className = "",
}: PlayerHudProps): JSX.Element {
  const normCurrent = currentUserAddress.toLowerCase().trim();
  const normP1 = player1Address.toLowerCase().trim();
  const normP2 = player2Address?.toLowerCase().trim() ?? "";

  const isUserP1 = normCurrent !== "" && normCurrent === normP1;
  const isUserP2 = normCurrent !== "" && normCurrent === normP2;

  const isCurrentUsersTurn =
    (currentTurn === "player1" && isUserP1) ||
    (currentTurn === "player2" && isUserP2);

  const isOpponentBot =
    isBotOpponent ||
    normP2 === MOCK_BOT_ADDRESS.toLowerCase() ||
    normP2 === "bot" ||
    normP2 === "";

  // Circular timer calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius; // ~175.93
  const safeMaxTime = maxTurnTime > 0 ? maxTurnTime : 60;
  const clampedTime = Math.max(0, Math.min(safeMaxTime, timeRemaining));
  const progressRatio = clampedTime / safeMaxTime;
  const strokeOffset = circumference * (1 - progressRatio);

  // Dynamic color for countdown urgency
  let timerColor = "#00F0FF"; // Cyber Cyan
  let timerTextClass = "text-cyan-400";
  if (clampedTime <= 10) {
    timerColor = "#FF0055"; // Neon Magenta
    timerTextClass = "text-rose-400 animate-pulse";
  } else if (clampedTime <= 30) {
    timerColor = "#F59E0B"; // Amber Glow
    timerTextClass = "text-amber-400";
  }

  // Timeout claim eligibility:
  // Can claim if time has run out, game is not over, and it's the OPPONENT'S turn
  const canClaimTimeout =
    !isGameOver &&
    clampedTime <= 0 &&
    !isCurrentUsersTurn &&
    typeof onClaimTimeout === "function";

  return (
    <div
      className={`w-full bg-[#0D121F]/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Background ambient neon glow based on turn */}
      <div
        className={`absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-32 blur-3xl pointer-events-none opacity-20 transition-all duration-700 ${
          currentTurn === "player1" ? "bg-cyan-500" : "bg-pink-500"
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* ======================================================== */}
        {/* Left: Player 1 (Cyber Cyan #00F0FF)                      */}
        {/* ======================================================== */}
        <div
          className={`flex items-center gap-3.5 p-3 rounded-xl transition-all duration-300 w-full md:w-auto ${
            currentTurn === "player1" && !isGameOver
              ? "bg-cyan-950/40 border border-cyan-500/60 shadow-cyan-glow"
              : "bg-slate-900/40 border border-slate-800/80"
          }`}
        >
          {/* Cyan Avatar Badge */}
          <div className="relative">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                currentTurn === "player1" && !isGameOver
                  ? "bg-cyan-500/20 border-2 border-cyan-400 shadow-cyan-glow scale-105"
                  : "bg-slate-800/80 border border-cyan-500/40"
              }`}
            >
              <User className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded bg-cyan-400 text-black font-mono font-black text-[9px] shadow-sm">
              P1
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-cyan-300 tracking-wide">
                {formatAddress(player1Address)}
              </span>
              {isUserP1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/30 border border-cyan-400 text-cyan-200 text-[10px] font-extrabold uppercase tracking-wider">
                  YOU
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                <Coins className="w-3 h-3 text-cyan-400" />
                <span>Staked: {formatWager(wager)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* Center: Turn Status, Countdown Ring & Timeout Action     */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center justify-center gap-2.5">
          {/* Active Turn Badge */}
          {isGameOver ? (
            <div className="px-4 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-extrabold text-xs tracking-wider uppercase">
              {gameStatusText || "MATCH CONCLUDED"}
            </div>
          ) : (
            <motion.div
              key={currentTurn}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase flex items-center gap-2 border transition-all ${
                isCurrentUsersTurn
                  ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-cyan-glow animate-pulse"
                  : "bg-pink-500/20 border-pink-500/80 text-pink-300 shadow-magenta-glow"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isCurrentUsersTurn ? "YOUR TURN" : "OPPONENT'S TURN"}</span>
            </motion.div>
          )}

          {/* Circular Countdown Timer */}
          {!isGameOver && (
            <div className="relative flex items-center justify-center">
              <svg
                width="72"
                height="72"
                viewBox="0 0 72 72"
                className="transform -rotate-90"
              >
                {/* Background Ring */}
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke="#1E293B"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Animated Progress Ring */}
                <circle
                  cx="36"
                  cy="36"
                  r={radius}
                  stroke={timerColor}
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500 ease-linear"
                />
              </svg>

              {/* Center Countdown Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={`font-mono text-sm font-extrabold tracking-tight ${timerTextClass}`}
                >
                  {formatCountdown(clampedTime)}
                </span>
                <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-widest">
                  TIME
                </span>
              </div>
            </div>
          )}

          {/* Forfeit Victory Claim Button (if opponent timed out) */}
          {canClaimTimeout && (
            <motion.button
              type="button"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={isClaimingTimeout}
              onClick={() => {
                soundEffects.playVictory();
                onClaimTimeout?.();
              }}
              className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 hover:from-amber-400 hover:to-rose-400 text-black font-black text-xs uppercase tracking-wider shadow-amber-glow animate-pulse flex items-center gap-2 border border-amber-300 disabled:opacity-50"
            >
              <Award className="w-4 h-4" />
              <span>
                {isClaimingTimeout
                  ? "Claiming Forfeit..."
                  : "Claim Forfeit Victory (60s Timeout)"}
              </span>
            </motion.button>
          )}
        </div>

        {/* ======================================================== */}
        {/* Right: Player 2 (Neon Magenta #FF0055)                   */}
        {/* ======================================================== */}
        <div
          className={`flex items-center gap-3.5 p-3 rounded-xl transition-all duration-300 w-full md:w-auto justify-end md:justify-start ${
            currentTurn === "player2" && !isGameOver
              ? "bg-pink-950/40 border border-pink-500/60 shadow-magenta-glow"
              : "bg-slate-900/40 border border-slate-800/80"
          }`}
        >
          {/* Details */}
          <div className="flex flex-col text-right md:text-right">
            <div className="flex items-center justify-end gap-2">
              {isUserP2 && (
                <span className="px-1.5 py-0.2 rounded-full bg-pink-500/30 border border-pink-400 text-pink-200 text-[10px] font-extrabold uppercase tracking-wider">
                  YOU
                </span>
              )}
              <span className="font-mono font-bold text-sm text-pink-300 tracking-wide">
                {isOpponentBot
                  ? "Smart Bot 🤖"
                  : player2Address
                  ? formatAddress(player2Address)
                  : "Challenger"}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 mt-1">
              <span className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
                <Coins className="w-3 h-3 text-pink-400" />
                <span>Staked: {formatWager(wager)}</span>
              </span>
            </div>
          </div>

          {/* Magenta Avatar Badge */}
          <div className="relative">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                currentTurn === "player2" && !isGameOver
                  ? "bg-pink-500/20 border-2 border-pink-400 shadow-magenta-glow scale-105"
                  : "bg-slate-800/80 border border-pink-500/40"
              }`}
            >
              {isOpponentBot ? (
                <Bot className="w-6 h-6 text-pink-400" />
              ) : (
                <User className="w-6 h-6 text-pink-400" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded bg-pink-500 text-white font-mono font-black text-[9px] shadow-sm">
              P2
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerHud;
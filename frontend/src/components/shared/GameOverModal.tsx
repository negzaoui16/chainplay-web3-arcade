"use client";

/**
 * ChainPlay - High-Craft Game Over Modal
 *
 * Displays match outcome with cyberpunk arcade visual aesthetics:
 * - Victory: Canvas confetti explosion, upbeat fanfare arpeggio, trophy badge
 * - Defeat: Low defeat tone, red/magenta styling, encouragement
 * - Draw: Stalemate indicator, split pot details
 *
 * Economics breakdown:
 * - Staked amount per player
 * - Total gross pot (2x wager)
 * - Protocol fee (2.5%)
 * - Net payout to winner
 * - XP progression earned
 *
 * Actions:
 * - "Play Again" instant rematch
 * - "Back to Lobby" room selector
 * - "Withdraw Winnings" direct escrow claim integration via useRewardManager
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Skull,
  Scale,
  Coins,
  Sparkles,
  RotateCcw,
  Home,
  CheckCircle2,
  Loader2,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { formatWager, formatAddress } from "@/lib/utils/formatters";
import { PLATFORM_FEE_BPS, BPS_DENOMINATOR } from "@/config/constants";
import { soundEffects } from "@/lib/utils/soundEffects";
import { useRewardManager } from "@/hooks/useRewardManager";

export type GameOutcome = "victory" | "defeat" | "draw";

export interface GameOverModalProps {
  /**
   * Whether the modal is actively visible
   */
  readonly isOpen: boolean;

  /**
   * Game outcome relative to the current player
   */
  readonly outcome: GameOutcome;

  /**
   * Address of the winning player (or null on draw)
   */
  readonly winnerAddress?: string | null;

  /**
   * Address of current player for comparison
   */
  readonly currentUserAddress?: string;

  /**
   * Base stake amount per player in wei
   */
  readonly wager: bigint;

  /**
   * XP points awarded for this match
   */
  readonly xpEarned?: number;

  /**
   * Human-readable conclusion reason (e.g. "3 in a row", "All enemy ships sunk", "Opponent timeout forfeit")
   */
  readonly reason?: string;

  /**
   * Callback fired on "Play Again" CTA
   */
  readonly onPlayAgain?: () => void;

  /**
   * Callback fired on "Back to Lobby" CTA
   */
  readonly onBackToLobby?: () => void;

  /**
   * Callback fired when modal is dismissed
   */
  readonly onClose?: () => void;
}

export function GameOverModal({
  isOpen,
  outcome,
  winnerAddress,
  currentUserAddress,
  wager,
  xpEarned,
  reason,
  onPlayAgain,
  onBackToLobby,
  onClose,
}: GameOverModalProps): JSX.Element | null {
  const { withdrawRewards, isPending: isWithdrawing } = useRewardManager();
  const [withdrawnSuccess, setWithdrawnSuccess] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Trigger celebration or defeat audio + confetti
  useEffect(() => {
    if (!isOpen) {
      setWithdrawnSuccess(false);
      setWithdrawError(null);
      return;
    }

    if (outcome === "victory") {
      soundEffects.playVictory();

      // Trigger Confetti Blast
      if (typeof window !== "undefined") {
        try {
          void confetti({
            particleCount: 100,
            spread: 75,
            origin: { y: 0.55 },
            colors: ["#00F0FF", "#F59E0B", "#FF0055", "#10B981"],
          });

          // Second burst after 300ms
          setTimeout(() => {
            void confetti({
              particleCount: 50,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors: ["#00F0FF", "#F59E0B"],
            });
            void confetti({
              particleCount: 50,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors: ["#FF0055", "#10B981"],
            });
          }, 300);
        } catch {
          // ignore
        }
      }
    } else if (outcome === "defeat") {
      soundEffects.playDefeat();
    } else {
      soundEffects.playTileClick();
    }
  }, [isOpen, outcome]);

  if (!isOpen) {
    return null;
  }

  // Calculate Pot Economics
  const grossPot = wager * 2n;
  const platformFee =
    (grossPot * BigInt(PLATFORM_FEE_BPS)) / BigInt(BPS_DENOMINATOR);
  const netPayout = grossPot > platformFee ? grossPot - platformFee : 0n;

  // Default XP if not explicitly supplied
  const effectiveXp =
    xpEarned ?? (outcome === "victory" ? 250 : outcome === "draw" ? 100 : 50);

  const handleWithdraw = async (): Promise<void> => {
    setWithdrawError(null);
    try {
      soundEffects.playTileClick();
      const res = await withdrawRewards();
      if (res.success) {
        setWithdrawnSuccess(true);
        soundEffects.playVictory();
      }
    } catch (err) {
      setWithdrawError(
        err instanceof Error ? err.message : "Failed to claim rewards."
      );
      soundEffects.playError();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (onClose) {
              soundEffects.playTileClick();
              onClose();
            }
          }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Card Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-lg rounded-3xl bg-[#0D121F] border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Ambient Glow */}
          <div
            className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 blur-3xl pointer-events-none opacity-25 ${
              outcome === "victory"
                ? "bg-amber-400"
                : outcome === "defeat"
                ? "bg-rose-500"
                : "bg-cyan-500"
            }`}
          />

          {/* Header Badge & Title */}
          <div className="flex flex-col items-center text-center">
            {outcome === "victory" && (
              <div className="relative mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-[2px] shadow-amber-glow animate-bounce">
                  <div className="w-full h-full bg-[#07090E] rounded-[14px] flex items-center justify-center">
                    <Trophy className="w-10 h-10 text-amber-400" />
                  </div>
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-300 animate-spin" />
              </div>
            )}

            {outcome === "defeat" && (
              <div className="mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-[2px] shadow-[0_0_25px_rgba(244,63,94,0.4)]">
                  <div className="w-full h-full bg-[#07090E] rounded-[14px] flex items-center justify-center">
                    <Skull className="w-10 h-10 text-rose-400" />
                  </div>
                </div>
              </div>
            )}

            {outcome === "draw" && (
              <div className="mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[2px] shadow-cyan-glow">
                  <div className="w-full h-full bg-[#07090E] rounded-[14px] flex items-center justify-center">
                    <Scale className="w-10 h-10 text-cyan-400" />
                  </div>
                </div>
              </div>
            )}

            {/* Title */}
            <h2
              className={`text-3xl sm:text-4xl font-black tracking-wider uppercase font-mono ${
                outcome === "victory"
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  : outcome === "defeat"
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500"
                  : "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400"
              }`}
            >
              {outcome === "victory"
                ? "VICTORY!"
                : outcome === "defeat"
                ? "DEFEAT"
                : "STALEMATE"}
            </h2>

            {/* Reason text */}
            {reason && (
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{reason}</p>
            )}
          </div>

          {/* Economics Pot Breakdown Card */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex flex-col gap-2.5">
            {winnerAddress && (
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Victor</span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {currentUserAddress &&
                  winnerAddress.toLowerCase() ===
                    currentUserAddress.toLowerCase()
                    ? "You (Winner)"
                    : formatAddress(winnerAddress)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Player Stake (x2)</span>
              <span className="font-mono text-slate-200">
                {formatWager(wager)} each
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Gross Pot Size</span>
              <span className="font-mono text-slate-200">
                {formatWager(grossPot)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Platform Fee (2.5%)</span>
              <span className="font-mono text-slate-400">
                -{formatWager(platformFee)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {outcome === "victory" ? "Your Net Winnings" : "Winner Payout"}
              </span>
              <span
                className={`font-mono font-black text-base ${
                  outcome === "victory"
                    ? "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    : "text-slate-300"
                }`}
              >
                +{formatWager(netPayout)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>Experience Points</span>
              </span>
              <span className="font-mono font-bold text-cyan-300">
                +{effectiveXp} XP
              </span>
            </div>
          </div>

          {/* Direct Withdraw CTA if Won */}
          {outcome === "victory" && (
            <div className="mt-4">
              {withdrawnSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Winnings Claimed & Transferred to Wallet!</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isWithdrawing}
                  onClick={handleWithdraw}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider shadow-amber-glow hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Claiming Winnings...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      <span>Instant Claim {formatWager(netPayout)}</span>
                    </>
                  )}
                </button>
              )}

              {withdrawError && (
                <p className="mt-1 text-center text-xs text-rose-400 font-mono">
                  {withdrawError}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            {onPlayAgain && (
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTileClick();
                  onPlayAgain();
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
            )}

            {onBackToLobby ? (
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTileClick();
                  onBackToLobby();
                }}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4 text-slate-400" />
                <span>Back to Lobby</span>
              </button>
            ) : (
              <Link
                href="/lobby"
                onClick={() => soundEffects.playTileClick()}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4 text-slate-400" />
                <span>Back to Lobby</span>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default GameOverModal;
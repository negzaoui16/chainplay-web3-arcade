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
import { soundEffects } from "@/lib/utils/soundEffects";
import { useHederaTokenManager } from "@/hooks/useHederaTokenManager";
import { isAddress } from "viem";

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
   * Identifier of the concluded game match
   */
  readonly gameId?: string;

  /**
   * Game type number (0: TicTacToe, 1: Battleship, 2: MemoryDuel)
   */
  readonly gameType?: number;

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
  gameId,
  gameType = 0,
  onPlayAgain,
  onBackToLobby,
  onClose,
}: GameOverModalProps): JSX.Element | null {
  const {
    claimRewardWithVoucher,
    stakeCptForGame,
    refreshBalances: refreshHederaBalances,
  } = useHederaTokenManager();

  // Hedera on-chain claim state
  const [isClaimingHedera, setIsClaimingHedera] = useState<boolean>(false);
  const [hederaClaimSuccess, setHederaClaimSuccess] = useState<boolean>(false);
  const [hederaTxHash, setHederaTxHash] = useState<string | null>(null);
  const [hederaError, setHederaError] = useState<string | null>(null);

  // Play Again on-chain stake state
  const [isStakingRematch, setIsStakingRematch] = useState<boolean>(false);
  const [rematchError, setRematchError] = useState<string | null>(null);

  // Trigger celebration or defeat audio + confetti
  useEffect(() => {
    if (!isOpen) {
      setHederaClaimSuccess(false);
      setHederaTxHash(null);
      setHederaError(null);
      setIsStakingRematch(false);
      setRematchError(null);
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

  // Default XP if not explicitly supplied
  const effectiveXp =
    xpEarned ?? (outcome === "victory" ? 250 : outcome === "draw" ? 100 : 50);

  const handleClaimHedera = async (): Promise<void> => {
    let playerAddress: string | undefined = undefined;

    // Prioritize currently active account from MetaMask directly
    if (typeof window !== "undefined") {
      const eth = (window as unknown as {
        ethereum?: {
          selectedAddress?: string;
          request?: (args: { method: string }) => Promise<string[]>;
        };
      }).ethereum;

      if (eth?.request) {
        try {
          const accs = await eth.request({ method: "eth_requestAccounts" });
          if (accs && accs[0] && isAddress(accs[0])) {
            playerAddress = accs[0];
          }
        } catch {
          // ignore if user dismissed prompt
        }
      }

      if (!playerAddress && eth?.selectedAddress && isAddress(eth.selectedAddress)) {
        playerAddress = eth.selectedAddress;
      }
    }

    if (!playerAddress && currentUserAddress && isAddress(currentUserAddress)) {
      playerAddress = currentUserAddress;
    }

    if (!playerAddress || !isAddress(playerAddress)) {
      setHederaError("Please connect your MetaMask wallet on Hedera Testnet first.");
      return;
    }
    setHederaError(null);
    setIsClaimingHedera(true);

    try {
      soundEffects.playTileClick();
      // 1. Request EIP-712 voucher signed by Hedera operator
      const res = await fetch("/api/rewards/issue-voucher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: gameId || `chainplay_match_${Date.now()}`,
          gameType: gameType ?? 0,
          player: playerAddress,
          outcome,
        }),
      });

      const data = await res.json();
      if (!data.success || !data.voucher || !data.signature) {
        throw new Error(data.error || "Failed to generate signed reward voucher");
      }

      // 2. Submit on-chain claim to TokenManager on Hedera Testnet
      const claimRes = await claimRewardWithVoucher(
        {
          gameId: data.voucher.gameId,
          gameType: data.voucher.gameType,
          player: data.voucher.player,
          winAmount: BigInt(data.voucher.winAmount),
          participationAmount: BigInt(data.voucher.participationAmount),
          nonce: BigInt(data.voucher.nonce),
          deadline: BigInt(data.voucher.deadline),
        },
        data.signature
      );

      if (claimRes.success && claimRes.txHash) {
        setHederaClaimSuccess(true);
        setHederaTxHash(claimRes.txHash);
        soundEffects.playVictory();
        await refreshHederaBalances();
      } else {
        throw new Error(claimRes.error || "Transaction was rejected or failed on Hedera.");
      }
    } catch (err: unknown) {
      setHederaError(err instanceof Error ? err.message : "Hedera reward claim failed.");
      soundEffects.playError();
    } finally {
      setIsClaimingHedera(false);
    }
  };

  const handlePlayAgainClick = async (): Promise<void> => {
    setRematchError(null);
    setIsStakingRematch(true);
    try {
      soundEffects.playTileClick();
      // Stake 60 CPT on Hedera Testnet via MetaMask for the rematch
      const stakeRes = await stakeCptForGame(60000000000000000000n);
      if (!stakeRes.success) {
        setRematchError(stakeRes.error || "60 CPT stake required for rematch.");
        soundEffects.playError();
        return;
      }
      soundEffects.playMatchChime();
      if (onPlayAgain) {
        onPlayAgain();
      }
    } catch (err) {
      setRematchError(err instanceof Error ? err.message : "Staking failed.");
      soundEffects.playError();
    } finally {
      setIsStakingRematch(false);
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
                {wager > 0n ? formatWager(wager) : "60 CPT"} each
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Gross Pot Size</span>
              <span className="font-mono text-slate-200">
                {grossPot > 0n ? formatWager(grossPot) : "120 CPT"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Platform Fee (0%)</span>
              <span className="font-mono text-slate-400">
                0 CPT
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {outcome === "victory" ? "Your Net Winnings" : "Your Outcome"}
              </span>
              <span
                className={`font-mono font-black text-base ${
                  outcome === "victory"
                    ? "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    : outcome === "defeat"
                    ? "text-rose-400"
                    : "text-slate-300"
                }`}
              >
                {outcome === "victory"
                  ? "+120 CPT"
                  : outcome === "defeat"
                  ? "0 CPT (-60 CPT Staked)"
                  : "0 CPT (Stalemate)"}
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

          {/* ============================================================ */}
          {/* Hedera Testnet CPT Rewards Box (Live On-Chain)               */}
          {/* STRICT RULE: Render ONLY on Victory! Defeat/Draw = 0 CPT     */}
          {/* ============================================================ */}
          {outcome === "victory" && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-b from-[#101726] to-[#0A0E17] border border-cyan-500/40 shadow-cyan-glow/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">
                      Hedera CPT On-Chain Reward
                    </h4>
                    <span className="text-[10px] font-mono text-cyan-300">
                      Hedera Testnet (296) • TokenManager Vault
                    </span>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  +120 CPT
                </span>
              </div>

              {hederaClaimSuccess ? (
                <div className="mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>CPT Tokens Successfully Transferred On-Chain!</span>
                  </div>
                  {hederaTxHash && (
                    <a
                      href={`https://hashscan.io/testnet/transaction/${hederaTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
                    >
                      <span>View on HashScan Testnet ({formatAddress(hederaTxHash)}) ↗</span>
                    </a>
                  )}
                </div>
              ) : (
                <div className="mt-3">
                  <button
                    type="button"
                    disabled={isClaimingHedera}
                    onClick={handleClaimHedera}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-cyan-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isClaimingHedera ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Confirming on Hedera Testnet (MetaMask)...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Claim 120 CPT with MetaMask</span>
                      </>
                    )}
                  </button>

                  {hederaError && (
                    <p className="mt-2 text-center text-[11px] text-rose-400 font-mono">
                      {hederaError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            {onPlayAgain && (
              <button
                type="button"
                disabled={isStakingRematch}
                onClick={handlePlayAgainClick}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-cyan-glow hover:shadow-cyan-glow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isStakingRematch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Staking 60 CPT (MetaMask)...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Play Again (60 CPT)</span>
                  </>
                )}
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
                <span>Back to Home</span>
              </button>
            ) : (
              <Link
                href="/"
                onClick={() => soundEffects.playTileClick()}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4 text-slate-400" />
                <span>Back to Home</span>
              </Link>
            )}
          </div>

          {rematchError && (
            <p className="mt-2 text-center text-xs text-rose-400 font-mono">
              {rematchError}
            </p>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default GameOverModal;
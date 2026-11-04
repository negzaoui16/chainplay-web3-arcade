"use client";

/**
 * ChainPlay - Create Arena Room Modal
 *
 * Provides an interactive modal dialog to create a new 1v1 PvP game arena:
 * - Game type selector tabs (Tic-Tac-Toe, Battleship, Memory Duel)
 * - Preset ETH wager chips (0.01, 0.05, 0.1 ETH) & custom input field
 * - Live prize pot & platform fee calculation (97.5% net winner pot)
 * - Public vs Private room visibility toggle
 * - Integration with `useGameManager.createGame`
 * - Cyberpunk neon aesthetics with Framer Motion animations
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  X,
  Swords,
  Shield,
  Brain,
  Coins,
  Globe,
  Lock,
  Sparkles,
  Loader2,
  AlertCircle,
  Trophy,
} from "lucide-react";
import {
  GameType,
  GAME_TYPE_SLUGS,
} from "@/types/lobby.types";
import { useGameManager } from "@/hooks/useGameManager";
import { soundEffects } from "@/lib/utils/soundEffects";
import { parseEther, formatEther } from "@/lib/utils/formatters";

export interface CreateRoomModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly defaultGameType?: GameType;
  readonly onRoomCreated?: (roomId: string, gameType: GameType) => void;
}

const WAGER_PRESETS: readonly string[] = ["0.01", "0.05", "0.10"];

export function CreateRoomModal({
  isOpen,
  onClose,
  defaultGameType = GameType.TIC_TAC_TOE,
  onRoomCreated,
}: CreateRoomModalProps): JSX.Element | null {
  const router = useRouter();
  const { createGame, isPending, error: contractError } = useGameManager();

  const [selectedGame, setSelectedGame] = useState<GameType>(defaultGameType);
  const [wager, setWager] = useState<string>("0.01");
  const [customWager, setCustomWager] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Sync selected game if prop changes
  useEffect(() => {
    if (isOpen) {
      setSelectedGame(defaultGameType);
      setLocalError(null);
    }
  }, [isOpen, defaultGameType]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape" && isOpen && !isPending) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen) {
    return null;
  }

  const effectiveWager = customWager.trim() !== "" ? customWager : wager;
  const wagerWei = parseEther(effectiveWager);
  const totalPotWei = wagerWei * 2n;
  const winnerNetPotWei = (totalPotWei * 975n) / 1000n; // 2.5% protocol escrow fee

  const handleSelectPreset = (amount: string): void => {
    soundEffects.playTileClick();
    setWager(amount);
    setCustomWager("");
    setLocalError(null);
  };

  const handleCustomWagerChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    setCustomWager(val);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLocalError(null);

    const numericWager = parseFloat(effectiveWager);
    if (isNaN(numericWager) || numericWager <= 0) {
      setLocalError("Please enter a valid stake amount greater than 0 ETH.");
      soundEffects.playError();
      return;
    }

    if (numericWager < 0.001) {
      setLocalError("Minimum stake is 0.001 ETH.");
      soundEffects.playError();
      return;
    }

    try {
      soundEffects.playTileClick();
      const result = await createGame(selectedGame, effectiveWager);

      if (result.gameId) {
        soundEffects.playMatchChime();
        onClose();
        if (onRoomCreated) {
          onRoomCreated(result.gameId, selectedGame);
        } else {
          const slug = GAME_TYPE_SLUGS[selectedGame];
          router.push(`/game/${slug}/${result.gameId}`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create arena.";
      setLocalError(msg);
      soundEffects.playError();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          if (!isPending) onClose();
        }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Dialog Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg rounded-2xl bg-[#0D121F] border border-cyan-500/40 p-6 sm:p-7 shadow-[0_0_50px_rgba(0,240,255,0.25)] text-slate-100 z-10"
      >
        {/* Close Button */}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            soundEffects.playTileClick();
            onClose();
          }}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] flex items-center justify-center shadow-cyan-glow">
            <div className="w-full h-full bg-[#07090E] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-wide text-white font-mono uppercase">
              Create PvP Arena
            </h2>
            <p className="text-xs text-slate-400">
              Stake your wager and wait for a worthy challenger
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
          {/* 1. Game Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Game Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Tic-Tac-Toe */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTileClick();
                  setSelectedGame(GameType.TIC_TAC_TOE);
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-center transition-all ${
                  selectedGame === GameType.TIC_TAC_TOE
                    ? "bg-cyan-500/15 border-cyan-500 text-cyan-300 shadow-cyan-glow"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Swords className="w-5 h-5" />
                <span className="text-xs font-bold">Tic-Tac-Toe</span>
              </button>

              {/* Battleship */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTileClick();
                  setSelectedGame(GameType.BATTLESHIP);
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-center transition-all ${
                  selectedGame === GameType.BATTLESHIP
                    ? "bg-pink-500/15 border-pink-500 text-pink-300 shadow-magenta-glow"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Shield className="w-5 h-5" />
                <span className="text-xs font-bold">Battleship</span>
              </button>

              {/* Memory Duel */}
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTileClick();
                  setSelectedGame(GameType.MEMORY_DUEL);
                }}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border text-center transition-all ${
                  selectedGame === GameType.MEMORY_DUEL
                    ? "bg-amber-500/15 border-amber-500 text-amber-300 shadow-amber-glow"
                    : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Brain className="w-5 h-5" />
                <span className="text-xs font-bold">Memory Duel</span>
              </button>
            </div>
          </div>

          {/* 2. Wager Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Stake per Player (ETH)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Active: {effectiveWager || "0"} ETH
              </span>
            </div>

            {/* Presets Chips */}
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              {WAGER_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all border ${
                    customWager === "" && wager === preset
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-cyan-glow"
                      : "bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {preset} ETH
                </button>
              ))}
            </div>

            {/* Custom Wager Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Or enter custom ETH amount..."
                value={customWager}
                onChange={handleCustomWagerChange}
                disabled={isPending}
                className="w-full py-2.5 pl-3.5 pr-14 rounded-xl bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs font-mono text-white placeholder-slate-500 transition-colors"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-mono font-bold text-slate-400 pointer-events-none">
                ETH
              </span>
            </div>
          </div>

          {/* 3. Prize Pot Preview Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-900/90 to-slate-900/50 border border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Trophy className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Winner Takes All Pot
                </span>
                <p className="text-sm font-mono font-black text-amber-300">
                  {formatEther(winnerNetPotWei, 4)} ETH
                </p>
              </div>
            </div>
            <span className="text-[10px] text-slate-400 font-mono text-right">
              2.5% protocol escrow fee
            </span>
          </div>

          {/* 4. Privacy Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              {isPrivate ? (
                <Lock className="w-4 h-4 text-pink-400" />
              ) : (
                <Globe className="w-4 h-4 text-cyan-400" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">
                  {isPrivate ? "Private Match" : "Public Match"}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isPrivate
                    ? "Accessible only via direct invite link"
                    : "Visible to all players on the global lobby"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                setIsPrivate((p) => !p);
              }}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                isPrivate ? "bg-pink-500" : "bg-slate-700"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                  isPrivate ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Error Message */}
          {(localError || contractError) && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span className="line-clamp-2">
                {localError || contractError?.message}
              </span>
            </div>
          )}

          {/* Action CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all duration-200 shadow-cyan-glow hover:shadow-cyan-glow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Staking & Creating Arena...</span>
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  <span>Create Arena & Stake {effectiveWager} ETH</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateRoomModal;

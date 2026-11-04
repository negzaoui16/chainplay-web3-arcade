"use client";

/**
 * ChainPlay - Game Selector Hero Cards
 *
 * Displays 3 immersive cyberpunk hero cards for:
 * 1. Tic-Tac-Toe (Cyan - High Speed XO)
 * 2. Battleship (Magenta - ZK Naval Warfare)
 * 3. Memory Duel (Amber - Cyber Glyph Matrix)
 *
 * Each card features:
 * - Glowing cyberpunk gradient borders and hover lift animations
 * - Game mode badge and feature bullet points
 * - "Quick Play" (instant matchmaking or auto-create)
 * - "Create Room" (opens wager customization modal)
 *
 * Zero `any` types. Strict TypeScript.
 */

import React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Swords,
  Shield,
  Brain,
  Zap,
  Clock,
  Sparkles,
  PlusCircle,
  Play,
} from "lucide-react";
import { GameType, GAME_TYPE_SLUGS } from "@/types/lobby.types";
import { useLobbyStore } from "@/store/useLobbyStore";
import { useGameManager } from "@/hooks/useGameManager";
import { soundEffects } from "@/lib/utils/soundEffects";

export interface GameSelectorCardsProps {
  readonly onOpenCreateModal?: (gameType: GameType) => void;
  readonly className?: string;
}

interface GameCardConfig {
  readonly gameType: GameType;
  readonly title: string;
  readonly subtitle: string;
  readonly badge: string;
  readonly accentColor: "cyan" | "magenta" | "amber";
  readonly icon: React.ElementType;
  readonly features: readonly string[];
  readonly minWager: string;
  readonly averageDuration: string;
  readonly gradientBorder: string;
  readonly glowClass: string;
}

const GAME_CARDS: readonly GameCardConfig[] = [
  {
    gameType: GameType.TIC_TAC_TOE,
    title: "Tic-Tac-Toe",
    subtitle: "Classic 3x3 High-Speed Tactical Duel",
    badge: "LIGHTNING FAST",
    accentColor: "cyan",
    icon: Swords,
    features: [
      "Real-time 60-second move timer",
      "Dynamic SVG laser strike winlines",
      "Instant smart contract payout",
    ],
    minWager: "0.01 ETH",
    averageDuration: "1-2 Mins",
    gradientBorder: "from-cyan-500/80 via-blue-500/50 to-cyan-500/20",
    glowClass: "group-hover:shadow-[0_0_35px_rgba(0,240,255,0.4)]",
  },
  {
    gameType: GameType.BATTLESHIP,
    title: "Battleship",
    subtitle: "10x10 Cryptographic Naval Warfare",
    badge: "ZK COMMITMENTS",
    accentColor: "magenta",
    icon: Shield,
    features: [
      "Poseidon hash secret fleet commits",
      "Offensive radar & defensive docks",
      "Anti-cheat cryptographic proofs",
    ],
    minWager: "0.05 ETH",
    averageDuration: "3-5 Mins",
    gradientBorder: "from-pink-500/80 via-rose-500/50 to-pink-500/20",
    glowClass: "group-hover:shadow-[0_0_35px_rgba(255,0,85,0.4)]",
  },
  {
    gameType: GameType.MEMORY_DUEL,
    title: "Memory Duel",
    subtitle: "4x4 Cyber Glyph Pattern Matrix",
    badge: "STREAK MULTIPLIER",
    accentColor: "amber",
    icon: Brain,
    features: [
      "Sequential 16-card cyberpunk glyphs",
      "Dynamic streak combos up to 3x",
      "Rapid recall & momentum battles",
    ],
    minWager: "0.01 ETH",
    averageDuration: "2-3 Mins",
    gradientBorder: "from-amber-500/80 via-yellow-500/50 to-amber-500/20",
    glowClass: "group-hover:shadow-[0_0_35px_rgba(245,158,11,0.4)]",
  },
] as const;

export function GameSelectorCards({
  onOpenCreateModal,
  className = "",
}: GameSelectorCardsProps): JSX.Element {
  const router = useRouter();
  const rooms = useLobbyStore((s) => s.rooms);
  const { createGame, isPending } = useGameManager();

  const handleQuickPlay = async (gameType: GameType): Promise<void> => {
    soundEffects.playTileClick();
    const slug = GAME_TYPE_SLUGS[gameType];

    // Check if there is an existing waiting room for this game
    const waitingRoom = rooms.find(
      (r) => r.gameType === gameType && r.status === 0 // RoomStatus.WAITING
    );

    if (waitingRoom) {
      // Navigate to game room
      router.push(`/game/${slug}/${waitingRoom.id}`);
      return;
    }

    // Otherwise trigger instant room creation with default 0.01 ETH
    try {
      const res = await createGame(gameType, "0.01");
      if (res.gameId) {
        router.push(`/game/${slug}/${res.gameId}`);
      }
    } catch {
      // If error occurs (e.g. user cancelled or modal needed), redirect to lobby
      router.push("/lobby");
    }
  };

  const handleCreateRoom = (gameType: GameType): void => {
    soundEffects.playTileClick();
    if (onOpenCreateModal) {
      onOpenCreateModal(gameType);
    } else {
      router.push(`/lobby?create=${GAME_TYPE_SLUGS[gameType]}`);
    }
  };

  return (
    <div className={`w-full max-w-7xl mx-auto ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {GAME_CARDS.map((card, idx) => {
          const Icon = card.icon;
          const openRoomsCount = rooms.filter(
            (r) => r.gameType === card.gameType && r.status === 0
          ).length;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              whileHover={{ y: -6 }}
              className={`group relative rounded-2xl p-[1.5px] bg-gradient-to-b ${card.gradientBorder} ${card.glowClass} transition-all duration-300 flex flex-col`}
            >
              {/* Card Interior */}
              <div className="flex-1 rounded-[15px] bg-[#0D121F] p-6 sm:p-7 flex flex-col justify-between backdrop-blur-xl border border-white/5 relative overflow-hidden">
                {/* Background Ambient Radial Glow */}
                <div
                  className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-opacity duration-300 ${
                    card.accentColor === "cyan"
                      ? "bg-cyan-500/15 group-hover:bg-cyan-500/25"
                      : card.accentColor === "magenta"
                      ? "bg-pink-500/15 group-hover:bg-pink-500/25"
                      : "bg-amber-500/15 group-hover:bg-amber-500/25"
                  }`}
                />

                {/* Header: Badge & Live Rooms Count */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span
                      className={`text-[11px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                        card.accentColor === "cyan"
                          ? "bg-cyan-950/70 text-cyan-300 border-cyan-500/40"
                          : card.accentColor === "magenta"
                          ? "bg-pink-950/70 text-pink-300 border-pink-500/40"
                          : "bg-amber-950/70 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {card.badge}
                    </span>

                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          openRoomsCount > 0
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-slate-600"
                        }`}
                      />
                      <span>
                        {openRoomsCount}{" "}
                        {openRoomsCount === 1 ? "room" : "rooms"}
                      </span>
                    </span>
                  </div>

                  {/* Title and Icon */}
                  <div className="flex items-center gap-3.5 mb-2">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center p-2.5 border shadow-inner ${
                        card.accentColor === "cyan"
                          ? "bg-cyan-950/50 border-cyan-500/50 text-cyan-400 shadow-cyan-glow"
                          : card.accentColor === "magenta"
                          ? "bg-pink-950/50 border-pink-500/50 text-pink-400 shadow-magenta-glow"
                          : "bg-amber-950/50 border-amber-500/50 text-amber-400 shadow-amber-glow"
                      }`}
                    >
                      <Icon className="w-6 h-6 animate-pulse-slow" />
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide font-mono">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium line-clamp-1">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Key Metrics Pill Bar */}
                  <div className="grid grid-cols-2 gap-2 my-5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{card.averageDuration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 font-mono">
                      <Zap
                        className={`w-3.5 h-3.5 shrink-0 ${
                          card.accentColor === "cyan"
                            ? "text-cyan-400"
                            : card.accentColor === "magenta"
                            ? "text-pink-400"
                            : "text-amber-400"
                        }`}
                      />
                      <span>From {card.minWager}</span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <ul className="space-y-2 mb-6">
                    {card.features.map((feature, fIdx) => (
                      <li
                        key={fIdx}
                        className="flex items-start gap-2 text-xs text-slate-300"
                      >
                        <Sparkles
                          className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                            card.accentColor === "cyan"
                              ? "text-cyan-400"
                              : card.accentColor === "magenta"
                              ? "text-pink-400"
                              : "text-amber-400"
                          }`}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => void handleQuickPlay(card.gameType)}
                    className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                      card.accentColor === "cyan"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-glow hover:shadow-cyan-glow-lg"
                        : card.accentColor === "magenta"
                        ? "bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-magenta-glow hover:shadow-magenta-glow-lg"
                        : "bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 shadow-amber-glow hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Quick Play</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreateRoom(card.gameType)}
                    className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-500 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    title="Customize Wager & Create Arena"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Create</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default GameSelectorCards;

"use client";

/**
 * ChainPlay - 3D Perspective Memory Card
 *
 * Implements:
 * - 3D CSS perspective flip animation (`rotateY(180deg)`)
 * - Cyberpunk circuit back face with glowing central core
 * - High-craft Web3 crypto asset faces (ETH, BTC, SOL, LINK, UNI, AAVE, ARB, OP)
 * - Matched neon borders: Cyan (#00F0FF) for P1, Magenta (#FF0055) for P2
 * - Scorer badge for permanently locked matched pairs
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useMemo } from "react";
import { Check, Sparkles } from "lucide-react";
import type { CardItem } from "@/types/memory.types";

export interface MemoryCardProps {
  /**
   * The card data item (id, symbolId, name, icon, isFlipped, isMatched, matchedBy)
   */
  readonly card: CardItem;

  /**
   * Card 0-based grid index (0 to 15)
   */
  readonly index: number;

  /**
   * Whether this card is currently selected (first or second pick of current turn)
   */
  readonly isSelected?: boolean;

  /**
   * Whether the grid turn is temporarily locked (e.g. during 1200ms mismatch window)
   */
  readonly isTurnLocked: boolean;

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
   * Address of Player 1
   */
  readonly player1Address?: string | null;

  /**
   * Address of Player 2
   */
  readonly player2Address?: string | null;

  /**
   * Click handler passing the card's 0-based index
   */
  readonly onClick: (index: number) => void;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

/**
 * Token visual theme configuration
 */
interface TokenBranding {
  symbol: string;
  name: string;
  accentColor: string;
  gradientBg: string;
  borderColor: string;
  textColor: string;
  glowClass: string;
}

const TOKEN_BRANDINGS: Record<number, TokenBranding> = {
  0: {
    symbol: "ETH",
    name: "Ethereum",
    accentColor: "#627EEA",
    gradientBg: "from-indigo-950 via-slate-900 to-[#0e1629]",
    borderColor: "border-[#627EEA]/60",
    textColor: "text-[#627EEA]",
    glowClass: "shadow-[0_0_15px_rgba(98,126,234,0.4)]",
  },
  1: {
    symbol: "BTC",
    name: "Bitcoin",
    accentColor: "#F7931A",
    gradientBg: "from-amber-950 via-slate-900 to-[#221606]",
    borderColor: "border-[#F7931A]/60",
    textColor: "text-[#F7931A]",
    glowClass: "shadow-[0_0_15px_rgba(247,147,26,0.4)]",
  },
  2: {
    symbol: "SOL",
    name: "Solana",
    accentColor: "#14F195",
    gradientBg: "from-purple-950 via-slate-900 to-[#06241a]",
    borderColor: "border-[#14F195]/60",
    textColor: "text-[#14F195]",
    glowClass: "shadow-[0_0_15px_rgba(20,241,149,0.4)]",
  },
  3: {
    symbol: "LINK",
    name: "Chainlink",
    accentColor: "#375BD2",
    gradientBg: "from-blue-950 via-slate-900 to-[#0a183d]",
    borderColor: "border-[#375BD2]/60",
    textColor: "text-sky-400",
    glowClass: "shadow-[0_0_15px_rgba(55,91,210,0.4)]",
  },
  4: {
    symbol: "UNI",
    name: "Uniswap",
    accentColor: "#FF007A",
    gradientBg: "from-pink-950 via-slate-900 to-[#280517]",
    borderColor: "border-[#FF007A]/60",
    textColor: "text-pink-400",
    glowClass: "shadow-[0_0_15px_rgba(255,0,122,0.4)]",
  },
  5: {
    symbol: "AAVE",
    name: "Aave",
    accentColor: "#B6509E",
    gradientBg: "from-fuchsia-950 via-slate-900 to-[#200824]",
    borderColor: "border-[#B6509E]/60",
    textColor: "text-fuchsia-300",
    glowClass: "shadow-[0_0_15px_rgba(182,80,158,0.4)]",
  },
  6: {
    symbol: "ARB",
    name: "Arbitrum",
    accentColor: "#28A0F0",
    gradientBg: "from-cyan-950 via-slate-900 to-[#051c2e]",
    borderColor: "border-[#28A0F0]/60",
    textColor: "text-cyan-400",
    glowClass: "shadow-[0_0_15px_rgba(40,160,240,0.4)]",
  },
  7: {
    symbol: "OP",
    name: "Optimism",
    accentColor: "#FF0420",
    gradientBg: "from-red-950 via-slate-900 to-[#280407]",
    borderColor: "border-[#FF0420]/60",
    textColor: "text-red-400",
    glowClass: "shadow-[0_0_15px_rgba(255,4,32,0.4)]",
  },
};

/**
 * Custom Vector Crypto Icon Components
 */
function CryptoAssetIcon({ symbolId }: { symbolId: number }): JSX.Element {
  switch (symbolId) {
    case 0: // ETH
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          {/* Top Diamond */}
          <polygon points="32,6 50,30 32,40 14,30" fill="#8A92B2" fillOpacity="0.9" />
          <polygon points="32,6 50,30 32,40" fill="#627EEA" />
          {/* Bottom Diamond */}
          <polygon points="32,43 50,32 32,58 14,32" fill="#8A92B2" fillOpacity="0.8" />
          <polygon points="32,43 50,32 32,58" fill="#4559A4" />
        </svg>
      );
    case 1: // BTC
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          <circle cx="32" cy="32" r="26" fill="#F7931A" />
          <text
            x="32"
            y="41"
            fontFamily="Arial, sans-serif"
            fontSize="28"
            fontWeight="900"
            textAnchor="middle"
            fill="#FFFFFF"
          >
            ₿
          </text>
        </svg>
      );
    case 2: // SOL
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          <defs>
            <linearGradient id="solGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00FFA3" />
              <stop offset="100%" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <path
            d="M15 18 L44 18 C46 18 47 19 46 21 L43 25 C42 26 41 27 39 27 L10 27 C8 27 7 26 8 24 L11 20 C12 19 13 18 15 18 Z"
            fill="url(#solGrad)"
          />
          <path
            d="M19 28 L48 28 C50 28 51 29 50 31 L47 35 C46 36 45 37 43 37 L14 37 C12 37 11 36 12 34 L15 30 C16 29 17 28 19 28 Z"
            fill="url(#solGrad)"
          />
          <path
            d="M15 38 L44 38 C46 38 47 39 46 41 L43 45 C42 46 41 47 39 47 L10 47 C8 47 7 46 8 44 L11 40 C12 39 13 38 15 38 Z"
            fill="url(#solGrad)"
          />
        </svg>
      );
    case 3: // LINK
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          <polygon
            points="32,8 52,19.5 52,42.5 32,54 12,42.5 12,19.5"
            fill="none"
            stroke="#375BD2"
            strokeWidth="5"
          />
          <circle cx="32" cy="31" r="7" fill="#375BD2" />
        </svg>
      );
    case 4: // UNI
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          <circle cx="32" cy="32" r="26" fill="#FF007A" fillOpacity="0.15" stroke="#FF007A" strokeWidth="2" />
          <path
            d="M32 12 C35 22 45 28 48 38 C51 47 43 54 32 54 C21 54 13 47 16 38 C19 28 29 22 32 12 Z"
            fill="#FF007A"
          />
          <circle cx="32" cy="34" r="5" fill="#FFFFFF" />
        </svg>
      );
    case 5: // AAVE
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          <circle cx="32" cy="32" r="26" fill="#B6509E" fillOpacity="0.15" stroke="#B6509E" strokeWidth="2" />
          <text
            x="32"
            y="43"
            fontFamily="Arial, sans-serif"
            fontSize="32"
            fontWeight="900"
            textAnchor="middle"
            fill="#B6509E"
          >
            A
          </text>
        </svg>
      );
    case 6: // ARB
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          <polygon points="32,8 54,20 54,44 32,56 10,44 10,20" fill="#28A0F0" fillOpacity="0.15" stroke="#28A0F0" strokeWidth="2" />
          <path d="M26 44 L32 20 L38 44 Z" fill="#28A0F0" />
        </svg>
      );
    case 7: // OP
    default:
      return (
        <svg viewBox="0 0 64 64" className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md">
          <circle cx="32" cy="32" r="26" fill="#FF0420" />
          <text
            x="32"
            y="42"
            fontFamily="Arial, sans-serif"
            fontSize="24"
            fontWeight="900"
            textAnchor="middle"
            fill="#FFFFFF"
          >
            OP
          </text>
        </svg>
      );
  }
}

export function MemoryCard({
  card,
  index,
  isSelected = false,
  isTurnLocked,
  isMyTurn,
  isUserP1,
  isUserP2,
  player1Address,
  player2Address,
  onClick,
  className = "",
}: MemoryCardProps): JSX.Element {
  const branding = TOKEN_BRANDINGS[card.symbolId] ?? TOKEN_BRANDINGS[0]!;

  // Determine who scored this card
  const normP1 = player1Address?.toLowerCase().trim() ?? "";
  const normP2 = player2Address?.toLowerCase().trim() ?? "";
  const normMatched = card.matchedBy?.toLowerCase().trim() ?? "";

  const isMatchedByP1 = card.isMatched && normMatched !== "" && normMatched === normP1;
  const isMatchedByP2 = card.isMatched && normMatched !== "" && normMatched === normP2;

  // Determine if card can be clicked
  const isClickable =
    !card.isMatched && !card.isFlipped && !isTurnLocked && isMyTurn;

  const handleClick = (): void => {
    if (isClickable) {
      onClick(index);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.key === "Enter" || e.key === " ") && isClickable) {
      e.preventDefault();
      onClick(index);
    }
  };

  // Card perspective styling classes
  const flipRotationClass = card.isFlipped || card.isMatched ? "rotate-y-180" : "";

  // Dynamic matched neon frames
  const matchedBorderClass = useMemo(() => {
    if (!card.isMatched) return "";
    if (isMatchedByP1) {
      return "border-2 border-cyan-400 shadow-cyan-glow ring-2 ring-cyan-500/30";
    }
    if (isMatchedByP2) {
      return "border-2 border-pink-500 shadow-magenta-glow ring-2 ring-pink-500/30";
    }
    return "border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]";
  }, [card.isMatched, isMatchedByP1, isMatchedByP2]);

  return (
    <div
      role="button"
      tabIndex={isClickable ? 0 : -1}
      aria-label={`Memory card ${index + 1}: ${
        card.isFlipped || card.isMatched ? card.name : "Face down"
      }${card.isMatched ? " (Matched)" : ""}`}
      aria-disabled={!isClickable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative w-full aspect-[3/4] sm:aspect-square select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-2xl [perspective:1000px] ${
        isClickable ? "cursor-pointer" : "cursor-default"
      } ${className}`}
    >
      {/* 3D Flipping Card Container */}
      <div
        className={`w-full h-full relative rounded-2xl transition-transform duration-500 ease-out [transform-style:preserve-3d] ${flipRotationClass} ${
          isClickable ? "group-hover:scale-[1.03]" : ""
        }`}
        style={{
          transform: card.isFlipped || card.isMatched ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ======================================================== */}
        {/* FRONT FACE (Face-Down: Cyberpunk Circuit Deck)           */}
        {/* ======================================================== */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-between bg-[#0A0E1A] border ${
            isSelected
              ? "border-cyan-400 shadow-cyan-glow"
              : isClickable
              ? "border-slate-800/90 group-hover:border-cyan-500/50 group-hover:shadow-[0_0_15px_rgba(0,240,255,0.25)]"
              : "border-slate-900"
          } [backface-visibility:hidden] transition-all overflow-hidden`}
        >
          {/* Cyberpunk corner bracket accents */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-500/40 rounded-tl" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-500/40 rounded-tr" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-500/40 rounded-bl" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-500/40 rounded-br" />

          {/* Background Circuit Grid SVG */}
          <div className="absolute inset-0 pointer-events-none opacity-20 group-hover:opacity-35 transition-opacity">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`circuit-${index}`} width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00F0FF" strokeWidth="0.5" />
                  <circle cx="10" cy="10" r="1.5" fill="#00F0FF" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#circuit-${index})`} />
            </svg>
          </div>

          {/* Top Index Marker */}
          <div className="relative z-10 w-full flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span className="font-bold">#0{index + 1}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 group-hover:bg-cyan-400 group-hover:shadow-cyan-glow transition-all" />
          </div>

          {/* Glowing Center Core */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center">
            <div
              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border transition-all ${
                isSelected
                  ? "bg-cyan-500/20 border-cyan-400 shadow-cyan-glow"
                  : isClickable
                  ? "bg-slate-900/80 border-slate-700/80 group-hover:border-cyan-400/60 group-hover:shadow-[0_0_12px_rgba(0,240,255,0.3)]"
                  : "bg-slate-950 border-slate-900"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-500 to-pink-500 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all shadow-sm" />
            </div>
            <span className="mt-1 text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase group-hover:text-cyan-300 transition-colors">
              CHAINPLAY
            </span>
          </div>

          {/* Bottom Card Footer */}
          <div className="relative z-10 w-full flex items-center justify-center">
            <div className="w-8 h-0.5 rounded-full bg-slate-800 group-hover:bg-cyan-500/50 transition-colors" />
          </div>
        </div>

        {/* ======================================================== */}
        {/* BACK FACE (Face-Up: Web3 Asset & Matched Scorer Badge)    */}
        {/* ======================================================== */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-between bg-gradient-to-b ${
            branding.gradientBg
          } border ${
            matchedBorderClass
              ? matchedBorderClass
              : `${branding.borderColor} ${branding.glowClass}`
          } [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden transition-all`}
        >
          {/* Ambient Asset Glow */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20 blur-xl"
            style={{ backgroundColor: branding.accentColor }}
          />

          {/* Top Token Header */}
          <div className="relative z-10 w-full flex items-center justify-between text-[10px] font-mono">
            <span className={`font-black tracking-wider ${branding.textColor}`}>
              {branding.symbol}
            </span>
            {card.isMatched && (
              <span className="flex items-center text-emerald-400">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          {/* Center Crypto Emblem */}
          <div className="relative z-10 my-auto flex flex-col items-center justify-center gap-1.5">
            <CryptoAssetIcon symbolId={card.symbolId} />
            <span
              className={`text-xs sm:text-sm font-black font-mono tracking-wider ${branding.textColor}`}
            >
              {branding.name}
            </span>
          </div>

          {/* Bottom Scorer or Status Badge */}
          <div className="relative z-10 w-full flex items-center justify-center">
            {card.isMatched ? (
              <div
                className={`px-2 py-0.5 rounded-full font-mono font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-sm ${
                  isMatchedByP1
                    ? "bg-cyan-400 text-black shadow-cyan-glow"
                    : isMatchedByP2
                    ? "bg-pink-500 text-white shadow-magenta-glow"
                    : "bg-emerald-400 text-black"
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                <span>
                  {isMatchedByP1
                    ? isUserP1
                      ? "YOUR PAIR"
                      : "P1 PAIR"
                    : isMatchedByP2
                    ? isUserP2
                      ? "YOUR PAIR"
                      : "P2 PAIR"
                    : "MATCH"}
                </span>
              </div>
            ) : (
              <span className="text-[9px] font-mono text-slate-400 tracking-wider">
                {isSelected ? "SELECTED" : "REVEALED"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemoryCard;

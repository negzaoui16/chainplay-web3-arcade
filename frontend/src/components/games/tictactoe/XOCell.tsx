"use client";

/**
 * ChainPlay - Interactive Cyberpunk 3x3 XO Cell
 *
 * Provides:
 * - Distinct X (Cyber Cyan #00F0FF) and O (Neon Magenta #FF0055) SVGs with neon drop-shadows.
 * - Optimistic UI state with pulsing neon opacity (`opacity-60 animate-pulse`) and mini `Loader2` spinner.
 * - Solidified symbol (`opacity-100 scale-100`) upon confirmation.
 * - Hover ghost preview symbol when cell is empty and clickable.
 * - Winning triplet highlight with cyber neon glow border and background illumination.
 * - Smooth Framer Motion entrance and interaction animations.
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { type CellValue, XO_CELL_EMPTY, XO_CELL_X, XO_CELL_O } from "@/types/tictactoe.types";
import { soundEffects } from "@/lib/utils/soundEffects";

export interface XOCellProps {
  /**
   * Grid index (0 to 8)
   */
  readonly index: number;

  /**
   * Current value in this cell (0: empty, 1: X, 2: O)
   */
  readonly value: CellValue;

  /**
   * Whether this cell has an optimistic pending move awaiting confirmation
   */
  readonly isOptimisticPending?: boolean;

  /**
   * Whether this cell is part of the 3-in-a-row winning strike line
   */
  readonly isWinningCell?: boolean;

  /**
   * The winning player's symbol (1 for X, 2 for O) if match is won
   */
  readonly winningSymbol?: 1 | 2 | null;

  /**
   * Whether this cell is currently clickable by the active player
   */
  readonly isClickable?: boolean;

  /**
   * Symbol (1 or 2) to display as semi-transparent ghost preview on hover
   */
  readonly hoverSymbol?: 1 | 2 | null;

  /**
   * Click handler receiving the cell index
   */
  readonly onClick: (index: number) => void;

  /**
   * Whether cell is entirely disabled from interactions
   */
  readonly disabled?: boolean;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

/**
 * Cyber Cyan X SVG with neon drop shadow and crisp angular geometry.
 */
function CyberXSymbol({
  isPending = false,
  isGhost = false,
}: {
  readonly isPending?: boolean;
  readonly isGhost?: boolean;
}): JSX.Element {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      initial={{ scale: isGhost ? 0.9 : 0.4, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isGhost ? 0.25 : isPending ? 0.6 : 1,
      }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={`w-14 h-14 sm:w-20 sm:h-20 ${
        isGhost
          ? "pointer-events-none"
          : "drop-shadow-[0_0_12px_rgba(0,240,255,0.85)] filter"
      }`}
    >
      <line
        x1="22"
        y1="22"
        x2="78"
        y2="78"
        stroke="#00F0FF"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <line
        x1="78"
        y1="22"
        x2="22"
        y2="78"
        stroke="#00F0FF"
        strokeWidth="11"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

/**
 * Neon Magenta O SVG with neon drop shadow and circular neon glow.
 */
function NeonOSymbol({
  isPending = false,
  isGhost = false,
}: {
  readonly isPending?: boolean;
  readonly isGhost?: boolean;
}): JSX.Element {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      initial={{ scale: isGhost ? 0.9 : 0.4, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: isGhost ? 0.25 : isPending ? 0.6 : 1,
      }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ type: "spring", stiffness: 450, damping: 25 }}
      className={`w-14 h-14 sm:w-20 sm:h-20 ${
        isGhost
          ? "pointer-events-none"
          : "drop-shadow-[0_0_12px_rgba(255,0,85,0.85)] filter"
      }`}
    >
      <circle
        cx="50"
        cy="50"
        r="30"
        stroke="#FF0055"
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
      />
    </motion.svg>
  );
}

export function XOCell({
  index,
  value,
  isOptimisticPending = false,
  isWinningCell = false,
  winningSymbol = null,
  isClickable = false,
  hoverSymbol = null,
  onClick,
  disabled = false,
  className = "",
}: XOCellProps): JSX.Element {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const canClick = !disabled && isClickable && value === XO_CELL_EMPTY && !isOptimisticPending;

  const handleClick = (): void => {
    if (!canClick) return;
    soundEffects.playTileClick();
    onClick(index);
  };

  const handleMouseEnter = (): void => {
    if (canClick) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = (): void => {
    setIsHovered(false);
  };

  // Determine border and glow classes based on state
  let stateClasses = "bg-[#0D121F]/90 border-slate-800/90 text-slate-400";
  if (isWinningCell) {
    if (winningSymbol === XO_CELL_X || value === XO_CELL_X) {
      stateClasses =
        "bg-cyan-950/60 border-cyan-400 shadow-[0_0_25px_rgba(0,240,255,0.55)] scale-[1.02] z-10";
    } else if (winningSymbol === XO_CELL_O || value === XO_CELL_O) {
      stateClasses =
        "bg-pink-950/60 border-pink-500 shadow-[0_0_25px_rgba(255,0,85,0.55)] scale-[1.02] z-10";
    } else {
      stateClasses =
        "bg-amber-950/60 border-amber-400 shadow-amber-glow scale-[1.02] z-10";
    }
  } else if (isOptimisticPending) {
    stateClasses =
      "bg-slate-900/90 border-cyan-500/60 shadow-[0_0_15px_rgba(0,240,255,0.3)] animate-pulse";
  } else if (canClick) {
    stateClasses =
      "bg-[#0D121F]/90 border-slate-800 hover:border-cyan-500/50 hover:bg-[#131A2D] hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] cursor-pointer active:scale-95";
  } else {
    stateClasses = "bg-[#0D121F]/70 border-slate-800/60 cursor-not-allowed";
  }

  return (
    <button
      type="button"
      role="gridcell"
      aria-label={`Cell ${index + 1}: ${
        value === XO_CELL_X ? "X" : value === XO_CELL_O ? "O" : "Empty"
      }`}
      disabled={!canClick}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative aspect-square w-full rounded-2xl border-2 flex items-center justify-center transition-all duration-200 select-none overflow-hidden group ${stateClasses} ${className}`}
    >
      {/* Subtle futuristic corner accents */}
      <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-slate-700/60 pointer-events-none" />
      <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-slate-700/60 pointer-events-none" />
      <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-slate-700/60 pointer-events-none" />
      <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-slate-700/60 pointer-events-none" />

      {/* Optimistic Pending Mini Spinner */}
      {isOptimisticPending && (
        <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Render Occupied Symbol or Optimistic Symbol */}
      <AnimatePresence mode="wait">
        {value === XO_CELL_X && (
          <CyberXSymbol key="symbol-x" isPending={isOptimisticPending} />
        )}

        {value === XO_CELL_O && (
          <NeonOSymbol key="symbol-o" isPending={isOptimisticPending} />
        )}

        {/* Hover Ghost Symbol */}
        {value === XO_CELL_EMPTY && canClick && isHovered && hoverSymbol !== null && (
          <div key="ghost-preview" className="transition-opacity">
            {hoverSymbol === XO_CELL_X ? (
              <CyberXSymbol isGhost />
            ) : hoverSymbol === XO_CELL_O ? (
              <NeonOSymbol isGhost />
            ) : null}
          </div>
        )}
      </AnimatePresence>
    </button>
  );
}

export default XOCell;

"use client";

/**
 * ChainPlay - 3x3 Tic-Tac-Toe Arena Board
 *
 * Provides:
 * - 3x3 responsive grid rendering 9 interactive `XOCell`s.
 * - Dynamic SVG Laser Winning Line overlay rendered with Framer Motion (`pathLength: 0 -> 1`).
 * - Neon laser glow with multi-layered stroke styling (outer neon aura, bright laser beam, and white core).
 * - Automatic board locking during pending optimistic moves or when turn is inactive.
 * - Full support for 8 canonical winning triplets.
 *
 * Zero `any` types. Strict TypeScript.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XOCell } from "./XOCell";
import {
  type CellValue,
  type XOWinningLine,
  XO_CELL_EMPTY,
  XO_CELL_X,
  XO_CELL_O,
} from "@/types/tictactoe.types";

export interface XOBoardProps {
  /**
   * 9-element cell array representing current board state
   */
  readonly board: CellValue[];

  /**
   * Active winning triplet indices [a, b, c], or null if game is ongoing
   */
  readonly winningLine: XOWinningLine | null;

  /**
   * Winning player symbol (1 for X, 2 for O)
   */
  readonly winningSymbol?: 1 | 2 | null;

  /**
   * Index of cell currently executing an optimistic move
   */
  readonly optimisticPendingIndex: number | null;

  /**
   * Whether entire board is locked (e.g. game over, awaiting tx receipt, opponent turn)
   */
  readonly isBoardLocked?: boolean;

  /**
   * Whether it is currently the local user's turn
   */
  readonly isMyTurn?: boolean;

  /**
   * Local user's symbol for hover ghost previews (1 for X, 2 for O)
   */
  readonly mySymbol?: 1 | 2 | null;

  /**
   * Callback invoked when a cell is clicked
   */
  readonly onCellClick: (index: number) => void;

  /**
   * Optional custom CSS class name for outer wrapper
   */
  readonly className?: string;
}

interface LineCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Maps any of the 8 canonical winning combinations into viewBox (0 0 300 300) coordinates.
 */
function getWinningLineCoordinates(
  line: XOWinningLine | null
): LineCoordinates | null {
  if (!line || line.length !== 3) return null;

  const sortedKey = [...line].sort((a, b) => a - b).join(",");

  switch (sortedKey) {
    // 3 Rows
    case "0,1,2":
      return { x1: 20, y1: 50, x2: 280, y2: 50 };
    case "3,4,5":
      return { x1: 20, y1: 150, x2: 280, y2: 150 };
    case "6,7,8":
      return { x1: 20, y1: 250, x2: 280, y2: 250 };

    // 3 Columns
    case "0,3,6":
      return { x1: 50, y1: 20, x2: 50, y2: 280 };
    case "1,4,7":
      return { x1: 150, y1: 20, x2: 150, y2: 280 };
    case "2,5,8":
      return { x1: 250, y1: 20, x2: 250, y2: 280 };

    // 2 Diagonals
    case "0,4,8":
      return { x1: 25, y1: 25, x2: 275, y2: 275 };
    case "2,4,6":
      return { x1: 275, y1: 25, x2: 25, y2: 275 };

    default:
      return null;
  }
}

export function XOBoard({
  board,
  winningLine,
  winningSymbol = null,
  optimisticPendingIndex,
  isBoardLocked = false,
  isMyTurn = false,
  mySymbol = null,
  onCellClick,
  className = "",
}: XOBoardProps): JSX.Element {
  const lineCoords = getWinningLineCoordinates(winningLine);

  // Determine neon laser beam color palette
  const laserColor =
    winningSymbol === XO_CELL_X
      ? "#00F0FF" // Cyber Cyan
      : winningSymbol === XO_CELL_O
      ? "#FF0055" // Neon Magenta
      : "#F59E0B"; // Amber Gold fallback

  const glowRgba =
    winningSymbol === XO_CELL_X
      ? "rgba(0, 240, 255, 0.75)"
      : winningSymbol === XO_CELL_O
      ? "rgba(255, 0, 85, 0.75)"
      : "rgba(245, 158, 11, 0.75)";

  const isLocked = isBoardLocked || optimisticPendingIndex !== null;

  return (
    <div
      className={`relative aspect-square max-w-[380px] sm:max-w-[440px] md:max-w-[460px] w-full mx-auto p-3 sm:p-4 rounded-3xl bg-[#090D18]/90 backdrop-blur-xl border border-slate-800/90 shadow-2xl overflow-hidden select-none ${className}`}
    >
      {/* Background ambient neon glow reflection */}
      <div className="absolute inset-0 bg-cyber-grid bg-[size:24px_24px] opacity-15 pointer-events-none" />

      {/* Grid container */}
      <div
        role="grid"
        aria-label="3x3 Tic Tac Toe Grid"
        className="relative z-10 grid grid-cols-3 grid-rows-3 gap-2.5 sm:gap-3.5 w-full h-full"
      >
        {Array.from({ length: 9 }).map((_, index) => {
          const cellValue = board[index] ?? XO_CELL_EMPTY;
          const isPending = optimisticPendingIndex === index;
          const isWinning = Boolean(winningLine && winningLine.includes(index));
          const isClickable = !isLocked && isMyTurn && cellValue === XO_CELL_EMPTY;

          return (
            <XOCell
              key={`cell-${index}`}
              index={index}
              value={cellValue}
              isOptimisticPending={isPending}
              isWinningCell={isWinning}
              winningSymbol={winningSymbol}
              isClickable={isClickable}
              hoverSymbol={mySymbol}
              disabled={isLocked || !isMyTurn}
              onClick={onCellClick}
            />
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* Animated SVG Laser Winning Strike Line                   */}
      {/* ======================================================== */}
      <AnimatePresence>
        {lineCoords && (
          <svg
            viewBox="0 0 300 300"
            className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-visible"
          >
            <defs>
              <filter id="laser-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur1" />
                <feGaussianBlur stdDeviation="3" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Layer 1: Wide diffused outer glow aura */}
            <motion.line
              x1={lineCoords.x1}
              y1={lineCoords.y1}
              x2={lineCoords.x2}
              y2={lineCoords.y2}
              stroke={laserColor}
              strokeWidth="16"
              strokeLinecap="round"
              strokeOpacity="0.4"
              filter="url(#laser-glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />

            {/* Layer 2: Main saturated neon laser beam */}
            <motion.line
              x1={lineCoords.x1}
              y1={lineCoords.y1}
              x2={lineCoords.x2}
              y2={lineCoords.y2}
              stroke={laserColor}
              strokeWidth="7"
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 10px ${glowRgba})` }}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />

            {/* Layer 3: High-luminance white hot laser core */}
            <motion.line
              x1={lineCoords.x1}
              y1={lineCoords.y1}
              x2={lineCoords.x2}
              y2={lineCoords.y2}
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </svg>
        )}
      </AnimatePresence>
    </div>
  );
}

export default XOBoard;

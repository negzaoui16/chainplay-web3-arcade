"use client";

/**
 * ChainPlay - 4x4 Memory Duel Grid
 *
 * Implements:
 * - 4x4 CSS 3D perspective grid layout (16 cards total)
 * - Strict turn locking during 1200ms mismatch window preventing click spam
 * - Cyberpunk arena plate container with glowing grid lines and corner brackets
 * - Integrates `MemoryCard` with smooth 3D flip animation
 *
 * Zero `any` types. Strict TypeScript.
 */

import React from "react";
import type { CardItem } from "@/types/memory.types";
import { MemoryCard } from "./MemoryCard";

export interface MemoryGridProps {
  /**
   * 16-card deck array
   */
  readonly cards: CardItem[];

  /**
   * Index of the first card currently selected in this turn (or null)
   */
  readonly firstSelected: number | null;

  /**
   * Index of the second card currently selected in this turn (or null)
   */
  readonly secondSelected: number | null;

  /**
   * Strict turn lock flag (e.g. during 1200ms mismatch evaluation or game over)
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
   * Callback fired when player clicks a card
   */
  readonly onCardClick: (index: number) => void;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

export function MemoryGrid({
  cards,
  firstSelected,
  secondSelected,
  isTurnLocked,
  isMyTurn,
  isUserP1,
  isUserP2,
  player1Address,
  player2Address,
  onCardClick,
  className = "",
}: MemoryGridProps): JSX.Element {
  // Handle click ensuring strict lock during 1200ms mismatch window
  const handleCardClick = (index: number): void => {
    if (isTurnLocked || !isMyTurn) {
      return;
    }
    onCardClick(index);
  };

  return (
    <div
      className={`relative w-full max-w-xl mx-auto p-3.5 sm:p-5 rounded-3xl bg-[#090D18]/90 backdrop-blur-md border border-slate-800 shadow-2xl overflow-hidden ${className}`}
    >
      {/* Cyberpunk corner bracket accents */}
      <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-cyan-500/50 rounded-tl" />
      <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-cyan-500/50 rounded-tr" />
      <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-cyan-500/50 rounded-bl" />
      <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-cyan-500/50 rounded-br" />

      {/* Ambient background grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-15 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px]" />

      {/* 4x4 Grid Container */}
      <div
        className="relative z-10 grid grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4 w-full"
        role="grid"
        aria-label="4x4 Memory Duel Grid"
      >
        {cards.map((card, idx) => {
          const isSelected = idx === firstSelected || idx === secondSelected;

          return (
            <div key={`card-${card.id}-${idx}`} role="gridcell">
              <MemoryCard
                card={card}
                index={idx}
                isSelected={isSelected}
                isTurnLocked={isTurnLocked}
                isMyTurn={isMyTurn}
                isUserP1={isUserP1}
                isUserP2={isUserP2}
                player1Address={player1Address}
                player2Address={player2Address}
                onClick={handleCardClick}
              />
            </div>
          );
        })}
      </div>

      {/* Turn Lock Overlay Indicator during 1200ms Mismatch Window */}
      {isTurnLocked && secondSelected !== null && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-rose-500/60 text-rose-300 text-xs font-mono font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(244,63,94,0.35)] animate-pulse flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>Mismatch! Memorize cards...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoryGrid;

/**
 * ChainPlay - Memory Duel Arena State Store (Zustand)
 *
 * 1v1 turn-based cryptographic card matching game:
 * - 4x4 grid with 8 token pairs (ETH, BTC, SOL, LINK, UNI, AAVE, ARB, OP)
 * - Streak combos and multipliers
 * - Automatic 1200ms memorization window on mismatch with turn switching
 * - Audio feedback (card flip, match chime, victory arpeggio)
 *
 * Zero `any` types. Strict TypeScript.
 */

import { create } from "zustand";
import type { CardItem, TurnPhase } from "../types/memory.types";
import { MEMORY_CARDS } from "../config/constants";
import { playCardFlip, playMatchChime, playVictory } from "../lib/utils/soundEffects";

export interface MemoryState {
  gameId: string | null;
  player1: string | null;
  player2: string | null;
  cards: CardItem[];
  firstSelected: number | null;
  secondSelected: number | null;
  turnPhase: TurnPhase;
  currentTurn: string;
  p1Score: number;
  p2Score: number;
  streakMultiplier: number;
  winner: string | null;
  isDraw: boolean;
  matchedPairsCount: number;

  // Actions
  initDeck: (
    gameId: string,
    p1: string,
    p2: string,
    customCards?: CardItem[]
  ) => void;
  selectCard: (index: number, playerAddress: string) => boolean;
  resolveTurn: () => void;
  reset: () => void;
}

let mismatchTimerId: ReturnType<typeof setTimeout> | null = null;

/**
 * Creates and shuffles a fresh 16-card deck (8 crypto token pairs).
 */
export function generateMemoryDeck(): CardItem[] {
  const deck: CardItem[] = [];

  for (let symId = 0; symId < MEMORY_CARDS.length; symId++) {
    const sym = MEMORY_CARDS[symId];
    const tokenName = sym ?? "ETH";

    // 2 cards for each pair
    for (let c = 0; c < 2; c++) {
      deck.push({
        id: deck.length,
        symbolId: symId,
        name: tokenName,
        icon: tokenName,
        isFlipped: false,
        isMatched: false,
        matchedBy: null,
      });
    }
  }

  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = deck[i];
    const target = deck[j];
    if (current && target) {
      deck[i] = target;
      deck[j] = current;
    }
  }

  // Re-index IDs to match final shuffled order
  return deck.map((item, idx) => ({ ...item, id: idx }));
}

export const useMemoryStore = create<MemoryState>()((set, get) => ({
  gameId: null,
  player1: null,
  player2: null,
  cards: generateMemoryDeck(),
  firstSelected: null,
  secondSelected: null,
  turnPhase: "SELECT_FIRST",
  currentTurn: "",
  p1Score: 0,
  p2Score: 0,
  streakMultiplier: 1,
  winner: null,
  isDraw: false,
  matchedPairsCount: 0,

  initDeck: (
    gameId: string,
    p1: string,
    p2: string,
    customCards?: CardItem[]
  ) => {
    if (mismatchTimerId) {
      clearTimeout(mismatchTimerId);
      mismatchTimerId = null;
    }

    const normP1 = p1.toLowerCase();
    const normP2 = p2.toLowerCase();
    const deck = customCards ?? generateMemoryDeck();

    set({
      gameId,
      player1: normP1,
      player2: normP2,
      cards: deck,
      firstSelected: null,
      secondSelected: null,
      turnPhase: "SELECT_FIRST",
      currentTurn: normP1,
      p1Score: 0,
      p2Score: 0,
      streakMultiplier: 1,
      winner: null,
      isDraw: false,
      matchedPairsCount: 0,
    });
  },

  selectCard: (index: number, playerAddress: string): boolean => {
    const state = get();
    const {
      cards,
      turnPhase,
      currentTurn,
      firstSelected,
      winner,
      isDraw,
      player1,
      player2,
      p1Score,
      p2Score,
      streakMultiplier,
      matchedPairsCount,
    } = state;

    // Boundary & state validation
    if (winner !== null || isDraw) return false;
    if (index < 0 || index >= cards.length) return false;

    const actingPlayer = playerAddress.toLowerCase();
    if (actingPlayer !== currentTurn.toLowerCase()) return false;

    const targetCard = cards[index];
    if (!targetCard || targetCard.isMatched || targetCard.isFlipped) return false;

    // STEP 1: First card selection
    if (turnPhase === "SELECT_FIRST") {
      playCardFlip();
      const updatedCards = cards.map((c, i) =>
        i === index ? { ...c, isFlipped: true } : c
      );

      set({
        cards: updatedCards,
        firstSelected: index,
        turnPhase: "SELECT_SECOND",
      });
      return true;
    }

    // STEP 2: Second card selection
    if (turnPhase === "SELECT_SECOND") {
      if (firstSelected === null || firstSelected === index) return false;

      playCardFlip();
      const updatedCards = cards.map((c, i) =>
        i === index ? { ...c, isFlipped: true } : c
      );

      const card1 = updatedCards[firstSelected];
      const card2 = updatedCards[index];

      if (!card1 || !card2) return false;

      const isMatch = card1.symbolId === card2.symbolId;

      if (isMatch) {
        // MATCH FOUND
        playMatchChime();
        const finalCards = updatedCards.map((c, i) =>
          i === firstSelected || i === index
            ? { ...c, isFlipped: true, isMatched: true, matchedBy: actingPlayer }
            : c
        );

        const earnedPoints = 100 * streakMultiplier;
        const nextP1Score =
          actingPlayer === player1?.toLowerCase() ? p1Score + earnedPoints : p1Score;
        const nextP2Score =
          actingPlayer === player2?.toLowerCase() ? p2Score + earnedPoints : p2Score;
        const nextMultiplier = streakMultiplier + 1;
        const nextPairsCount = matchedPairsCount + 1;

        const isGameOver = nextPairsCount === 8;
        let gameWinner: string | null = null;
        let drawOutcome = false;

        if (isGameOver) {
          playVictory();
          if (nextP1Score > nextP2Score) {
            gameWinner = player1;
          } else if (nextP2Score > nextP1Score) {
            gameWinner = player2;
          } else {
            drawOutcome = true;
          }
        }

        set({
          cards: finalCards,
          firstSelected: null,
          secondSelected: null,
          turnPhase: isGameOver ? "TURN_LOCKED" : "SELECT_FIRST",
          p1Score: nextP1Score,
          p2Score: nextP2Score,
          streakMultiplier: nextMultiplier,
          matchedPairsCount: nextPairsCount,
          winner: gameWinner,
          isDraw: drawOutcome,
        });

        return true;
      } else {
        // MISMATCH: Lock turn during 1200ms memorization window
        set({
          cards: updatedCards,
          secondSelected: index,
          turnPhase: "TURN_LOCKED",
          streakMultiplier: 1,
        });

        if (mismatchTimerId) {
          clearTimeout(mismatchTimerId);
        }

        mismatchTimerId = setTimeout(() => {
          get().resolveTurn();
        }, 1200);

        return true;
      }
    }

    return false;
  },

  resolveTurn: () => {
    if (mismatchTimerId) {
      clearTimeout(mismatchTimerId);
      mismatchTimerId = null;
    }

    const { cards, firstSelected, secondSelected, currentTurn, player1, player2 } =
      get();

    if (firstSelected === null || secondSelected === null) {
      set({ turnPhase: "SELECT_FIRST" });
      return;
    }

    // Flip back non-matched cards
    const revertedCards = cards.map((c, i) =>
      i === firstSelected || i === secondSelected
        ? { ...c, isFlipped: false }
        : c
    );

    const nextTurn =
      currentTurn.toLowerCase() === player1?.toLowerCase()
        ? (player2 ?? "").toLowerCase()
        : (player1 ?? "").toLowerCase();

    set({
      cards: revertedCards,
      firstSelected: null,
      secondSelected: null,
      turnPhase: "SELECT_FIRST",
      currentTurn: nextTurn,
    });
  },

  reset: () => {
    if (mismatchTimerId) {
      clearTimeout(mismatchTimerId);
      mismatchTimerId = null;
    }

    set({
      gameId: null,
      player1: null,
      player2: null,
      cards: generateMemoryDeck(),
      firstSelected: null,
      secondSelected: null,
      turnPhase: "SELECT_FIRST",
      currentTurn: "",
      p1Score: 0,
      p2Score: 0,
      streakMultiplier: 1,
      winner: null,
      isDraw: false,
      matchedPairsCount: 0,
    });
  },
}));

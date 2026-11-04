/**
 * ChainPlay - Memory Duel Arena Type Definitions
 * 1v1 shared state card matching types. Zero `any`.
 */

export interface CardItem {
  id: number;
  symbolId: number;
  name: string;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
  matchedBy: string | null;
}

export type TurnPhase =
  | "SELECT_FIRST"
  | "SELECT_SECOND"
  | "EVALUATING"
  | "TURN_LOCKED";

export interface MemoryBoardState {
  cards: CardItem[];
  firstSelection: number | null;
  secondSelection: number | null;
  currentTurn: string;
  p1Score: number;
  p2Score: number;
  streakMultiplier: number;
  lastActionTimestamp: number;
}

export interface MemoryFlipEvent {
  gameId: bigint;
  player: string;
  cardIndex1: number;
  cardIndex2: number;
  isMatch: boolean;
  symbolId: number;
}

export interface MemoryGameResult {
  winner: string | null;
  p1Score: number;
  p2Score: number;
  isDraw: boolean;
}

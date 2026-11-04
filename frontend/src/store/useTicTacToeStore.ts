/**
 * ChainPlay - Tic-Tac-Toe Arena State Store (Zustand)
 *
 * Manages 3x3 XO duel logic, optimistic local updates, timeout claims,
 * winning line calculation, and synchronized audio feedback.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { create } from "zustand";
import {
  type CellValue,
  type XOWinningLine,
  type XOMoveEvent,
  type XOWinResult,
  XO_CELL_EMPTY,
  XO_CELL_X,
} from "../types/tictactoe.types";
import { playTileClick, playVictory } from "../lib/utils/soundEffects";

export const WINNING_COMBINATIONS: readonly XOWinningLine[] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

/**
 * Checks for 3-in-a-row or draw across the 3x3 board.
 */
export function checkWinner(
  board: CellValue[],
  player1: string | null,
  player2: string | null
): XOWinResult {
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const valA = board[a];
    const valB = board[b];
    const valC = board[c];

    if (valA !== undefined && valA !== XO_CELL_EMPTY && valA === valB && valA === valC) {
      const winner = valA === XO_CELL_X ? player1 : player2;
      return {
        winner: winner ? winner.toLowerCase() : null,
        winningLine: [a, b, c],
        isDraw: false,
      };
    }
  }

  const isFull = board.every((cell) => cell !== XO_CELL_EMPTY);
  return {
    winner: null,
    winningLine: null,
    isDraw: isFull,
  };
}

export interface TicTacToeState {
  gameId: string | null;
  player1: string | null;
  player2: string | null;
  board: CellValue[];
  currentTurn: string;
  lastMoveTimestamp: number;
  winningLine: XOWinningLine | null;
  winner: string | null;
  isDraw: boolean;
  optimisticPendingIndex: number | null;
  moveHistory: XOMoveEvent[];

  // Actions
  initGame: (gameId: string, p1: string, p2: string) => void;
  playMoveOptimistic: (cellIndex: number, playerAddress?: string) => boolean;
  confirmMove: (cellIndex: number, symbol: 1 | 2, playerAddress: string) => void;
  rollbackMove: (cellIndex: number) => void;
  claimTimeoutWin: (claimingPlayer: string) => boolean;
  reset: () => void;
}

const INITIAL_BOARD: CellValue[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];

export const useTicTacToeStore = create<TicTacToeState>()((set, get) => ({
  gameId: null,
  player1: null,
  player2: null,
  board: [...INITIAL_BOARD],
  currentTurn: "",
  lastMoveTimestamp: 0,
  winningLine: null,
  winner: null,
  isDraw: false,
  optimisticPendingIndex: null,
  moveHistory: [],

  initGame: (gameId: string, p1: string, p2: string) => {
    const normP1 = p1.toLowerCase();
    const normP2 = p2.toLowerCase();
    set({
      gameId,
      player1: normP1,
      player2: normP2,
      board: [...INITIAL_BOARD],
      currentTurn: normP1,
      lastMoveTimestamp: Date.now(),
      winningLine: null,
      winner: null,
      isDraw: false,
      optimisticPendingIndex: null,
      moveHistory: [],
    });
  },

  playMoveOptimistic: (cellIndex: number, playerAddress?: string): boolean => {
    const state = get();
    const { board, winner, isDraw, currentTurn, player1, player2 } = state;

    // Boundary & state validation
    if (cellIndex < 0 || cellIndex > 8) return false;
    if (board[cellIndex] !== XO_CELL_EMPTY) return false;
    if (winner !== null || isDraw) return false;

    const actingPlayer = (playerAddress ?? currentTurn).toLowerCase();
    if (actingPlayer !== currentTurn.toLowerCase()) {
      return false;
    }

    const symbol: 1 | 2 =
      actingPlayer === player1?.toLowerCase() ? 1 : 2;

    const nextBoard: CellValue[] = [...board];
    nextBoard[cellIndex] = symbol;

    // Check game outcome
    const winResult = checkWinner(nextBoard, player1, player2);

    // Audio triggers
    playTileClick();
    if (winResult.winner) {
      playVictory();
    }

    const nextTurn =
      actingPlayer === player1?.toLowerCase()
        ? (player2 ?? "").toLowerCase()
        : (player1 ?? "").toLowerCase();

    const newMoveEvent: XOMoveEvent = {
      gameId: BigInt(state.gameId && !isNaN(Number(state.gameId)) ? state.gameId : "1"),
      player: actingPlayer,
      cellIndex,
      symbol,
    };

    set({
      board: nextBoard,
      currentTurn: winResult.winner || winResult.isDraw ? currentTurn : nextTurn,
      winningLine: winResult.winningLine,
      winner: winResult.winner,
      isDraw: winResult.isDraw,
      lastMoveTimestamp: Date.now(),
      optimisticPendingIndex: cellIndex,
      moveHistory: [...state.moveHistory, newMoveEvent],
    });

    return true;
  },

  confirmMove: (cellIndex: number, symbol: 1 | 2, playerAddress: string) => {
    const state = get();
    const nextBoard = [...state.board];
    nextBoard[cellIndex] = symbol;

    const winResult = checkWinner(nextBoard, state.player1, state.player2);
    const nextTurn =
      playerAddress.toLowerCase() === state.player1?.toLowerCase()
        ? (state.player2 ?? "").toLowerCase()
        : (state.player1 ?? "").toLowerCase();

    set({
      board: nextBoard,
      currentTurn: winResult.winner || winResult.isDraw ? state.currentTurn : nextTurn,
      winningLine: winResult.winningLine,
      winner: winResult.winner,
      isDraw: winResult.isDraw,
      optimisticPendingIndex: null,
      lastMoveTimestamp: Date.now(),
    });
  },

  rollbackMove: (cellIndex: number) => {
    const state = get();
    const nextBoard = [...state.board];
    nextBoard[cellIndex] = XO_CELL_EMPTY;

    // Revert turn to who played that move
    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    const restoredTurn = lastMove ? lastMove.player : state.currentTurn;

    set({
      board: nextBoard,
      currentTurn: restoredTurn,
      winningLine: null,
      winner: null,
      isDraw: false,
      optimisticPendingIndex: null,
      moveHistory: state.moveHistory.filter((m) => m.cellIndex !== cellIndex),
    });
  },

  claimTimeoutWin: (claimingPlayer: string): boolean => {
    const state = get();
    if (state.winner !== null || state.isDraw) return false;

    // Claiming player must be one of the participants
    const normClaimant = claimingPlayer.toLowerCase();
    if (
      normClaimant !== state.player1?.toLowerCase() &&
      normClaimant !== state.player2?.toLowerCase()
    ) {
      return false;
    }

    // Must be opponent's turn that timed out
    if (state.currentTurn.toLowerCase() === normClaimant) {
      return false;
    }

    playVictory();
    set({
      winner: normClaimant,
      winningLine: null,
      isDraw: false,
    });
    return true;
  },

  reset: () => {
    set({
      gameId: null,
      player1: null,
      player2: null,
      board: [...INITIAL_BOARD],
      currentTurn: "",
      lastMoveTimestamp: 0,
      winningLine: null,
      winner: null,
      isDraw: false,
      optimisticPendingIndex: null,
      moveHistory: [],
    });
  },
}));

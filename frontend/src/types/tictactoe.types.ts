/**
 * ChainPlay - Tic-Tac-Toe Arena Type Definitions
 * Strict TypeScript types with zero `any`.
 */

export type CellValue = 0 | 1 | 2;

export const XO_CELL_EMPTY: CellValue = 0;
export const XO_CELL_X: CellValue = 1;
export const XO_CELL_O: CellValue = 2;

export type XOSymbol = 1 | 2;

export type XOWinningLine = [number, number, number];

export interface XOBoardState {
  board: CellValue[];
  currentTurn: string;
  lastMoveTimestamp: number;
  winningLine: [number, number, number] | null;
  winner: string | null;
  isDraw: boolean;
}

export interface XOMoveEvent {
  gameId: bigint;
  player: string;
  cellIndex: number;
  symbol: 1 | 2;
}

export interface XOWinResult {
  winner: string | null;
  winningLine: [number, number, number] | null;
  isDraw: boolean;
}

export interface XOMoveRequest {
  gameId: string;
  cellIndex: number;
}

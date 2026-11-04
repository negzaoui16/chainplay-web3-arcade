/**
 * ChainPlay - Lobby & Matchmaking Type Definitions
 * Strict TypeScript types with zero `any`.
 */

export enum GameType {
  TIC_TAC_TOE = 0,
  BATTLESHIP = 1,
  MEMORY_DUEL = 2,
}

export type GameTypeValue =
  | GameType.TIC_TAC_TOE
  | GameType.BATTLESHIP
  | GameType.MEMORY_DUEL;

export enum RoomStatus {
  WAITING = 0,
  ACTIVE = 1,
  FINISHED = 2,
  CANCELLED = 3,
}

export type RoomStatusValue =
  | RoomStatus.WAITING
  | RoomStatus.ACTIVE
  | RoomStatus.FINISHED
  | RoomStatus.CANCELLED;

export interface RoomMetadata {
  id: string;
  gameType: GameType;
  player1: string;
  player2: string | null;
  wager: bigint;
  status: RoomStatus;
  winner: string | null;
  createdAt: number;
}

export interface WagerInfo {
  raw: bigint;
  formatted: string;
  symbol: string;
}

export interface CreateRoomParams {
  gameType: GameType;
  wager: string;
  isPrivate: boolean;
}

export interface LobbyFilter {
  gameType?: GameType | "ALL";
  status?: RoomStatus | "ALL";
  minWager?: bigint;
  maxWager?: bigint;
  searchQuery?: string;
}

export interface RoomJoinedEvent {
  roomId: string;
  player2: string;
  status: RoomStatus;
}

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  [GameType.TIC_TAC_TOE]: "Tic-Tac-Toe",
  [GameType.BATTLESHIP]: "Battleship",
  [GameType.MEMORY_DUEL]: "Memory Duel",
};

export const GAME_TYPE_SLUGS: Record<GameType, string> = {
  [GameType.TIC_TAC_TOE]: "tictactoe",
  [GameType.BATTLESHIP]: "battleship",
  [GameType.MEMORY_DUEL]: "memory",
};

export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  [RoomStatus.WAITING]: "Waiting for Opponent",
  [RoomStatus.ACTIVE]: "In Progress",
  [RoomStatus.FINISHED]: "Finished",
  [RoomStatus.CANCELLED]: "Cancelled",
};

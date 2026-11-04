/**
 * ChainPlay - Battleship Arena Type Definitions
 * Cryptographic commit-reveal naval warfare types. Zero `any`.
 */

export type ShipId = 1 | 2 | 3 | 4 | 5;

export type ShipOrientation = "HORIZONTAL" | "VERTICAL";

export interface ShipPlacement {
  shipId: ShipId;
  name: string;
  size: number;
  startX: number;
  startY: number;
  orientation: ShipOrientation;
  hits: number;
  isSunk: boolean;
}

export interface Coordinate {
  x: number;
  y: number;
}

export type ShotResult = "HIT" | "MISS" | "SUNK";

export interface ShotRecord {
  x: number;
  y: number;
  result: ShotResult;
  sunkShipId?: ShipId;
  timestamp: number;
}

export interface CommitData {
  flatBoard: number[];
  ships: ShipPlacement[];
  salt: `0x${string}`;
  boardHash: `0x${string}`;
  timestamp: number;
}

export type BattleshipPhase =
  | "PLACEMENT"
  | "COMMIT"
  | "COMBAT"
  | "VERIFICATION"
  | "FINISHED";

export type BattleshipCellState =
  | 0 // EMPTY
  | 1 // CARRIER
  | 2 // BATTLESHIP
  | 3 // CRUISER
  | 4 // SUBMARINE
  | 5 // DESTROYER
  | 10 // MISS
  | 11; // HIT

export interface BattleshipBoardState {
  phase: BattleshipPhase;
  ownShips: ShipPlacement[];
  ownDefensiveGrid: number[]; // 100 cells
  enemyOffensiveGrid: (ShotResult | null)[]; // 100 cells
  ownShotsFired: ShotRecord[];
  enemyShotsReceived: ShotRecord[];
  salt: `0x${string}` | null;
  boardHash: `0x${string}` | null;
  enemyBoardHash: `0x${string}` | null;
  currentTurn: string;
  isCommitted: boolean;
  isEnemyCommitted: boolean;
  isVerified: boolean;
  winner: string | null;
}

export interface BattleshipShotEvent {
  gameId: bigint;
  attacker: string;
  x: number;
  y: number;
}

export interface BattleshipRevealEvent {
  gameId: bigint;
  defender: string;
  x: number;
  y: number;
  result: ShotResult;
  sunkShipId?: ShipId;
}

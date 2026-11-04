/**
 * ChainPlay Global Game & Protocol Constants
 * Zero `any` types. Strict immutability.
 */

// ==========================================
// Fleet & Battleship Configuration
// ==========================================

export interface ShipDefinition {
  readonly id: number;
  readonly name: string;
  readonly size: number;
}

export const FLEET_CONFIG = {
  CARRIER: { id: 1, name: "Carrier", size: 5 },
  BATTLESHIP: { id: 2, name: "Battleship", size: 4 },
  CRUISER: { id: 3, name: "Cruiser", size: 3 },
  SUBMARINE: { id: 4, name: "Submarine", size: 3 },
  DESTROYER: { id: 5, name: "Destroyer", size: 2 },
} as const;

export type ShipType = keyof typeof FLEET_CONFIG;

export const FLEET_LIST: readonly ShipDefinition[] = [
  FLEET_CONFIG.CARRIER,
  FLEET_CONFIG.BATTLESHIP,
  FLEET_CONFIG.CRUISER,
  FLEET_CONFIG.SUBMARINE,
  FLEET_CONFIG.DESTROYER,
] as const;

export const TOTAL_SHIP_CELLS = 17 as const; // Exactly 17 cells (5+4+3+3+2)

// ==========================================
// Grid Dimensions
// ==========================================

export const GRID_CONFIG = {
  BATTLESHIP_GRID_SIZE: 10,
  TIC_TAC_TOE_GRID_SIZE: 3,
  MEMORY_GRID_SIZE: 4,
} as const;

export const BATTLESHIP_TOTAL_CELLS =
  GRID_CONFIG.BATTLESHIP_GRID_SIZE * GRID_CONFIG.BATTLESHIP_GRID_SIZE; // 100
export const TIC_TAC_TOE_TOTAL_CELLS =
  GRID_CONFIG.TIC_TAC_TOE_GRID_SIZE * GRID_CONFIG.TIC_TAC_TOE_GRID_SIZE; // 9
export const MEMORY_TOTAL_CELLS =
  GRID_CONFIG.MEMORY_GRID_SIZE * GRID_CONFIG.MEMORY_GRID_SIZE; // 16

// ==========================================
// Timing & Turn Defaults
// ==========================================

export const TURN_TIMEOUT_SECONDS: number = 60;
export const MEMORY_MISMATCH_DELAY_MS: number = 1000;
export const BOT_THINK_DELAY_MS: number = 750;

// ==========================================
// Memory Duel Cards
// ==========================================

export const MEMORY_CARDS = [
  "ETH",
  "BTC",
  "SOL",
  "LINK",
  "UNI",
  "AAVE",
  "ARB",
  "OP",
] as const;

export type MemoryTokenSymbol = (typeof MEMORY_CARDS)[number];

// ==========================================
// Wagers & Economy
// ==========================================

export const DEFAULT_WAGERS: readonly string[] = [
  "0.01",
  "0.05",
  "0.1",
] as const;

export const PLATFORM_FEE_BPS = 250; // 2.5% platform fee
export const BPS_DENOMINATOR = 10000;

// ==========================================
// Game Identifiers & Modes
// ==========================================

export const GAME_TYPES = {
  TIC_TAC_TOE: 1,
  BATTLESHIP: 2,
  MEMORY_DUEL: 3,
} as const;

export type GameTypeId = (typeof GAME_TYPES)[keyof typeof GAME_TYPES];

export const GAME_METADATA = {
  [GAME_TYPES.TIC_TAC_TOE]: {
    id: GAME_TYPES.TIC_TAC_TOE,
    title: "Tic-Tac-Toe",
    slug: "tictactoe",
    description: "Classic 3x3 grid duel with instant wager payout.",
    icon: "Grid3X3",
    gridSize: GRID_CONFIG.TIC_TAC_TOE_GRID_SIZE,
  },
  [GAME_TYPES.BATTLESHIP]: {
    id: GAME_TYPES.BATTLESHIP,
    title: "Battleship",
    slug: "battleship",
    description: "Cryptographic commit-reveal naval warfare on 10x10 radar.",
    icon: "ShieldAlert",
    gridSize: GRID_CONFIG.BATTLESHIP_GRID_SIZE,
  },
  [GAME_TYPES.MEMORY_DUEL]: {
    id: GAME_TYPES.MEMORY_DUEL,
    title: "Memory Duel",
    slug: "memory",
    description: "Turn-based card matching duel with speed combos.",
    icon: "BrainCircuit",
    gridSize: GRID_CONFIG.MEMORY_GRID_SIZE,
  },
} as const;

// ==========================================
// Cell States
// ==========================================

export const BATTLESHIP_CELL = {
  EMPTY: 0,
  CARRIER: 1,
  BATTLESHIP: 2,
  CRUISER: 3,
  SUBMARINE: 4,
  DESTROYER: 5,
  MISS: 10,
  HIT: 11,
} as const;

export const XO_CELL = {
  EMPTY: 0,
  X: 1, // Player 1 (Creator)
  O: 2, // Player 2 (Joiner)
} as const;

// ==========================================
// Blockchain & Network Configuration
// ==========================================

export const CHAIN_IDS = {
  SEPOLIA: 11155111,
  ARBITRUM_SEPOLIA: 421614,
  HARDHAT: 31337,
} as const;

export const ZERO_ADDRESS: `0x${string}` =
  "0x0000000000000000000000000000000000000000";

// ==========================================
// Storage & Broadcast Keys
// ==========================================

export const STORAGE_KEYS = {
  BATTLESHIP_VAULT_PREFIX: "chainplay_battleship_vault_",
  SETTINGS: "chainplay_settings_v1",
  MOCK_SESSION: "chainplay_mock_session_v1",
} as const;

export const BROADCAST_CHANNEL_NAME = "chainplay_p2p_channel_v1";

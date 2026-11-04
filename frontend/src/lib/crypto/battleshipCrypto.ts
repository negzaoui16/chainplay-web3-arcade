/**
 * ChainPlay - Battleship Cryptographic Engine & Local Vault
 *
 * Provides cryptographic commit-reveal hashing matching the Solidity smart contract:
 *   keccak256(encodePacked(['uint8[100]', 'bytes32'], [flatBoard, salt]))
 *   keccak256(encodePacked(['uint256', 'uint8', 'uint8', 'bool', 'bytes32'], [gameId, x, y, isHit, salt]))
 *
 * Strict immutability, zero `any` types, browser + node compatible.
 */

import { encodePacked, keccak256, toHex } from "viem";
import type {
  ShipPlacement,
  ShipId,
  ShipOrientation,
  Coordinate,
  CommitData,
} from "../../types";
import {
  FLEET_LIST,
  TOTAL_SHIP_CELLS,
  GRID_CONFIG,
  STORAGE_KEYS,
} from "../../config/constants";

// Expected sizes mapped by ShipId
const SHIP_SIZE_BY_ID: Record<ShipId, number> = {
  1: 5, // Carrier
  2: 4, // Battleship
  3: 3, // Cruiser
  4: 3, // Submarine
  5: 2, // Destroyer
};

const GRID_SIZE = GRID_CONFIG.BATTLESHIP_GRID_SIZE; // 10
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE; // 100

/**
 * Generates 32 cryptographically secure random bytes as a 0x-prefixed hex string.
 * Works seamlessly in modern browsers and Node/worker environments.
 */
export function generateSalt(): `0x${string}` {
  const cryptoObj =
    typeof window !== "undefined" && window.crypto
      ? window.crypto
      : typeof globalThis !== "undefined" && globalThis.crypto
      ? globalThis.crypto
      : undefined;

  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
    throw new Error(
      "Cryptographically secure random number generator is unavailable."
    );
  }

  const bytes = new Uint8Array(32);
  cryptoObj.getRandomValues(bytes);
  return toHex(bytes);
}

/**
 * Computes all occupied coordinates for a placed ship based on start and orientation.
 */
export function getShipCoordinates(ship: {
  startX: number;
  startY: number;
  size: number;
  orientation: ShipOrientation;
}): Coordinate[] {
  const coords: Coordinate[] = [];
  for (let i = 0; i < ship.size; i++) {
    if (ship.orientation === "HORIZONTAL") {
      coords.push({ x: ship.startX + i, y: ship.startY });
    } else {
      coords.push({ x: ship.startX, y: ship.startY + i });
    }
  }
  return coords;
}

export interface FleetValidationResult {
  valid: boolean;
  error?: string;
  flatBoard: number[];
}

/**
 * Validates fleet placement rules:
 * - Exactly 5 ships corresponding to ShipId 1..5
 * - All ships fit strictly inside 10x10 bounds
 * - Each ship size matches its required length (total 17 cells)
 * - Zero overlapping ship cells
 * - Serializes board into a 100-number flat array (0 = water, 1..5 = ship ID)
 */
export function validateFleetPlacement(
  ships: ShipPlacement[]
): FleetValidationResult {
  const emptyBoard = (): number[] => new Array<number>(TOTAL_CELLS).fill(0);

  if (!Array.isArray(ships) || ships.length !== 5) {
    return {
      valid: false,
      error: `Invalid ship count: expected 5 ships, received ${ships?.length ?? 0}`,
      flatBoard: emptyBoard(),
    };
  }

  const foundIds = new Set<ShipId>();
  const flatBoard = emptyBoard();
  let totalCellsCount = 0;

  for (const ship of ships) {
    // Validate Ship ID range
    if (!ship || typeof ship.shipId !== "number" || ship.shipId < 1 || ship.shipId > 5) {
      return {
        valid: false,
        error: `Invalid shipId: ${ship?.shipId}. Expected 1 to 5.`,
        flatBoard: emptyBoard(),
      };
    }

    if (foundIds.has(ship.shipId)) {
      return {
        valid: false,
        error: `Duplicate ship detected for shipId ${ship.shipId}.`,
        flatBoard: emptyBoard(),
      };
    }
    foundIds.add(ship.shipId);

    // Validate size matches expected configuration
    const expectedSize = SHIP_SIZE_BY_ID[ship.shipId];
    if (ship.size !== expectedSize) {
      return {
        valid: false,
        error: `Invalid size for shipId ${ship.shipId}: expected ${expectedSize}, got ${ship.size}`,
        flatBoard: emptyBoard(),
      };
    }

    // Validate orientation
    if (ship.orientation !== "HORIZONTAL" && ship.orientation !== "VERTICAL") {
      return {
        valid: false,
        error: `Invalid orientation '${ship.orientation}' for shipId ${ship.shipId}.`,
        flatBoard: emptyBoard(),
      };
    }

    // Boundary check start point
    if (
      ship.startX < 0 ||
      ship.startX >= GRID_SIZE ||
      ship.startY < 0 ||
      ship.startY >= GRID_SIZE
    ) {
      return {
        valid: false,
        error: `Ship ${ship.name} starting position (${ship.startX}, ${ship.startY}) is out of bounds.`,
        flatBoard: emptyBoard(),
      };
    }

    // Boundary check full footprint
    if (ship.orientation === "HORIZONTAL") {
      if (ship.startX + ship.size > GRID_SIZE) {
        return {
          valid: false,
          error: `Ship ${ship.name} extends beyond right grid boundary (${ship.startX + ship.size} > ${GRID_SIZE}).`,
          flatBoard: emptyBoard(),
        };
      }
    } else {
      if (ship.startY + ship.size > GRID_SIZE) {
        return {
          valid: false,
          error: `Ship ${ship.name} extends beyond bottom grid boundary (${ship.startY + ship.size} > ${GRID_SIZE}).`,
          flatBoard: emptyBoard(),
        };
      }
    }

    // Check collision and record cells
    const coords = getShipCoordinates(ship);
    for (const coord of coords) {
      const cellIndex = coord.y * GRID_SIZE + coord.x;
      const existing = flatBoard[cellIndex];
      if (existing !== undefined && existing !== 0) {
        return {
          valid: false,
          error: `Collision detected: cell (${coord.x}, ${coord.y}) is already occupied by ship ${existing}.`,
          flatBoard: emptyBoard(),
        };
      }
      flatBoard[cellIndex] = ship.shipId;
      totalCellsCount++;
    }
  }

  // Ensure all 5 ship IDs (1..5) are present
  for (let id = 1; id <= 5; id++) {
    if (!foundIds.has(id as ShipId)) {
      return {
        valid: false,
        error: `Missing required ship ID: ${id}`,
        flatBoard: emptyBoard(),
      };
    }
  }

  // Ensure total occupied cells equals 17
  if (totalCellsCount !== TOTAL_SHIP_CELLS) {
    return {
      valid: false,
      error: `Total occupied cells (${totalCellsCount}) must equal ${TOTAL_SHIP_CELLS}.`,
      flatBoard: emptyBoard(),
    };
  }

  return {
    valid: true,
    flatBoard,
  };
}

/**
 * Computes the 32-byte Keccak256 commitment hash of the 10x10 board.
 * Exact cryptographic match with Battleship.sol:
 * keccak256(abi.encodePacked(uint8[100] flatBoard, bytes32 salt))
 */
export function generateBoardHash(
  flatBoard: number[],
  salt: `0x${string}`
): `0x${string}` {
  if (!Array.isArray(flatBoard) || flatBoard.length !== TOTAL_CELLS) {
    throw new Error(
      `Invalid flatBoard length: expected ${TOTAL_CELLS}, received ${flatBoard?.length ?? 0}`
    );
  }

  if (!salt || !salt.startsWith("0x") || salt.length !== 66) {
    throw new Error("Invalid salt: must be a 32-byte 0x-hex string (66 chars).");
  }

  return keccak256(
    encodePacked(["uint8[100]", "bytes32"], [flatBoard, salt])
  );
}

/**
 * Computes a single-cell reveal cryptographic proof.
 * Matches Battleship.sol revealShot verification:
 * keccak256(abi.encodePacked(uint256 gameId, uint8 x, uint8 y, bool isHit, bytes32 salt))
 */
export function generateCellProof(
  gameId: bigint,
  x: number,
  y: number,
  isHit: boolean,
  salt: `0x${string}`
): `0x${string}` {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
    throw new Error(
      `Coordinates out of bounds: (${x}, ${y}). Expected 0 <= coordinate < ${GRID_SIZE}.`
    );
  }

  if (!salt || !salt.startsWith("0x") || salt.length !== 66) {
    throw new Error("Invalid salt: must be a 32-byte 0x-hex string (66 chars).");
  }

  return keccak256(
    encodePacked(
      ["uint256", "uint8", "uint8", "bool", "bytes32"],
      [gameId, x, y, isHit, salt]
    )
  );
}

/**
 * Checks whether a shot at (x, y) hits any ship in the fleet.
 */
export function checkShotResult(
  ships: ShipPlacement[],
  x: number,
  y: number
): { isHit: boolean; hitShipId?: ShipId } {
  for (const ship of ships) {
    const coords = getShipCoordinates(ship);
    for (const c of coords) {
      if (c.x === x && c.y === y) {
        return { isHit: true, hitShipId: ship.shipId };
      }
    }
  }
  return { isHit: false };
}

/**
 * Generates a valid, completely non-overlapping, randomized fleet placement.
 */
export function generateRandomFleet(): ShipPlacement[] {
  const maxFleetRetries = 100;

  for (let attempt = 0; attempt < maxFleetRetries; attempt++) {
    const occupied = new Set<number>();
    const placements: ShipPlacement[] = [];
    let success = true;

    // Place larger ships first for better fit probability
    for (const shipDef of FLEET_LIST) {
      const size = shipDef.size;
      const shipId = shipDef.id as ShipId;
      let placed = false;
      const maxShipRetries = 150;

      for (let r = 0; r < maxShipRetries; r++) {
        const orientation: ShipOrientation =
          Math.random() < 0.5 ? "HORIZONTAL" : "VERTICAL";

        let startX = 0;
        let startY = 0;

        if (orientation === "HORIZONTAL") {
          startX = Math.floor(Math.random() * (GRID_SIZE - size + 1));
          startY = Math.floor(Math.random() * GRID_SIZE);
        } else {
          startX = Math.floor(Math.random() * GRID_SIZE);
          startY = Math.floor(Math.random() * (GRID_SIZE - size + 1));
        }

        const coords = getShipCoordinates({ startX, startY, size, orientation });
        const hasCollision = coords.some((c) => occupied.has(c.y * GRID_SIZE + c.x));

        if (!hasCollision) {
          coords.forEach((c) => occupied.add(c.y * GRID_SIZE + c.x));
          placements.push({
            shipId,
            name: shipDef.name,
            size,
            startX,
            startY,
            orientation,
            hits: 0,
            isSunk: false,
          });
          placed = true;
          break;
        }
      }

      if (!placed) {
        success = false;
        break;
      }
    }

    if (success && placements.length === 5) {
      const validation = validateFleetPlacement(placements);
      if (validation.valid) {
        return placements;
      }
    }
  }

  throw new Error("Failed to generate random fleet after multiple attempts.");
}

// ==========================================
// Local Secret Vault Management
// ==========================================

function getVaultStorageKey(gameId: string, playerAddress: string): string {
  return `${STORAGE_KEYS.BATTLESHIP_VAULT_PREFIX}${gameId}_${playerAddress.toLowerCase()}`;
}

/**
 * Persists secret game commitment data (flatBoard, salt, hash, fleet) to localStorage.
 */
export function saveSecretVault(
  gameId: string,
  playerAddress: string,
  data: CommitData
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    const key = getVaultStorageKey(gameId, playerAddress);
    const serialized = JSON.stringify(data);
    window.localStorage.setItem(key, serialized);
  } catch (error) {
    console.error("Failed to save Battleship secret vault to localStorage:", error);
  }
}

/**
 * Retrieves persisted secret game commitment data from localStorage.
 */
export function loadSecretVault(
  gameId: string,
  playerAddress: string
): CommitData | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const key = getVaultStorageKey(gameId, playerAddress);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "flatBoard" in parsed &&
      "salt" in parsed &&
      "boardHash" in parsed &&
      "ships" in parsed
    ) {
      return parsed as CommitData;
    }
    return null;
  } catch (error) {
    console.error("Failed to load Battleship secret vault from localStorage:", error);
    return null;
  }
}

/**
 * Deletes persisted secret game commitment data from localStorage.
 */
export function clearSecretVault(
  gameId: string,
  playerAddress: string
): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    const key = getVaultStorageKey(gameId, playerAddress);
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error("Failed to clear Battleship secret vault from localStorage:", error);
  }
}

/**
 * Exports player secret backup formatted for display or manual emergency download.
 */
export function exportSecretKeyBackup(data: CommitData): string {
  return JSON.stringify(data, null, 2);
}

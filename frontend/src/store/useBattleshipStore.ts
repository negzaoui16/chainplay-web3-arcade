/**
 * ChainPlay - Battleship Arena State Store (Zustand)
 *
 * Full lifecycle naval warfare engine:
 * - Interactive fleet placement, drag/drop, rotation, and auto-randomization
 * - Cryptographic commit generation (Keccak256 hash + 32-byte salt)
 * - Turn-based firing and dual radar grids (offensive radar & defensive waters)
 * - Cryptographic reveal and end-of-game board integrity verification
 * - Synthesized audio integration (torpedo, explosion, splash, victory, defeat)
 *
 * Zero `any` types. Strict TypeScript.
 */

import { create } from "zustand";
import type {
  ShipPlacement,
  ShipId,
  ShipOrientation,
  Coordinate,
  ShotRecord,
  ShotResult,
} from "../types/battleship.types";
import {
  generateSalt,
  generateBoardHash,
  validateFleetPlacement,
  generateRandomFleet,
  checkShotResult,
  saveSecretVault,
} from "../lib/crypto/battleshipCrypto";
import {
  playTileClick,
  playTorpedo,
  playExplosion,
  playSplash,
  playVictory,
  playDefeat,
} from "../lib/utils/soundEffects";

export type BattleshipUIPhase =
  | "PLACEMENT"
  | "WAITING_COMMIT"
  | "COMBAT"
  | "VERIFYING"
  | "FINISHED";

export interface BattleshipState {
  gameId: string | null;
  phase: BattleshipUIPhase;

  // Fleet placement state
  myAddress: string;
  myShips: ShipPlacement[];
  myFlatBoard: number[];
  mySalt: `0x${string}` | null;
  myBoardHash: `0x${string}` | null;
  isCommitted: boolean;

  // Opponent state
  opponentAddress: string;
  opponentCommitted: boolean;
  opponentBoardHash: `0x${string}` | null;

  // Radar grids & targeting
  defensiveShots: ShotRecord[]; // Shots fired by enemy on my grid
  offensiveShots: ShotRecord[]; // Shots fired by me on enemy grid
  selectedTarget: Coordinate | null;
  currentTurn: string;

  // Sunk fleet tracking
  mySunkShips: ShipId[];
  opponentSunkShips: ShipId[];
  winner: string | null;
  isVerified: boolean;

  // Actions
  initGame: (gameId: string, playerAddress: string, opponentAddress: string) => void;
  placeShip: (
    shipId: ShipId,
    startX: number,
    startY: number,
    orientation: ShipOrientation
  ) => boolean;
  rotateShip: (shipId: ShipId) => boolean;
  autoDeployRandom: () => void;
  commitFleet: (playerAddress: string) => Promise<`0x${string}`>;
  setOpponentCommitment: (hash: `0x${string}`) => void;
  setSelectedTarget: (coord: Coordinate | null) => void;
  fireShotOptimistic: (x: number, y: number) => boolean;
  receiveShot: (x: number, y: number) => ShotResult;
  revealShotResult: (
    x: number,
    y: number,
    result: ShotResult,
    sunkShipId?: ShipId
  ) => void;
  verifyFinalBoard: (flatBoard: number[], salt: `0x${string}`) => boolean;
  switchTurn: (nextPlayerAddress: string) => void;
  reset: () => void;
}

const EMPTY_BOARD: number[] = new Array<number>(100).fill(0);

/**
 * Generates initial default fleet placement to display before user modifies or randomizes.
 */
function createInitialFleet(): { ships: ShipPlacement[]; flatBoard: number[] } {
  try {
    const ships = generateRandomFleet();
    const validation = validateFleetPlacement(ships);
    return { ships, flatBoard: validation.flatBoard };
  } catch {
    return { ships: [], flatBoard: [...EMPTY_BOARD] };
  }
}

const initialSetup = createInitialFleet();

export const useBattleshipStore = create<BattleshipState>()((set, get) => ({
  gameId: null,
  phase: "PLACEMENT",

  myAddress: "",
  myShips: initialSetup.ships,
  myFlatBoard: initialSetup.flatBoard,
  mySalt: null,
  myBoardHash: null,
  isCommitted: false,

  opponentAddress: "",
  opponentCommitted: false,
  opponentBoardHash: null,

  defensiveShots: [],
  offensiveShots: [],
  selectedTarget: null,
  currentTurn: "",

  mySunkShips: [],
  opponentSunkShips: [],
  winner: null,
  isVerified: false,

  initGame: (gameId: string, playerAddress: string, opponentAddress: string) => {
    const setup = createInitialFleet();
    set({
      gameId,
      phase: "PLACEMENT",
      myAddress: playerAddress.toLowerCase(),
      myShips: setup.ships,
      myFlatBoard: setup.flatBoard,
      mySalt: null,
      myBoardHash: null,
      isCommitted: false,
      opponentAddress: opponentAddress.toLowerCase(),
      opponentCommitted: false,
      opponentBoardHash: null,
      defensiveShots: [],
      offensiveShots: [],
      selectedTarget: null,
      currentTurn: playerAddress.toLowerCase(),
      mySunkShips: [],
      opponentSunkShips: [],
      winner: null,
      isVerified: false,
    });
  },

  placeShip: (
    shipId: ShipId,
    startX: number,
    startY: number,
    orientation: ShipOrientation
  ): boolean => {
    const { phase, myShips } = get();
    if (phase !== "PLACEMENT") return false;

    const tentativeShips = myShips.map((ship) => {
      if (ship.shipId === shipId) {
        return {
          ...ship,
          startX,
          startY,
          orientation,
        };
      }
      return ship;
    });

    const validation = validateFleetPlacement(tentativeShips);
    if (!validation.valid) {
      return false;
    }

    playTileClick();
    set({
      myShips: tentativeShips,
      myFlatBoard: validation.flatBoard,
    });
    return true;
  },

  rotateShip: (shipId: ShipId): boolean => {
    const { phase, myShips } = get();
    if (phase !== "PLACEMENT") return false;

    const target = myShips.find((s) => s.shipId === shipId);
    if (!target) return false;

    const newOrientation: ShipOrientation =
      target.orientation === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL";

    return get().placeShip(shipId, target.startX, target.startY, newOrientation);
  },

  autoDeployRandom: () => {
    const { phase } = get();
    if (phase !== "PLACEMENT") return;

    const newFleet = generateRandomFleet();
    const validation = validateFleetPlacement(newFleet);
    if (validation.valid) {
      playTileClick();
      set({
        myShips: newFleet,
        myFlatBoard: validation.flatBoard,
      });
    }
  },

  commitFleet: async (playerAddress: string): Promise<`0x${string}`> => {
    const { gameId, myShips, opponentCommitted } = get();

    const validation = validateFleetPlacement(myShips);
    if (!validation.valid) {
      throw new Error(`Cannot commit invalid fleet: ${validation.error}`);
    }

    const salt = generateSalt();
    const boardHash = generateBoardHash(validation.flatBoard, salt);

    if (gameId) {
      saveSecretVault(gameId, playerAddress, {
        flatBoard: validation.flatBoard,
        ships: myShips,
        salt,
        boardHash,
        timestamp: Date.now(),
      });
    }

    const nextPhase: BattleshipUIPhase = opponentCommitted
      ? "COMBAT"
      : "WAITING_COMMIT";

    set({
      mySalt: salt,
      myBoardHash: boardHash,
      myFlatBoard: validation.flatBoard,
      isCommitted: true,
      phase: nextPhase,
      // Default initial turn to player 1
      currentTurn: playerAddress.toLowerCase(),
    });

    return boardHash;
  },

  setOpponentCommitment: (hash: `0x${string}`) => {
    const { isCommitted } = get();
    const nextPhase: BattleshipUIPhase = isCommitted ? "COMBAT" : "PLACEMENT";

    set({
      opponentCommitted: true,
      opponentBoardHash: hash,
      phase: isCommitted ? nextPhase : get().phase,
    });
  },

  setSelectedTarget: (coord: Coordinate | null) => {
    set({ selectedTarget: coord });
  },

  fireShotOptimistic: (x: number, y: number): boolean => {
    const { phase, offensiveShots } = get();
    if (phase !== "COMBAT") return false;
    if (x < 0 || x >= 10 || y < 0 || y >= 10) return false;

    const alreadyFired = offensiveShots.some((s) => s.x === x && s.y === y);
    if (alreadyFired) return false;

    playTorpedo();
    set({ selectedTarget: null });
    return true;
  },

  receiveShot: (x: number, y: number): ShotResult => {
    const state = get();

    // Guard against duplicate shots on the same coordinate
    const existing = state.defensiveShots.find((s) => s.x === x && s.y === y);
    if (existing) {
      return existing.result;
    }

    const shotOutcome = checkShotResult(state.myShips, x, y);

    let result: ShotResult = "MISS";
    let sunkShipId: ShipId | undefined = undefined;

    if (shotOutcome.isHit && shotOutcome.hitShipId !== undefined) {
      const hitId = shotOutcome.hitShipId;
      const updatedShips = state.myShips.map((s) => {
        if (s.shipId === hitId) {
          const hits = s.hits + 1;
          const isSunk = hits >= s.size;
          if (isSunk) {
            sunkShipId = hitId;
          }
          return { ...s, hits, isSunk };
        }
        return s;
      });

      const isSunk = sunkShipId !== undefined;
      result = isSunk ? "SUNK" : "HIT";
      playExplosion();

      const nextSunkShips: ShipId[] = isSunk && !state.mySunkShips.includes(hitId)
        ? [...state.mySunkShips, hitId]
        : state.mySunkShips;

      const allSunk = nextSunkShips.length === 5;
      if (allSunk) {
        playDefeat();
      }

      const shotRecord: ShotRecord = {
        x,
        y,
        result,
        sunkShipId,
        timestamp: Date.now(),
      };

      set({
        myShips: updatedShips,
        mySunkShips: nextSunkShips,
        defensiveShots: [...state.defensiveShots, shotRecord],
        winner: allSunk ? state.opponentAddress : state.winner,
        phase: allSunk ? "VERIFYING" : state.phase,
      });

      return result;
    } else {
      playSplash();
      const shotRecord: ShotRecord = {
        x,
        y,
        result: "MISS",
        timestamp: Date.now(),
      };

      set({
        defensiveShots: [...state.defensiveShots, shotRecord],
      });

      return "MISS";
    }
  },

  revealShotResult: (
    x: number,
    y: number,
    result: ShotResult,
    sunkShipId?: ShipId
  ) => {
    const state = get();
    const record: ShotRecord = {
      x,
      y,
      result,
      sunkShipId,
      timestamp: Date.now(),
    };

    if (result === "HIT" || result === "SUNK") {
      playExplosion();
    } else {
      playSplash();
    }

    let nextOpponentSunk = [...state.opponentSunkShips];
    if (result === "SUNK" && sunkShipId && !nextOpponentSunk.includes(sunkShipId)) {
      nextOpponentSunk.push(sunkShipId);
    }

    const playerWon = nextOpponentSunk.length === 5;
    if (playerWon) {
      playVictory();
    }

    set({
      offensiveShots: [...state.offensiveShots, record],
      opponentSunkShips: nextOpponentSunk,
      winner: playerWon ? state.currentTurn : state.winner,
      phase: playerWon ? "VERIFYING" : state.phase,
    });
  },

  verifyFinalBoard: (flatBoard: number[], salt: `0x${string}`): boolean => {
    const { opponentBoardHash } = get();
    if (!opponentBoardHash) return false;

    try {
      const calculatedHash = generateBoardHash(flatBoard, salt);
      const isIntegrityValid =
        calculatedHash.toLowerCase() === opponentBoardHash.toLowerCase();

      set({
        isVerified: isIntegrityValid,
        phase: "FINISHED",
      });

      return isIntegrityValid;
    } catch {
      set({ isVerified: false });
      return false;
    }
  },

  switchTurn: (nextPlayerAddress: string) => {
    set({ currentTurn: nextPlayerAddress.toLowerCase() });
  },

  reset: () => {
    const setup = createInitialFleet();
    set({
      gameId: null,
      phase: "PLACEMENT",
      myAddress: "",
      myShips: setup.ships,
      myFlatBoard: setup.flatBoard,
      mySalt: null,
      myBoardHash: null,
      isCommitted: false,
      opponentAddress: "",
      opponentCommitted: false,
      opponentBoardHash: null,
      defensiveShots: [],
      offensiveShots: [],
      selectedTarget: null,
      currentTurn: "",
      mySunkShips: [],
      opponentSunkShips: [],
      winner: null,
      isVerified: false,
    });
  },
}));

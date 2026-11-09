/**
 * ChainPlay - Dual-Mode Mock Engine: Smart Bot AI + Cross-Tab P2P Sync
 *
 * Provides 100% standalone gameplay without external network dependencies:
 * 1. Smart Bot AI Engine:
 *    - Tic-Tac-Toe heuristic minimax / tactical blocker
 *    - Battleship hunt-and-target parity naval radar
 *    - Memory Duel probabilistic recall AI (~45% memory retention)
 *    - Realistic simulated transaction latency (400ms - 800ms)
 *
 * 2. Cross-Tab P2P Engine:
 *    - Native BroadcastChannel ('chainplay_p2p_sync')
 *    - Bidirectional state mirroring across browser tabs
 *    - Handles room creation, join, XO moves, naval commit-reveal, memory turns
 *
 * Zero `any` types. Strict TypeScript.
 */

import type {
  CellValue,
  ShipPlacement,
  Coordinate,
  ShotRecord,
  ShotResult,
  ShipId,
  CardItem,
  RoomMetadata,
} from "../../types";
import { GameType, RoomStatus } from "../../types/lobby.types";
import {
  generateRandomFleet,
  validateFleetPlacement,
  generateSalt,
  generateBoardHash,
  checkShotResult,
} from "../crypto/battleshipCrypto";
import { WINNING_COMBINATIONS } from "../../store/useTicTacToeStore";
import { useLobbyStore, deserializeRooms } from "../../store/useLobbyStore";
import { useTicTacToeStore } from "../../store/useTicTacToeStore";
import { useBattleshipStore } from "../../store/useBattleshipStore";
import { useMemoryStore } from "../../store/useMemoryStore";
import { useAppStore } from "../../store/useAppStore";

export const MOCK_BOT_ADDRESS = "0xBOT000000000000000000000000000000000B07";
export const P2P_BROADCAST_CHANNEL_NAME = "chainplay_p2p_sync";

// ============================================================================
// Latency Simulation Helper
// ============================================================================

/**
 * Simulates EVM transaction confirmation latency.
 */
export function simulateTxDelay(
  minMs: number = 400,
  maxMs: number = 800
): Promise<void> {
  const duration = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, duration));
}

// ============================================================================
// PART 1: SMART BOT AI ENGINE
// ============================================================================

/**
 * Tactical AI for Tic-Tac-Toe:
 * 1. Checks if bot can immediately win
 * 2. Blocks opponent winning lines
 * 3. Takes strategic center cell
 * 4. Takes strategic corner cells
 * 5. Falls back to available edges
 */
export function botPlayTicTacToe(
  board: CellValue[],
  botSymbol: 1 | 2
): number {
  const opponentSymbol: 1 | 2 = botSymbol === 1 ? 2 : 1;

  // 1. Can Bot Win on this move?
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const valA = board[a];
    const valB = board[b];
    const valC = board[c];

    if (valA === botSymbol && valB === botSymbol && valC === 0) return c;
    if (valA === botSymbol && valC === botSymbol && valB === 0) return b;
    if (valB === botSymbol && valC === botSymbol && valA === 0) return a;
  }

  // 2. Can Opponent Win on their next move? Block them!
  for (const [a, b, c] of WINNING_COMBINATIONS) {
    const valA = board[a];
    const valB = board[b];
    const valC = board[c];

    if (valA === opponentSymbol && valB === opponentSymbol && valC === 0) return c;
    if (valA === opponentSymbol && valC === opponentSymbol && valB === 0) return b;
    if (valB === opponentSymbol && valC === opponentSymbol && valA === 0) return a;
  }

  // 3. Take Center if free
  if (board[4] === 0) {
    return 4;
  }

  // 4. Strategic Corners: [0, 2, 6, 8]
  const corners = [0, 2, 6, 8];
  const freeCorners = corners.filter((idx) => board[idx] === 0);
  if (freeCorners.length > 0) {
    const chosenCorner = freeCorners[Math.floor(Math.random() * freeCorners.length)];
    if (chosenCorner !== undefined) return chosenCorner;
  }

  // 5. Strategic Edges: [1, 3, 5, 7]
  const edges = [1, 3, 5, 7];
  const freeEdges = edges.filter((idx) => board[idx] === 0);
  if (freeEdges.length > 0) {
    const chosenEdge = freeEdges[Math.floor(Math.random() * freeEdges.length)];
    if (chosenEdge !== undefined) return chosenEdge;
  }

  // Fallback to any open cell
  const openIndices = board
    .map((val, idx) => (val === 0 ? idx : -1))
    .filter((idx) => idx !== -1);

  return openIndices[0] ?? 0;
}

/**
 * Generates and commits a valid randomized fleet for the bot in Battleship.
 */
export function botSetupBattleship(): {
  ships: ShipPlacement[];
  flatBoard: number[];
  salt: `0x${string}`;
  boardHash: `0x${string}`;
} {
  const ships = generateRandomFleet();
  const validation = validateFleetPlacement(ships);
  if (!validation.valid) {
    throw new Error("Bot failed to generate valid fleet placement");
  }
  const salt = generateSalt();
  const boardHash = generateBoardHash(validation.flatBoard, salt);

  return {
    ships,
    flatBoard: validation.flatBoard,
    salt,
    boardHash,
  };
}

/**
 * Hunt-and-Target Naval Radar AI for Battleship:
 * - Target Mode: When hits exist on unsunk ships, systematically searches orthogonal neighbors.
 * - Hunt Mode: Uses checkerboard parity search ((x + y) % 2 === 0) to maximize hit efficiency.
 */
export function botFireBattleshipShot(
  offensiveShotsByBot: ShotRecord[]
): Coordinate {
  const firedMap = new Set<string>(
    offensiveShotsByBot.map((s) => `${s.x},${s.y}`)
  );

  // Identify hits on ships not yet fully sunk
  const hits = offensiveShotsByBot.filter(
    (s) => s.result === "HIT" || s.result === "SUNK"
  );

  // In Target Mode: search adjacent cells for any unsunk hit
  const targetCandidates: Coordinate[] = [];
  const alignedCandidates: Coordinate[] = [];

  for (const hit of hits) {
    const neighbors: Coordinate[] = [
      { x: hit.x + 1, y: hit.y },
      { x: hit.x - 1, y: hit.y },
      { x: hit.x, y: hit.y + 1 },
      { x: hit.x, y: hit.y - 1 },
    ];

    for (const n of neighbors) {
      if (n.x >= 0 && n.x < 10 && n.y >= 0 && n.y < 10) {
        if (!firedMap.has(`${n.x},${n.y}`)) {
          // Check if this neighbor aligns with another hit (straight line priority)
          const isAligned = hits.some(
            (other) =>
              other !== hit &&
              ((other.x === hit.x && other.x === n.x) ||
                (other.y === hit.y && other.y === n.y))
          );

          if (isAligned) {
            alignedCandidates.push(n);
          } else {
            targetCandidates.push(n);
          }
        }
      }
    }
  }

  // Prioritize aligned straight line shots if available
  if (alignedCandidates.length > 0) {
    const picked =
      alignedCandidates[Math.floor(Math.random() * alignedCandidates.length)];
    if (picked) return picked;
  }

  // Otherwise pick any adjacent target candidate
  if (targetCandidates.length > 0) {
    const picked =
      targetCandidates[Math.floor(Math.random() * targetCandidates.length)];
    if (picked) return picked;
  }

  // Hunt Mode: Checkerboard parity ((x + y) % 2 === 0)
  const parityCandidates: Coordinate[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if ((x + y) % 2 === 0 && !firedMap.has(`${x},${y}`)) {
        parityCandidates.push({ x, y });
      }
    }
  }

  if (parityCandidates.length > 0) {
    const picked =
      parityCandidates[Math.floor(Math.random() * parityCandidates.length)];
    if (picked) return picked;
  }

  // Fallback to any remaining unfired cell
  const allRemaining: Coordinate[] = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (!firedMap.has(`${x},${y}`)) {
        allRemaining.push({ x, y });
      }
    }
  }

  return (
    allRemaining[Math.floor(Math.random() * allRemaining.length)] ?? {
      x: 0,
      y: 0,
    }
  );
}

// Bot memory cache for Memory Duel
const botMemoryCache = new Map<number, number>(); // cardIndex -> symbolId

/**
 * Records observed card into bot's recall memory with probabilistic retention (~45%).
 */
export function recordMemoryCardObservation(
  cardIndex: number,
  symbolId: number,
  forceRemember: boolean = false
): void {
  if (forceRemember || Math.random() < 0.45) {
    botMemoryCache.set(cardIndex, symbolId);
  }
}

/**
 * Resets bot recall memory cache for a fresh match.
 */
export function resetBotMemoryCache(): void {
  botMemoryCache.clear();
}

/**
 * Retrieves the bot recall memory cache (for testing/diagnostics).
 */
export function getBotMemoryCache(): Map<number, number> {
  return botMemoryCache;
}

/**
 * Probabilistic Memory Duel AI (~45% recall memory):
 * - Remembers observed cards with ~45% probability
 * - If a matching pair is known in memory, selects both
 * - If a selected first card matches a known card in memory, pairs it
 */
export function botPlayMemoryDuel(
  cards: CardItem[]
): { first: number; second: number } {
  // Clean up any cards in bot memory that are already matched
  for (const [idx] of botMemoryCache) {
    if (cards[idx]?.isMatched) {
      botMemoryCache.delete(idx);
    }
  }

  // Also record any currently flipped cards into memory
  cards.forEach((card, idx) => {
    if (card.isFlipped && !card.isMatched) {
      recordMemoryCardObservation(idx, card.symbolId);
    }
  });

  // 1. Look for known matching pairs in memory
  const memoryEntries = Array.from(botMemoryCache.entries()).filter(
    ([idx]) => !cards[idx]?.isMatched
  );

  for (let i = 0; i < memoryEntries.length; i++) {
    for (let j = i + 1; j < memoryEntries.length; j++) {
      const entryA = memoryEntries[i];
      const entryB = memoryEntries[j];
      if (entryA && entryB && entryA[1] === entryB[1]) {
        return { first: entryA[0], second: entryB[0] };
      }
    }
  }

  // 2. Pick first card: select any unrevealed, unmatched card
  const availableIndices = cards
    .map((c, i) => (!c.isMatched && !c.isFlipped ? i : -1))
    .filter((i) => i !== -1);

  if (availableIndices.length === 0) {
    return { first: 0, second: 1 };
  }

  const firstIndex =
    availableIndices[Math.floor(Math.random() * availableIndices.length)] ?? 0;
  const firstCard = cards[firstIndex];

  // 3. Check if first card's symbol matches another known card in memory
  if (firstCard) {
    botMemoryCache.set(firstIndex, firstCard.symbolId);

    const matchingMemory = memoryEntries.find(
      ([idx, sym]) => idx !== firstIndex && sym === firstCard.symbolId
    );

    if (matchingMemory) {
      return { first: firstIndex, second: matchingMemory[0] };
    }
  }

  // 4. Otherwise pick another random available card
  const remainingAvailable = availableIndices.filter((idx) => idx !== firstIndex);
  const secondIndex =
    remainingAvailable[
      Math.floor(Math.random() * remainingAvailable.length)
    ] ?? (firstIndex === 0 ? 1 : 0);

  return { first: firstIndex, second: secondIndex };
}

// Bot state storage for Battleship matches against bot
let botBattleshipState: {
  gameId: string;
  ships: ShipPlacement[];
  flatBoard: number[];
  salt: `0x${string}`;
  boardHash: `0x${string}`;
} | null = null;

/**
 * Handles incoming player shot against the Bot's secret fleet in Battleship.
 */
export function botReceiveShot(
  x: number,
  y: number
): {
  result: ShotResult;
  sunkShipId?: ShipId;
} {
  if (!botBattleshipState) {
    const setup = botSetupBattleship();
    botBattleshipState = {
      gameId: "mock",
      ...setup,
    };
  }

  const outcome = checkShotResult(botBattleshipState.ships, x, y);
  if (outcome.isHit && outcome.hitShipId !== undefined) {
    const hitId = outcome.hitShipId;
    let sunkShipId: ShipId | undefined = undefined;

    botBattleshipState.ships = botBattleshipState.ships.map((s) => {
      if (s.shipId === hitId) {
        const hits = s.hits + 1;
        const isSunk = hits >= s.size;
        if (isSunk) sunkShipId = hitId;
        return { ...s, hits, isSunk };
      }
      return s;
    });

    return {
      result: sunkShipId !== undefined ? "SUNK" : "HIT",
      sunkShipId,
    };
  }

  return { result: "MISS" };
}

/**
 * Exposes bot board and salt for final game verification.
 */
export function getBotBattleshipSecret(): {
  flatBoard: number[];
  salt: `0x${string}`;
} | null {
  if (!botBattleshipState) return null;
  return {
    flatBoard: botBattleshipState.flatBoard,
    salt: botBattleshipState.salt,
  };
}

/**
 * Triggers the bot's turn action based on the active game type.
 */
export async function triggerBotTurn(
  gameType: GameType,
  gameId: string
): Promise<void> {
  const { mockSubMode } = useAppStore.getState();
  if (mockSubMode !== "bot") return;

  await simulateTxDelay(500, 850);

  switch (gameType) {
    case GameType.TIC_TAC_TOE: {
      const store = useTicTacToeStore.getState();
      if (
        store.gameId === gameId &&
        store.currentTurn.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase() &&
        store.winner === null &&
        !store.isDraw
      ) {
        const botSymbol: 1 | 2 =
          store.player1?.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase() ? 1 : 2;
        const chosenCell = botPlayTicTacToe(store.board, botSymbol);
        store.confirmMove(chosenCell, botSymbol, MOCK_BOT_ADDRESS);
      }
      break;
    }

    case GameType.BATTLESHIP: {
      const store = useBattleshipStore.getState();
      if (store.gameId !== gameId) return;

      // Handle Bot Commit Phase
      if (!store.opponentCommitted) {
        const setup = botSetupBattleship();
        botBattleshipState = {
          gameId,
          ...setup,
        };
        store.setOpponentCommitment(setup.boardHash);
      }

      // Handle Bot Combat Shot Phase
      if (
        store.phase === "COMBAT" &&
        store.currentTurn.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase() &&
        store.winner === null
      ) {
        // Bot fires shot on player
        const target = botFireBattleshipShot(store.defensiveShots);
        // Player's store receives shot
        const result = store.receiveShot(target.x, target.y);
        // Bot shot revealed on defender -> return turn to human player
        store.switchTurn(store.myAddress);
        // Check if player won or bot won
        if (result === "SUNK" && store.mySunkShips.length === 5) {
          // Game ends
        }
      }
      break;
    }

    case GameType.MEMORY_DUEL: {
      const store = useMemoryStore.getState();
      if (
        store.gameId === gameId &&
        store.currentTurn.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase() &&
        store.winner === null &&
        !store.isDraw &&
        store.turnPhase === "SELECT_FIRST"
      ) {
        const { first, second } = botPlayMemoryDuel(store.cards);
        // Select first card
        store.selectCard(first, MOCK_BOT_ADDRESS);

        // Natural pause between first and second card flip
        await simulateTxDelay(600, 900);
        store.selectCard(second, MOCK_BOT_ADDRESS);
      }
      break;
    }
  }
}

// ============================================================================
// PART 2: CROSS-TAB P2P BROADCASTCHANNEL ENGINE
// ============================================================================

export type P2PMessageType =
  | "ROOM_CREATED"
  | "ROOM_JOINED"
  | "ROOM_CANCELLED"
  | "ROOMS_SYNC"
  | "XO_MOVE"
  | "XO_TIMEOUT_CLAIM"
  | "BATTLESHIP_COMMIT"
  | "BATTLESHIP_SHOT"
  | "BATTLESHIP_REVEAL"
  | "MEMORY_SELECT"
  | "GAME_OVER";

export interface P2PMessage<T = unknown> {
  type: P2PMessageType;
  sender: string;
  tabSessionId: string;
  timestamp: number;
  payload: T;
}

let broadcastChannelInstance: BroadcastChannel | null = null;

/**
 * Gets or creates the BroadcastChannel instance safely across browser/SSR environments.
 */
export function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (!broadcastChannelInstance) {
    try {
      broadcastChannelInstance = new BroadcastChannel(P2P_BROADCAST_CHANNEL_NAME);
      attachBroadcastChannelListener(broadcastChannelInstance);
    } catch (err) {
      console.warn("BroadcastChannel initialization failed:", err);
      return null;
    }
  }

  return broadcastChannelInstance;
}

/**
 * Dispatches an event to other open tabs via BroadcastChannel.
 */
export function broadcastP2PMessage<T>(
  type: P2PMessageType,
  payload: T
): void {
  const channel = getBroadcastChannel();
  if (!channel) return;

  const appState = useAppStore.getState();
  const message: P2PMessage<T> = {
    type,
    sender: appState.mockPlayerAddress,
    tabSessionId: appState.tabSessionId,
    timestamp: Date.now(),
    payload,
  };

  try {
    channel.postMessage(message);
  } catch (err) {
    console.warn("Failed to broadcast P2P message:", err);
  }
}

/**
 * Attaches message listeners to process synchronized state from peer tabs.
 */
function attachBroadcastChannelListener(channel: BroadcastChannel): void {
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const raw = event.data;
    if (!raw || typeof raw !== "object" || !("type" in raw)) return;

    const message = raw as P2PMessage<Record<string, unknown>>;
    const currentTabId = useAppStore.getState().tabSessionId;

    // Ignore self-dispatched messages
    if (message.tabSessionId === currentTabId) {
      return;
    }

    handleIncomingP2PMessage(message);
  };
}

/**
 * Handles incoming P2P synchronized actions across tabs.
 */
export function handleIncomingP2PMessage(
  message: P2PMessage<Record<string, unknown>>
): void {
  const { type, payload } = message;

  switch (type) {
    // ------------------------------------------------------------------------
    // Lobby Synchronization
    // ------------------------------------------------------------------------
    case "ROOM_CREATED": {
      const room = payload as unknown as RoomMetadata;
      if (room && room.id) {
        const lobbyStore = useLobbyStore.getState();
        if (!lobbyStore.rooms.some((r) => r.id === room.id)) {
          lobbyStore.syncRooms([room, ...lobbyStore.rooms]);
        }
      }
      break;
    }

    case "ROOM_JOINED": {
      const { roomId, player2 } = payload as { roomId: string; player2: string };
      if (roomId && player2) {
        useLobbyStore.getState().joinRoom(roomId, player2);
      }
      break;
    }

    case "ROOM_CANCELLED": {
      const { roomId, playerAddress } = payload as {
        roomId: string;
        playerAddress: string;
      };
      if (roomId && playerAddress) {
        useLobbyStore.getState().cancelRoom(roomId, playerAddress);
      }
      break;
    }

    case "ROOMS_SYNC": {
      const { roomsJson } = payload as { roomsJson: string };
      if (roomsJson) {
        const deserialized = deserializeRooms(roomsJson);
        if (deserialized.length > 0) {
          useLobbyStore.getState().syncRooms(deserialized);
        }
      }
      break;
    }

    // ------------------------------------------------------------------------
    // Tic-Tac-Toe Arena Synchronization
    // ------------------------------------------------------------------------
    case "XO_MOVE": {
      const { cellIndex, symbol, player } = payload as {
        cellIndex: number;
        symbol: 1 | 2;
        player: string;
      };
      const xoStore = useTicTacToeStore.getState();
      xoStore.confirmMove(cellIndex, symbol, player);
      break;
    }

    case "XO_TIMEOUT_CLAIM": {
      const { claimingPlayer } = payload as { claimingPlayer: string };
      if (claimingPlayer) {
        useTicTacToeStore.getState().claimTimeoutWin(claimingPlayer);
      }
      break;
    }

    // ------------------------------------------------------------------------
    // Battleship Arena Synchronization
    // ------------------------------------------------------------------------
    case "BATTLESHIP_COMMIT": {
      const { boardHash } = payload as { boardHash: `0x${string}` };
      if (boardHash) {
        useBattleshipStore.getState().setOpponentCommitment(boardHash);
      }
      break;
    }

    case "BATTLESHIP_SHOT": {
      const { x, y } = payload as { x: number; y: number; attacker: string };
      const btlStore = useBattleshipStore.getState();
      // Defender processes shot and broadcasts reveal
      const shotResult = btlStore.receiveShot(x, y);

      // Find if a ship was sunk
      const hitShip = checkShotResult(btlStore.myShips, x, y);
      const hitRecord = btlStore.defensiveShots[btlStore.defensiveShots.length - 1];

      broadcastP2PMessage("BATTLESHIP_REVEAL", {
        x,
        y,
        result: shotResult,
        sunkShipId: hitRecord?.sunkShipId ?? hitShip.hitShipId,
        defender: btlStore.myAddress,
      });

      // Defender's turn to fire next
      btlStore.switchTurn(btlStore.myAddress);
      break;
    }

    case "BATTLESHIP_REVEAL": {
      const { x, y, result, sunkShipId } = payload as {
        x: number;
        y: number;
        result: ShotResult;
        sunkShipId?: ShipId;
        defender: string;
      };
      const btlStore = useBattleshipStore.getState();
      btlStore.revealShotResult(x, y, result, sunkShipId);
      // Attacker has fired and received result, now it is opponent's (defender's) turn to fire
      btlStore.switchTurn(btlStore.opponentAddress);
      break;
    }

    // ------------------------------------------------------------------------
    // Memory Duel Synchronization
    // ------------------------------------------------------------------------
    case "MEMORY_SELECT": {
      const { index, player } = payload as { index: number; player: string };
      if (typeof index === "number" && player) {
        useMemoryStore.getState().selectCard(index, player);
      }
      break;
    }

    case "GAME_OVER": {
      const { roomId, winner } = payload as { roomId: string; winner: string };
      if (roomId) {
        useLobbyStore.getState().updateRoomStatus(roomId, RoomStatus.FINISHED, winner);
      }
      break;
    }
  }
}

/**
 * Initializes listeners for P2P cross-tab synchronization.
 * Call this upon application mount in browser environments.
 */
export function initP2PEngine(): () => void {
  const channel = getBroadcastChannel();

  // Storage event listener as fallback for storage synchronization
  const storageListener = (e: StorageEvent) => {
    if (e.key === "chainplay_mock_rooms_v1" && e.newValue) {
      const deserialized = deserializeRooms(e.newValue);
      if (deserialized.length > 0) {
        useLobbyStore.getState().syncRooms(deserialized);
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", storageListener);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", storageListener);
    }
    if (channel) {
      channel.close();
      broadcastChannelInstance = null;
    }
  };
}

/**
 * ChainPlay - Lobby & Matchmaking State Store (Zustand)
 *
 * Manages open game rooms, matchmaking filters, active room selection,
 * and optimistic room creation/joining/cancellation.
 * Initialized with 3 realistic open rooms for instant exploration.
 *
 * Zero `any` types. Strict TypeScript.
 */

import { create } from "zustand";
import {
  GameType,
  RoomStatus,
  type RoomMetadata,
  type LobbyFilter,
} from "../types/lobby.types";

const MOCK_ROOMS_STORAGE_KEY = "chainplay_mock_rooms_v1";

export const INITIAL_MOCK_ROOMS: RoomMetadata[] = [
  {
    id: "room_mock_ttt_1",
    gameType: GameType.TIC_TAC_TOE,
    player1: "0x71C800000000000000000000000000000000B289",
    player2: null,
    wager: 60000000000000000000n, // 60 CPT
    status: RoomStatus.WAITING,
    winner: null,
    createdAt: Date.now() - 1000 * 60 * 3, // 3 minutes ago
  },
  {
    id: "room_mock_btl_2",
    gameType: GameType.BATTLESHIP,
    player1: "0x4444444444444444444444444444444444444444",
    player2: null,
    wager: 120000000000000000000n, // 120 CPT
    status: RoomStatus.WAITING,
    winner: null,
    createdAt: Date.now() - 1000 * 60 * 12, // 12 minutes ago
  },
  {
    id: "room_mock_mem_3",
    gameType: GameType.MEMORY_DUEL,
    player1: "0x8888888888888888888888888888888888888888",
    player2: null,
    wager: 240000000000000000000n, // 240 CPT
    status: RoomStatus.WAITING,
    winner: null,
    createdAt: Date.now() - 1000 * 60 * 25, // 25 minutes ago
  },
];

export interface SerializedRoom {
  id: string;
  gameType: GameType;
  player1: string;
  player2: string | null;
  wager: string; // serialized BigInt
  status: RoomStatus;
  winner: string | null;
  createdAt: number;
}

/**
 * Safely serialize rooms array handling BigInt wager values.
 */
export function serializeRooms(rooms: RoomMetadata[]): string {
  const serializable: SerializedRoom[] = rooms.map((r) => ({
    ...r,
    wager: r.wager.toString(),
  }));
  return JSON.stringify(serializable);
}

/**
 * Safely deserialize rooms array parsing BigInt wager values.
 */
export function deserializeRooms(json: string): RoomMetadata[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: unknown): RoomMetadata => {
      const r = item as Record<string, unknown>;
      return {
        id: String(r["id"] ?? ""),
        gameType: Number(r["gameType"] ?? 0) as GameType,
        player1: String(r["player1"] ?? ""),
        player2: r["player2"] ? String(r["player2"]) : null,
        wager: BigInt(String(r["wager"] ?? "0")),
        status: Number(r["status"] ?? 0) as RoomStatus,
        winner: r["winner"] ? String(r["winner"]) : null,
        createdAt: Number(r["createdAt"] ?? Date.now()),
      };
    });
  } catch {
    return [];
  }
}

function loadPersistedRooms(): RoomMetadata[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return INITIAL_MOCK_ROOMS;
  }

  try {
    const raw = window.localStorage.getItem(MOCK_ROOMS_STORAGE_KEY);
    if (!raw) return INITIAL_MOCK_ROOMS;
    const deserialized = deserializeRooms(raw);
    return deserialized.length > 0 ? deserialized : INITIAL_MOCK_ROOMS;
  } catch {
    return INITIAL_MOCK_ROOMS;
  }
}

function savePersistedRooms(rooms: RoomMetadata[]): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(MOCK_ROOMS_STORAGE_KEY, serializeRooms(rooms));
  } catch (err) {
    console.warn("Failed to persist rooms to localStorage:", err);
  }
}

export interface LobbyState {
  rooms: RoomMetadata[];
  activeRoomId: string | null;
  activeRoom: RoomMetadata | null;
  filters: LobbyFilter;
  isLoading: boolean;

  // Actions
  createRoom: (params: {
    gameType: GameType;
    wager: bigint;
    player1: string;
  }) => RoomMetadata;
  joinRoom: (roomId: string, player2: string) => boolean;
  cancelRoom: (roomId: string, playerAddress: string) => boolean;
  setActiveRoom: (roomId: string | null) => void;
  updateRoomStatus: (
    roomId: string,
    status: RoomStatus,
    winner?: string | null
  ) => void;
  setFilters: (filters: Partial<LobbyFilter>) => void;
  resetFilters: () => void;
  syncRooms: (rooms: RoomMetadata[]) => void;
  getFilteredRooms: () => RoomMetadata[];
}

const DEFAULT_FILTERS: LobbyFilter = {
  gameType: "ALL",
  status: "ALL",
  searchQuery: "",
};

export const useLobbyStore = create<LobbyState>()((set, get) => ({
  rooms: loadPersistedRooms(),
  activeRoomId: null,
  activeRoom: null,
  filters: DEFAULT_FILTERS,
  isLoading: false,

  createRoom: ({ gameType, wager, player1 }) => {
    const newRoom: RoomMetadata = {
      id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      gameType,
      player1: player1.toLowerCase(),
      player2: null,
      wager,
      status: RoomStatus.WAITING,
      winner: null,
      createdAt: Date.now(),
    };

    const updated = [newRoom, ...get().rooms];
    set({
      rooms: updated,
      activeRoomId: newRoom.id,
      activeRoom: newRoom,
    });
    savePersistedRooms(updated);
    return newRoom;
  },

  joinRoom: (roomId: string, player2: string) => {
    const currentRooms = get().rooms;
    const target = currentRooms.find((r) => r.id === roomId);
    if (!target) return false;
    if (target.status !== RoomStatus.WAITING) return false;
    if (target.player1.toLowerCase() === player2.toLowerCase()) return false;

    const updatedRooms = currentRooms.map((r): RoomMetadata => {
      if (r.id === roomId) {
        return {
          ...r,
          player2: player2.toLowerCase(),
          status: RoomStatus.ACTIVE,
        };
      }
      return r;
    });

    const activeRoom = updatedRooms.find((r) => r.id === roomId) ?? null;
    set({
      rooms: updatedRooms,
      activeRoomId: roomId,
      activeRoom,
    });
    savePersistedRooms(updatedRooms);
    return true;
  },

  cancelRoom: (roomId: string, playerAddress: string) => {
    const currentRooms = get().rooms;
    const target = currentRooms.find((r) => r.id === roomId);
    if (!target) return false;
    if (target.player1.toLowerCase() !== playerAddress.toLowerCase()) return false;
    if (target.status !== RoomStatus.WAITING) return false;

    const updatedRooms = currentRooms.map((r): RoomMetadata => {
      if (r.id === roomId) {
        return {
          ...r,
          status: RoomStatus.CANCELLED,
        };
      }
      return r;
    });

    set({
      rooms: updatedRooms,
      activeRoomId: get().activeRoomId === roomId ? null : get().activeRoomId,
      activeRoom: get().activeRoomId === roomId ? null : get().activeRoom,
    });
    savePersistedRooms(updatedRooms);
    return true;
  },

  setActiveRoom: (roomId: string | null) => {
    if (!roomId) {
      set({ activeRoomId: null, activeRoom: null });
      return;
    }
    const target = get().rooms.find((r) => r.id === roomId) ?? null;
    set({ activeRoomId: roomId, activeRoom: target });
  },

  updateRoomStatus: (
    roomId: string,
    status: RoomStatus,
    winner: string | null = null
  ) => {
    const updatedRooms = get().rooms.map((r): RoomMetadata => {
      if (r.id === roomId) {
        return {
          ...r,
          status,
          winner: winner ? winner.toLowerCase() : r.winner,
        };
      }
      return r;
    });

    const activeRoom = updatedRooms.find((r) => r.id === roomId) ?? get().activeRoom;
    set({
      rooms: updatedRooms,
      activeRoom: get().activeRoomId === roomId ? activeRoom : get().activeRoom,
    });
    savePersistedRooms(updatedRooms);
  },

  setFilters: (newFilters: Partial<LobbyFilter>) => {
    set({
      filters: {
        ...get().filters,
        ...newFilters,
      },
    });
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  syncRooms: (rooms: RoomMetadata[]) => {
    set({ rooms });
    savePersistedRooms(rooms);
    if (get().activeRoomId) {
      const active = rooms.find((r) => r.id === get().activeRoomId) ?? null;
      set({ activeRoom: active });
    }
  },

  getFilteredRooms: () => {
    const { rooms, filters } = get();
    return rooms.filter((room) => {
      // Game type filter
      if (
        filters.gameType !== undefined &&
        filters.gameType !== "ALL" &&
        room.gameType !== filters.gameType
      ) {
        return false;
      }

      // Status filter
      if (
        filters.status !== undefined &&
        filters.status !== "ALL" &&
        room.status !== filters.status
      ) {
        return false;
      }

      // Min wager
      if (filters.minWager !== undefined && room.wager < filters.minWager) {
        return false;
      }

      // Max wager
      if (filters.maxWager !== undefined && room.wager > filters.maxWager) {
        return false;
      }

      // Search query (matches player address or room id)
      if (filters.searchQuery && filters.searchQuery.trim() !== "") {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchesId = room.id.toLowerCase().includes(query);
        const matchesP1 = room.player1.toLowerCase().includes(query);
        const matchesP2 = room.player2
          ? room.player2.toLowerCase().includes(query)
          : false;

        if (!matchesId && !matchesP1 && !matchesP2) {
          return false;
        }
      }

      return true;
    });
  },
}));

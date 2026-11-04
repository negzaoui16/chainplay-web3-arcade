/**
 * ChainPlay - Global Application State Store (Zustand)
 *
 * Manages runtime preferences:
 * - Mock Mode vs On-Chain Mode
 * - Mock Sub-Mode (Smart Bot AI vs 2-Tab P2P Sync)
 * - Sound FX volume and mute controls
 * - Active EVM Chain ID
 * - Mock Player Role & EVM Address
 *
 * Persists user configuration to localStorage with full SSR safety.
 * Zero `any` types. Strict TypeScript.
 */

import { create } from "zustand";
import { CHAIN_IDS, STORAGE_KEYS } from "../config/constants";
import { setSoundEnabled as setAudioSynthEnabled } from "../lib/utils/soundEffects";

export type MockSubMode = "bot" | "p2p";

export const MOCK_PLAYER_1_ADDRESS = "0x1111111111111111111111111111111111111111";
export const MOCK_PLAYER_2_ADDRESS = "0x2222222222222222222222222222222222222222";
export const MOCK_BOT_ADDRESS = "0xBOT000000000000000000000000000000000B07";

export interface PersistedAppSettings {
  isMockMode: boolean;
  mockSubMode: MockSubMode;
  soundEnabled: boolean;
  activeChainId: number;
  mockPlayerAddress: string;
}

export interface AppState extends PersistedAppSettings {
  tabSessionId: string;

  // Actions
  setMockMode: (enabled: boolean) => void;
  toggleMockMode: () => void;
  setMockSubMode: (subMode: MockSubMode) => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  setActiveChainId: (chainId: number) => void;
  setMockPlayerAddress: (address: string) => void;
  switchMockPlayerRole: (role?: "player1" | "player2") => void;
}

/**
 * Safely retrieves stored settings from browser localStorage.
 */
function loadPersistedSettings(): Partial<PersistedAppSettings> {
  if (typeof window === "undefined" || !window.localStorage) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Partial<PersistedAppSettings>;
    }
  } catch (err) {
    console.warn("Failed to read settings from localStorage:", err);
  }
  return {};
}

/**
 * Saves current app settings to browser localStorage.
 */
function savePersistedSettings(settings: PersistedAppSettings): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to persist settings to localStorage:", err);
  }
}

/**
 * Generates or retrieves a unique tab session identifier.
 */
function getOrCreateTabSessionId(): { sessionId: string; defaultAddress: string } {
  if (typeof window === "undefined") {
    return {
      sessionId: "tab_server",
      defaultAddress: MOCK_PLAYER_1_ADDRESS,
    };
  }

  try {
    // Check URL parameters for explicit tab assignment (e.g. ?tab=2)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam === "2" || window.name === "tab_2") {
      return {
        sessionId: "tab_2",
        defaultAddress: MOCK_PLAYER_2_ADDRESS,
      };
    }

    // Check sessionStorage
    const existing = window.sessionStorage.getItem("chainplay_tab_id");
    if (existing) {
      const address =
        window.sessionStorage.getItem("chainplay_mock_address") ||
        (existing === "tab_2" ? MOCK_PLAYER_2_ADDRESS : MOCK_PLAYER_1_ADDRESS);
      return { sessionId: existing, defaultAddress: address };
    }

    // Assign new tab ID
    const newId = `tab_${Math.random().toString(36).substring(2, 9)}`;
    window.sessionStorage.setItem("chainplay_tab_id", newId);
    window.sessionStorage.setItem("chainplay_mock_address", MOCK_PLAYER_1_ADDRESS);
    return { sessionId: newId, defaultAddress: MOCK_PLAYER_1_ADDRESS };
  } catch {
    return {
      sessionId: "tab_default",
      defaultAddress: MOCK_PLAYER_1_ADDRESS,
    };
  }
}

const tabInfo = getOrCreateTabSessionId();
const saved = loadPersistedSettings();

const initialMockMode = saved.isMockMode ?? true;
const initialMockSubMode: MockSubMode = saved.mockSubMode ?? "bot";
const initialSoundEnabled = saved.soundEnabled ?? true;
const initialActiveChainId = saved.activeChainId ?? CHAIN_IDS.SEPOLIA;
const initialMockPlayerAddress =
  saved.mockPlayerAddress ?? tabInfo.defaultAddress;

// Sync audio synthesizer state with loaded sound preference
setAudioSynthEnabled(initialSoundEnabled);

export const useAppStore = create<AppState>()((set, get) => ({
  isMockMode: initialMockMode,
  mockSubMode: initialMockSubMode,
  soundEnabled: initialSoundEnabled,
  activeChainId: initialActiveChainId,
  mockPlayerAddress: initialMockPlayerAddress,
  tabSessionId: tabInfo.sessionId,

  setMockMode: (enabled: boolean) => {
    set({ isMockMode: enabled });
    const current = get();
    savePersistedSettings({
      isMockMode: enabled,
      mockSubMode: current.mockSubMode,
      soundEnabled: current.soundEnabled,
      activeChainId: current.activeChainId,
      mockPlayerAddress: current.mockPlayerAddress,
    });
  },

  toggleMockMode: () => {
    const nextVal = !get().isMockMode;
    get().setMockMode(nextVal);
  },

  setMockSubMode: (subMode: MockSubMode) => {
    set({ mockSubMode: subMode });
    const current = get();
    savePersistedSettings({
      isMockMode: current.isMockMode,
      mockSubMode: subMode,
      soundEnabled: current.soundEnabled,
      activeChainId: current.activeChainId,
      mockPlayerAddress: current.mockPlayerAddress,
    });
  },

  setSoundEnabled: (enabled: boolean) => {
    setAudioSynthEnabled(enabled);
    set({ soundEnabled: enabled });
    const current = get();
    savePersistedSettings({
      isMockMode: current.isMockMode,
      mockSubMode: current.mockSubMode,
      soundEnabled: enabled,
      activeChainId: current.activeChainId,
      mockPlayerAddress: current.mockPlayerAddress,
    });
  },

  toggleSound: () => {
    const nextVal = !get().soundEnabled;
    get().setSoundEnabled(nextVal);
  },

  setActiveChainId: (chainId: number) => {
    set({ activeChainId: chainId });
    const current = get();
    savePersistedSettings({
      isMockMode: current.isMockMode,
      mockSubMode: current.mockSubMode,
      soundEnabled: current.soundEnabled,
      activeChainId: chainId,
      mockPlayerAddress: current.mockPlayerAddress,
    });
  },

  setMockPlayerAddress: (address: string) => {
    const normalized = address.trim();
    set({ mockPlayerAddress: normalized });
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        window.sessionStorage.setItem("chainplay_mock_address", normalized);
      } catch {
        // ignore
      }
    }
    const current = get();
    savePersistedSettings({
      isMockMode: current.isMockMode,
      mockSubMode: current.mockSubMode,
      soundEnabled: current.soundEnabled,
      activeChainId: current.activeChainId,
      mockPlayerAddress: normalized,
    });
  },

  switchMockPlayerRole: (role?: "player1" | "player2") => {
    const currentAddr = get().mockPlayerAddress;
    let targetAddr: string;
    if (role === "player1") {
      targetAddr = MOCK_PLAYER_1_ADDRESS;
    } else if (role === "player2") {
      targetAddr = MOCK_PLAYER_2_ADDRESS;
    } else {
      // Toggle
      targetAddr =
        currentAddr.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase()
          ? MOCK_PLAYER_2_ADDRESS
          : MOCK_PLAYER_1_ADDRESS;
    }
    get().setMockPlayerAddress(targetAddr);
  },
}));

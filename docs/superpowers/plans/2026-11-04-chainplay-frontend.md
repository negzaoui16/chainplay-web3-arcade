# ChainPlay Decoupled Web3 Frontend & Mini-Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "ChainPlay" — a production-grade, decentralized 1v1 Web3 mini-games platform (Tic-Tac-Toe, Battleship with cryptographic commit-reveal, and Memory Duel) featuring dual-mode execution (Mock with Smart Bot & Cross-Tab P2P vs. Live On-Chain Wagmi), Web Audio API synthesizers, strict TypeScript types, and high-craft Dark Web3 UI.

**Architecture:** Next.js 14/15 App Router architecture residing in `/frontend`. A clean abstraction layer (`useChainPlayMode`) decouples the UI and game loops from the transport layer, dynamically routing calls either to a local state machine (Zustand + `BroadcastChannel` cross-tab sync + Bot AI) or to Ethereum smart contracts via Wagmi v2 / Viem. Battleship uses client-side Web Crypto API and Keccak256 commit-reveal with local secret storage.

**Tech Stack:** Next.js (App Router), TypeScript (Strict, zero `any`), Tailwind CSS, Framer Motion, Wagmi v2, Viem v2, RainbowKit, Zustand, Web Audio API, Lucide React, Canvas Confetti.

**Spec:** Monorepo specification with teammate developing Solidity contracts in `/contracts` and frontend built inside `/frontend`.

---

## Global Constraints

- Directory root for all frontend deliverables is `/frontend`.
- Zero `any` types across the entire codebase (`strict: true` in `tsconfig.json`).
- Zero `// TODO` or mock stubs; every module must have complete, working implementation.
- Dual-mode operation: Platform must function 100% standalone out-of-the-box in Mock Mode (via simulated Bot AI or 2-Tab cross-tab `BroadcastChannel`), and seamlessly switch to On-Chain via Wagmi when contract addresses are provided in `addresses.ts`.
- No external `.mp3` or sound asset dependencies: all sound effects (clicks, hits, water splashes, chimes, victory fanfares) are synthesized purely in-browser using Web Audio API oscillators.
- Viem's `keccak256` and `encodePacked` must be used for exact cryptographic match with Solidity's `keccak256(abi.encodePacked(...))` in Battleship.

---

## Review Focus

1. **Battleship Hash Mismatch:** If `encodePacked(['uint8[100]', 'bytes32'], [flatBoard, salt])` differs from Solidity's packed encoding, `verifyFinalBoard` will revert on-chain.
   - *Test:* Verify that generated hash matches expected test vector on 100-byte array and 32-byte salt.
2. **Cross-Tab Concurrency Desync:** When two tabs play in Mock P2P mode, concurrent moves or disconnects might deadlock turn states.
   - *Test:* Verify that `BroadcastChannel` messages carry monotonically increasing sequence numbers and room IDs.
3. **Optimistic Move Revert in Tic-Tac-Toe:** If a move fails or reverts, the optimistic board must roll back without desyncing the countdown timer.
   - *Test:* Simulate failed move and verify cell reverts to empty (`0`) and lock is released.
4. **Memory Duel Fast Multi-Click Race Condition:** Rapidly clicking 3 or more cards before the 1200ms mismatch timer finishes could corrupt card state.
   - *Test:* Board input must be strictly locked while two cards are evaluating.
5. **Secret Vault Loss on Page Reload:** Refreshing the browser during a Battleship match must not discard the generated salt or ship placement.
   - *Test:* Verify `chainplay_battleship_vault_${gameId}_${playerAddress}` persists in `localStorage` and auto-recovers.

---

## Detailed Task Breakdown

### Task 1: Project Setup & Monorepo Frontend Scaffolding
**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/tailwind.config.ts`
- Create: `frontend/postcss.config.mjs`
- Create: `frontend/.env.example`
- Create: `frontend/src/config/constants.ts`

**Interfaces:**
- Produces: Game constants, ship sizes (`CARRIER: 5, BATTLESHIP: 4, CRUISER: 3, SUBMARINE: 3, DESTROYER: 2`), turn timeout (60s), grid dimensions (10x10, 3x3, 4x4), default tokens and RPC configs.

- [ ] **Step 1: Create `package.json` with Next.js, Wagmi v2, Viem, RainbowKit, Zustand, Framer Motion, Lucide React, Canvas Confetti**
- [ ] **Step 2: Configure `tsconfig.json` with strict mode, `@/*` path aliases, and exact compiler flags**
- [ ] **Step 3: Setup `tailwind.config.ts` with custom Cyberpunk dark palette (`#07090E`, `#00F0FF`, `#FF0055`, `#F59E0B`, glassmorphism styles)**
- [ ] **Step 4: Create `src/config/constants.ts` with all game configuration constants**
- [ ] **Step 5: Verify installation configuration by dry-run check or package dependency audit**

---

### Task 2: Type Definitions & Smart Contract ABIs
**Files:**
- Create: `frontend/src/types/lobby.types.ts`
- Create: `frontend/src/types/tictactoe.types.ts`
- Create: `frontend/src/types/battleship.types.ts`
- Create: `frontend/src/types/memory.types.ts`
- Create: `frontend/src/contracts/addresses.ts`
- Create: `frontend/src/contracts/abis/GameManagerABI.ts`
- Create: `frontend/src/contracts/abis/TicTacToeABI.ts`
- Create: `frontend/src/contracts/abis/BattleshipABI.ts`
- Create: `frontend/src/contracts/abis/MemoryDuelABI.ts`
- Create: `frontend/src/contracts/abis/RewardManagerABI.ts`

**Interfaces:**
- Consumes: Game constants from Task 1.
- Produces:
  - Exact TypeScript interfaces: `RoomMetadata`, `WagerInfo`, `XOBoardState`, `ShipPlacement`, `ShotResult`, `CommitData`, `CardItem`.
  - All 5 ABIs declared `as const` for strict Viem/Wagmi inference.
  - Multi-chain contract address registry with zero-address fallbacks.

- [ ] **Step 1: Write all TypeScript interface definitions (`lobby.types.ts`, `tictactoe.types.ts`, `battleship.types.ts`, `memory.types.ts`)**
- [ ] **Step 2: Create typed `as const` ABIs for all 5 smart contracts matching the specification signatures**
- [ ] **Step 3: Create `addresses.ts` supporting Sepolia (11155111), Arbitrum Sepolia (421614), Hardhat Local (31337) with zero-address fallback**
- [ ] **Step 4: Verify type safety by running TypeScript verification on types and ABIs**

---

### Task 3: Battleship Cryptographic Engine, Audio Synthesizer & Formatters
**Files:**
- Create: `frontend/src/lib/crypto/battleshipCrypto.ts`
- Create: `frontend/src/lib/utils/soundEffects.ts`
- Create: `frontend/src/lib/utils/formatters.ts`

**Interfaces:**
- Consumes: Viem `keccak256`, `encodePacked`, `toHex`, `Hex`.
- Produces:
  - `generateSalt(): `0x${string}``
  - `validateFleetPlacement(ships: ShipPlacement[]): { valid: boolean; error?: string; flatBoard: number[] }`
  - `generateBoardHash(flatBoard: number[], salt: `0x${string}`): `0x${string}``
  - `generateCellProof(gameId: bigint, x: number, y: number, isHit: boolean, salt: `0x${string}`): `0x${string}``
  - `saveSecretVault(gameId: string, playerAddress: string, data: CommitData): void`
  - `loadSecretVault(gameId: string, playerAddress: string): CommitData | null`
  - `soundEffects: { playTileClick, playCardFlip, playMatchChime, playTorpedo, playExplosion, playSplash, playVictory, playDefeat }`
  - `formatAddress(addr: string): string`, `formatEther(wei: bigint): string`, `formatCountdown(seconds: number): string`

- [ ] **Step 1: Implement `battleshipCrypto.ts` with Web Crypto API salt generation and Viem Keccak256 hashing**
- [ ] **Step 2: Implement fleet placement validator with boundary and overlap collision detection**
- [ ] **Step 3: Implement local vault storage and recovery helper in `localStorage`**
- [ ] **Step 4: Implement Web Audio API zero-dependency sound synthesizer in `soundEffects.ts`**
- [ ] **Step 5: Implement address, ether and timer formatters in `formatters.ts`**
- [ ] **Step 6: Write and run verification script to validate cryptographic hash consistency against sample inputs**

---

### Task 4: State Management & Dual-Mode Mock Engine (Smart Bot + Cross-Tab P2P)
**Files:**
- Create: `frontend/src/store/useAppStore.ts`
- Create: `frontend/src/store/useLobbyStore.ts`
- Create: `frontend/src/store/useTicTacToeStore.ts`
- Create: `frontend/src/store/useBattleshipStore.ts`
- Create: `frontend/src/store/useMemoryStore.ts`
- Create: `frontend/src/lib/mock/mockChainEngine.ts`

**Interfaces:**
- Consumes: Types, crypto helpers, sound synthesizer.
- Produces:
  - `useAppStore`: mode toggles (`isMockMode`, `mockSubMode: 'bot' | 'p2p'`, `soundEnabled`, `activeChain`).
  - `useLobbyStore`: room creation, join, cancel, filter, active game state.
  - `useTicTacToeStore`: 3x3 optimistic grid, active turn, move history, winner line detection.
  - `useBattleshipStore`: own fleet placement, defensive & offensive 10x10 grids, shot history, secret hash state.
  - `useMemoryStore`: 16-card deck, active flipped cards, player scores, combo multiplier.
  - `mockChainEngine`: BroadcastChannel sync across tabs + Smart Bot AI (minimax/heuristic XO, hunt/target Battleship, 40% memory duel AI).

- [ ] **Step 1: Implement `useAppStore` with persistent mock mode and sound settings**
- [ ] **Step 2: Implement `useLobbyStore` with room lifecycle management and mock initial lobbies**
- [ ] **Step 3: Implement `mockChainEngine.ts` with `BroadcastChannel` P2P sync and Smart Bot AI**
- [ ] **Step 4: Implement `useTicTacToeStore`, `useBattleshipStore`, and `useMemoryStore` with full game loops and optimistic updates**
- [ ] **Step 5: Verify cross-tab sync and state transitions using simulated event triggers**

---

### Task 5: Web3 Abstraction Layer & Contract Hooks
**Files:**
- Create: `frontend/src/config/wagmi.ts`
- Create: `frontend/src/hooks/useChainPlayMode.ts`
- Create: `frontend/src/hooks/useGameManager.ts`
- Create: `frontend/src/hooks/useTicTacToeContract.ts`
- Create: `frontend/src/hooks/useBattleshipContract.ts`
- Create: `frontend/src/hooks/useMemoryDuelContract.ts`
- Create: `frontend/src/hooks/useRewardManager.ts`

**Interfaces:**
- Consumes: Wagmi v2 hooks (`useWriteContract`, `useReadContract`, `useWatchContractEvent`), ABIs, `useAppStore`, `mockChainEngine`.
- Produces:
  - Unified hooks that switch transparently between Live On-Chain transactions and Mock Chain Engine based on `isMockMode`.
  - Event listeners and optimistic transaction feedback with pending/success/error statuses.

- [ ] **Step 1: Setup Wagmi v2 client with RainbowKit connectors in `src/config/wagmi.ts`**
- [ ] **Step 2: Create `useChainPlayMode.ts` dispatcher**
- [ ] **Step 3: Implement `useGameManager.ts` for room creation, joining, cancelling, and event listening**
- [ ] **Step 4: Implement `useTicTacToeContract.ts`, `useBattleshipContract.ts`, `useMemoryDuelContract.ts`, and `useRewardManager.ts`**
- [ ] **Step 5: Verify that calling any hook in Mock Mode executes smoothly without requiring an active wallet or live blockchain**

---

### Task 6: Shared Layout & UI Components
**Files:**
- Create: `frontend/src/components/layout/Navbar.tsx`
- Create: `frontend/src/components/layout/NetworkBanner.tsx`
- Create: `frontend/src/components/shared/PlayerHud.tsx`
- Create: `frontend/src/components/shared/TransactionToast.tsx`
- Create: `frontend/src/components/shared/GameOverModal.tsx`

**Interfaces:**
- Consumes: `useAppStore`, `useLobbyStore`, `formatters`, `soundEffects`.
- Produces:
  - Header with wallet connect, mock/on-chain mode toggle pill, sub-mode selector (Bot vs 2-Tab), unclaimed reward badge, sound toggle.
  - HUD with avatars, turn badge, circular SVG 60s countdown timer, forfeit/timeout claim CTA.
  - High-craft Game Over modal with pot payout animation, canvas confetti, and sound triggers.

- [ ] **Step 1: Implement `Navbar.tsx` with responsive design and mode switcher controls**
- [ ] **Step 2: Implement `NetworkBanner.tsx` showing current environment (Local Mock vs Network Name)**
- [ ] **Step 3: Implement `PlayerHud.tsx` with animated circular 60s SVG timer and active turn glow**
- [ ] **Step 4: Implement `TransactionToast.tsx` and `GameOverModal.tsx` with Framer Motion animations**
- [ ] **Step 5: Verify shared components render cleanly in isolation**

---

### Task 7: Game 1 — Tic-Tac-Toe Arena (XO)
**Files:**
- Create: `frontend/src/components/games/tictactoe/XOCell.tsx`
- Create: `frontend/src/components/games/tictactoe/XOBoard.tsx`
- Create: `frontend/src/components/games/tictactoe/TicTacToeArena.tsx`

**Interfaces:**
- Consumes: `useTicTacToeStore`, `useTicTacToeContract`, `soundEffects`, `PlayerHud`.
- Produces: Complete, interactive 3x3 XO Arena with optimistic click, pulsing neon, loading spinner, winning laser strike line SVG, and timeout claim.

- [ ] **Step 1: Implement `XOCell.tsx` with optimistic neon preview, micro-spinner, and scale animations**
- [ ] **Step 2: Implement `XOBoard.tsx` with 3x3 layout and Framer Motion animated SVG laser winning line**
- [ ] **Step 3: Implement `TicTacToeArena.tsx` integrating HUD, board, timeout trigger, and game over handling**
- [ ] **Step 4: Test playing a full game against Smart Bot and across 2 tabs**

---

### Task 8: Game 2 — Battleship Arena (Cryptographic Commit-Reveal)
**Files:**
- Create: `frontend/src/components/games/battleship/FleetPlacementDock.tsx`
- Create: `frontend/src/components/games/battleship/DefensiveGrid.tsx`
- Create: `frontend/src/components/games/battleship/OffensiveRadarGrid.tsx`
- Create: `frontend/src/components/games/battleship/CryptoProofPanel.tsx`
- Create: `frontend/src/components/games/battleship/BattleshipArena.tsx`

**Interfaces:**
- Consumes: `useBattleshipStore`, `useBattleshipContract`, `battleshipCrypto`, `soundEffects`.
- Produces:
  - Interactive fleet deployment with drag/click, 'R' key rotation, auto-deploy randomize, and Keccak256 commit CTA.
  - Defensive grid (10x10) displaying friendly ships and enemy torpedo hits/misses.
  - Offensive radar grid (10x10) with CRT radar sweep, targeting reticle, and torpedo launch CTA.
  - Cryptographic proof inspector panel showing salt, board hash, and end-game verification status.

- [ ] **Step 1: Implement `FleetPlacementDock.tsx` with ship placement preview, rotation, and auto-randomize**
- [ ] **Step 2: Implement `DefensiveGrid.tsx` and `OffensiveRadarGrid.tsx` with interactive targeting and visual hit/miss effects**
- [ ] **Step 3: Implement `CryptoProofPanel.tsx` with hash inspection and backup secret key export**
- [ ] **Step 4: Implement `BattleshipArena.tsx` managing placement vs combat phases and final board verification**
- [ ] **Step 5: Test full Battleship loop: placement -> commit -> firing round -> reveal & verify final board**

---

### Task 9: Game 3 — Memory Duel Arena (1v1 Shared State)
**Files:**
- Create: `frontend/src/components/games/memory/MemoryCard.tsx`
- Create: `frontend/src/components/games/memory/MemoryGrid.tsx`
- Create: `frontend/src/components/games/memory/StreakScoreboard.tsx`
- Create: `frontend/src/components/games/memory/MemoryDuelArena.tsx`

**Interfaces:**
- Consumes: `useMemoryStore`, `useMemoryDuelContract`, `soundEffects`, `PlayerHud`.
- Produces:
  - 16-card 4x4 3D perspective grid with `rotateY(180deg)` CSS flips and Web3 icons.
  - Live streak scoreboard with combo multipliers and extra-turn indicators.
  - Turn lock during 1200ms memorization window on mismatch.

- [ ] **Step 1: Implement `MemoryCard.tsx` with 3D flip transform and neon matched frames**
- [ ] **Step 2: Implement `MemoryGrid.tsx` with click locking and pair evaluation**
- [ ] **Step 3: Implement `StreakScoreboard.tsx` with score counters and streak multipliers**
- [ ] **Step 4: Implement `MemoryDuelArena.tsx` integrating all components and tie/win resolution**
- [ ] **Step 5: Test 8-pair matching flow against Bot AI and via cross-tab P2P**

---

### Task 10: App Pages, Lobby & Matchmaking
**Files:**
- Create: `frontend/src/components/lobby/GameSelectorCards.tsx`
- Create: `frontend/src/components/lobby/CreateRoomModal.tsx`
- Create: `frontend/src/components/lobby/RoomListTable.tsx`
- Create: `frontend/src/components/lobby/WaitingRoomOverlay.tsx`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/app/lobby/page.tsx`
- Create: `frontend/src/app/game/[gameType]/[roomId]/page.tsx`
- Create: `frontend/src/app/profile/page.tsx`

**Interfaces:**
- Consumes: All arenas, lobby components, stores, and layout wrappers.
- Produces:
  - Root layout with Web3 providers, RainbowKit, Toaster, Navbar.
  - Landing page with hero section, live game selector, active open lobbies.
  - Full lobby page with filters, search, and room creation modal.
  - Dynamic game room route (`/game/[gameType]/[roomId]`) mounting the respective arena.
  - Profile page with stats, accumulated rewards, and withdrawal CTA.

- [ ] **Step 1: Implement `layout.tsx` with providers and dark cyber theme**
- [ ] **Step 2: Implement lobby components (`GameSelectorCards`, `CreateRoomModal`, `RoomListTable`, `WaitingRoomOverlay`)**
- [ ] **Step 3: Implement `page.tsx` (Landing) and `lobby/page.tsx`**
- [ ] **Step 4: Implement dynamic game arena route `game/[gameType]/[roomId]/page.tsx`**
- [ ] **Step 5: Implement `profile/page.tsx` with player stats and reward claims**

---

### Task 11: End-to-End Build Verification & Polish
**Files:**
- Verify: Entire `frontend/` codebase.

- [ ] **Step 1: Run Next.js build (`npm run build`) to ensure zero compile errors**
- [ ] **Step 2: Run TypeScript compiler (`npx tsc --noEmit`) to verify zero `any` types and zero type errors**
- [ ] **Step 3: Verify standalone operation in Mock Mode: Bot AI game, 2-tab multiplayer sync, audio synthesis, and cryptographic vault recovery**
- [ ] **Step 4: Document handoff notes and contract integration points for teammate**

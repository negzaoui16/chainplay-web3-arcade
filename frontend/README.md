# ⚔️ ChainPlay — High-Craft Web3 Arcade Arenas

ChainPlay is a decentralized, on-chain 1v1 PvP arcade gaming platform built with **Next.js 14 (App Router)**, **TypeScript (`strict: true`)**, **Tailwind CSS**, **Framer Motion**, and **Wagmi v2 / Viem / RainbowKit**.

Players stake cryptocurrency (ETH) in high-stakes duels across three competitive games:
1. **Tic-Tac-Toe Arena (XO)**: Fast-paced 3x3 tactical battle with laser-strike animations and 60-second turn enforcement.
2. **Cryptographic Battleship**: 10x10 zero-knowledge naval warfare powered by Keccak256 commit-reveal hashing and local cryptographic secret vault recovery.
3. **Memory Duel**: 4x4 card matching duel featuring Web3 token icon pairs, streak multiplier combo mechanics, and probabilistic memory Bot AI.

---

## 🎨 Visual Design System & Aesthetics

ChainPlay delivers a dark, immersive Cyberpunk arcade atmosphere:
- **Base Canvas**: Deep cyber void (`#07090E`) with glassmorphic cards (`#0B0F19`/90 background, `#1E293B`/80 borders, `backdrop-blur-md`).
- **Player Colors**:
  - **Player 1 (Cyan)**: `#00F0FF` neon aura with glowing border highlights.
  - **Player 2 (Magenta)**: `#FF0055` laser pulse for opponents and bot challengers.
  - **Urgency & Rewards (Amber)**: `#F59E0B` gold accents for unclaimed wagers, XP rewards, and countdown timers under 30 seconds.
- **Audio Synthesis Engine**: Built-in Web Audio API procedural synthesizer (`soundEffects.ts`) generating arcade sound effects without external audio assets (mechanical tile clicks, laser strikes, radar sonar pings, card flip whooshes, error buzzers, and victory fanfare).
- **Haptic & Visual Feedback**: Framer Motion spring physics, active turn pulses, 60-second circular SVG countdown gauges, and celebratory `canvas-confetti` bursts on victory.

---

## ⚡ Dual-Mode Architecture (Mock Mode vs Live On-Chain)

ChainPlay features a **transparent dual-mode architecture**. The UI and game hooks interact identically whether running in local simulation or connected to live EVM smart contracts.

```
                  ┌──────────────────────────────┐
                  │    User Interface & Pages    │
                  │ (Navbar, Arenas, Lobby, HUD) │
                  └──────────────┬───────────────┘
                                 │
                 ┌───────────────▼───────────────┐
                 │       useChainPlayMode        │
                 │   (Web3 Dispatcher Layer)     │
                 └───────┬───────────────┬───────┘
                         │               │
        ┌────────────────▼───┐       ┌───▼────────────────┐
        │  Local Mock Mode   │       │  Live On-Chain     │
        │ - Smart Bot AI     │       │ - Sepolia / Arb    │
        │ - 2-Tab P2P Sync   │       │ - Wagmi v2 / Viem  │
        │ - Secret Vault     │       │ - Hardhat Local    │
        └────────────────────┘       └────────────────────┘
```

### Mode 1: Local Mock Mode (`⚡ Mock Local`)
- **Zero Gas & Instant Play**: Run games without a connected wallet or deployed smart contracts.
- **Smart Bot AI Opponents**:
  - *Tic-Tac-Toe*: Tactical heuristic Minimax AI that prioritizes immediate winning moves and blocks opponent winning threats.
  - *Battleship*: Strategic Hunt & Target radar AI that scans parity checkerboards and tracks contiguous ship hulls upon registering a hit.
  - *Memory Duel*: Probabilistic memory cache AI that retains observed card positions with configurable recall accuracy.
- **Cross-Tab 2-Tab P2P Multiplayer**:
  - Open **Tab 1** (`http://localhost:3000`) as Player 1 (Creator).
  - Open **Tab 2** (`http://localhost:3000?tab=2`) as Player 2 (Challenger).
  - The built-in `BroadcastChannel` engine (`mockChainEngine.ts`) synchronizes game creations, joins, moves, card flips, radar strikes, and payouts instantly across browser tabs on the same origin.
- **Cryptographic Vault & Backup**:
  - Salt and secret fleet coordinates are persistently stored in browser `localStorage`.
  - In-game "Export Key Backup" enables single-click JSON secret export for manual board verification.

### Mode 2: Live On-Chain Mode (`🔗 On-Chain`)
- **Web3 Wallet Connection**: RainbowKit modal supporting MetaMask, Coinbase Wallet, WalletConnect, and browser extension wallets.
- **Supported EVM Networks**:
  - **Ethereum Sepolia Testnet** (`ChainId: 11155111`)
  - **Arbitrum Sepolia Testnet** (`ChainId: 421614`)
  - **Hardhat Local Node** (`ChainId: 31337`)
- **Optimistic UI with Rollback**: Move transactions reflect immediately in the UI with a subtle pending pulse and revert cleanly if an on-chain transaction reverts.
- **Contract Event Watching**: Real-time event subscriptions via Wagmi `useWatchContractEvent` keep game boards and lobby rooms in sync with the blockchain.

---

## 🛠️ Teammate Integration Guide (For Hama)

To connect your deployed Solidity smart contracts to the ChainPlay frontend:

### Step 1: Deploy Your Contracts
Deploy the 5 contracts in the following dependency order:
1. `RewardManager.sol` (handles protocol fees and player balance withdrawals)
2. `GameManager.sol` (manages room lobbies, escrow stakes, and player pairings)
3. `TicTacToe.sol` (implements 3x3 game logic and timeout forfeits)
4. `Battleship.sol` (implements commit-reveal verification and turn alternation)
5. `MemoryDuel.sol` (implements card deck flips and scoring)

### Step 2: Configure Contract Addresses
You can plug in your deployed contract addresses either via environment variables or directly in `frontend/src/contracts/addresses.ts`.

#### Option A: `.env.local` Configuration (Recommended)
Create `frontend/.env.local` and add your deployed addresses:

```env
# Ethereum Sepolia (11155111)
NEXT_PUBLIC_SEPOLIA_GAME_MANAGER=0xYourSepoliaGameManagerAddress
NEXT_PUBLIC_SEPOLIA_TICTACTOE=0xYourSepoliaTicTacToeAddress
NEXT_PUBLIC_SEPOLIA_BATTLESHIP=0xYourSepoliaBattleshipAddress
NEXT_PUBLIC_SEPOLIA_MEMORY_DUEL=0xYourSepoliaMemoryDuelAddress
NEXT_PUBLIC_SEPOLIA_REWARD_MANAGER=0xYourSepoliaRewardManagerAddress

# Arbitrum Sepolia (421614)
NEXT_PUBLIC_ARB_SEPOLIA_GAME_MANAGER=0xYourArbGameManagerAddress
NEXT_PUBLIC_ARB_SEPOLIA_TICTACTOE=0xYourArbTicTacToeAddress
NEXT_PUBLIC_ARB_SEPOLIA_BATTLESHIP=0xYourArbBattleshipAddress
NEXT_PUBLIC_ARB_SEPOLIA_MEMORY_DUEL=0xYourArbMemoryDuelAddress
NEXT_PUBLIC_ARB_SEPOLIA_REWARD_MANAGER=0xYourArbRewardManagerAddress

# Hardhat Local (31337)
NEXT_PUBLIC_HARDHAT_GAME_MANAGER=0xYourHardhatGameManagerAddress
NEXT_PUBLIC_HARDHAT_TICTACTOE=0xYourHardhatTicTacToeAddress
NEXT_PUBLIC_HARDHAT_BATTLESHIP=0xYourHardhatBattleshipAddress
NEXT_PUBLIC_HARDHAT_MEMORY_DUEL=0xYourHardhatMemoryDuelAddress
NEXT_PUBLIC_HARDHAT_REWARD_MANAGER=0xYourHardhatRewardManagerAddress

# WalletConnect Cloud Project ID (Optional, fallback provided)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

#### Option B: Direct Registry Configuration
Edit `frontend/src/contracts/addresses.ts` and set the addresses under `CONTRACT_ADDRESSES[CHAIN_IDS.SEPOLIA]` or the respective chain object.

### Step 3: Switch to Live On-Chain Mode
1. In the top navigation bar, toggle the mode pill from **`⚡ Mock Local`** to **`🔗 On-Chain`**.
2. Connect your Web3 wallet (e.g. MetaMask on Sepolia).
3. The yellow "Local Mock Mode Active" banner will dismiss, and the app will begin reading and writing to your deployed contracts.
4. If contracts are missing or set to `0x000...000`, the frontend automatically stays in safe mock fallback mode with an indicator banner.

---

## 📜 Smart Contract Interface Specifications (ABIs)

The frontend ABIs located in `frontend/src/contracts/abis/` require the following exact Solidity function signatures and event definitions:

### 1. `GameManager.sol`
```solidity
interface IGameManager {
    // Functions
    function createGame(uint8 gameType) external payable returns (uint256 gameId);
    function joinGame(uint256 gameId) external payable;
    function cancelWaitingGame(uint256 gameId) external;
    function getGameInfo(uint256 gameId) external view returns (
        address player1,
        address player2,
        uint8 gameType,
        uint256 wager,
        uint8 status,
        address winner
    );

    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator, uint8 gameType, uint256 wager);
    event GameJoined(uint256 indexed gameId, address indexed joiner);
    event GameCancelled(uint256 indexed gameId, address indexed player);
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 payout);
}
```
*Note: `gameType` enum: `0 = TicTacToe`, `1 = Battleship`, `2 = MemoryDuel`. `status` enum: `0 = Waiting`, `1 = Active`, `2 = Finished`, `3 = Cancelled`.*

---

### 2. `TicTacToe.sol`
```solidity
interface ITicTacToe {
    // Functions
    function makeMove(uint256 gameId, uint8 cellIndex) external;
    function claimTimeoutWin(uint256 gameId) external;
    function getBoard(uint256 gameId) external view returns (
        uint8[9] memory board,
        address currentTurn,
        uint8 status,
        address winner
    );

    // Events
    event MoveMade(uint256 indexed gameId, address indexed player, uint8 cellIndex, uint8 symbol);
    event TicTacToeWon(uint256 indexed gameId, address indexed winner, uint8[3] winningLine);
    event TicTacToeDraw(uint256 indexed gameId);
}
```
*Note: `cellIndex` range: `0..8`. `symbol`: `1 = X` (Player 1), `2 = O` (Player 2).*

---

### 3. `Battleship.sol`
```solidity
interface IBattleship {
    // Functions
    function commitBoard(uint256 gameId, bytes32 boardHash) external;
    function fireShot(uint256 gameId, uint8 x, uint8 y) external;
    function revealShotAndFireNext(
        uint256 gameId,
        uint8 prevX,
        uint8 prevY,
        bool isHit,
        uint8 sunkShipId,
        bytes32 proof,
        uint8 nextX,
        uint8 nextY
    ) external;
    function verifyFinalBoard(
        uint256 gameId,
        uint8[100] calldata flatBoard,
        bytes32 salt
    ) external returns (bool valid);
    function claimTimeoutWin(uint256 gameId) external;

    // Events
    event BoardCommitted(uint256 indexed gameId, address indexed player, bytes32 boardHash);
    event ShotFired(uint256 indexed gameId, address indexed attacker, uint8 x, uint8 y);
    event ShotRevealed(uint256 indexed gameId, address indexed defender, uint8 x, uint8 y, bool isHit, uint8 sunkShipId);
    event BoardVerified(uint256 indexed gameId, address indexed player, bool isValid);
    event BattleshipWon(uint256 indexed gameId, address indexed winner);
}
```

---

### 4. `MemoryDuel.sol`
```solidity
interface IMemoryDuel {
    // Functions
    function initializeDeck(uint256 gameId, bytes32 deckCommitment) external;
    function flipPair(uint256 gameId, uint8 cardIndex1, uint8 cardIndex2) external;
    function claimTimeoutWin(uint256 gameId) external;
    function getGameState(uint256 gameId) external view returns (
        address currentTurn,
        uint8 p1Score,
        uint8 p2Score,
        uint8 matchedPairs,
        uint8 status,
        address winner
    );

    // Events
    event PairFlipped(
        uint256 indexed gameId,
        address indexed player,
        uint8 cardIndex1,
        uint8 cardIndex2,
        bool isMatch,
        uint8 symbolId
    );
    event MemoryDuelWon(uint256 indexed gameId, address indexed winner, uint8 p1Score, uint8 p2Score);
}
```
*Note: `cardIndex` range: `0..15` (16 cards total, 8 matching pairs).*

---

### 5. `RewardManager.sol`
```solidity
interface IRewardManager {
    // Functions
    function claimableRewards(address player) external view returns (uint256 amount);
    function withdrawRewards() external;

    // Events
    event RewardsClaimed(address indexed player, uint256 amount);
    event RewardsDeposited(address indexed player, uint256 amount);
}
```

---

## 🔐 Cryptographic Battleship Protocol Specification

ChainPlay implements an on-chain commit-reveal protocol ensuring zero-knowledge hidden board placement without expensive ZK-SNARK verifier contract deployments:

### 1. Fleet Configuration
- **Grid Dimensions**: 10 x 10 = 100 cells (`x: 0..9`, `y: 0..9`).
- **Standard 5-Ship Naval Fleet**:
  - `Ship 1 (Carrier)`: Size 5
  - `Ship 2 (Battleship)`: Size 4
  - `Ship 3 (Cruiser)`: Size 3
  - `Ship 4 (Submarine)`: Size 3
  - `Ship 5 (Destroyer)`: Size 2
  - **Total Ship Cells**: Exactly 17 occupied cells out of 100.

### 2. Board Commitment Phase
1. Player deploys fleet horizontally or vertically without collisions or out-of-bounds cells.
2. The grid is converted into a 100-element `uint8[100]` flat array (`0` = empty water, `1..5` = ship ID).
3. The client generates a 32-byte cryptographically secure random salt using `window.crypto.getRandomValues(new Uint8Array(32))`.
4. The client computes the initial commitment hash:
   $$\text{boardHash} = \text{keccak256}(\text{abi.encodePacked}(\text{uint8}[100]\ \text{flatBoard},\ \text{bytes32}\ \text{salt}))$$
5. Both players call `commitBoard(gameId, boardHash)` on `Battleship.sol`.
6. Salt and fleet coordinates are safely stored in browser `localStorage` and can be exported as a recovery JSON file.

### 3. Warfare & Single-Cell Reveal
During gameplay, players alternate firing shots. When an opponent shoots at $(x, y)$, the defending player reveals the cell outcome and simultaneously fires their return shot:
- **Proof Hash**:
  $$\text{proof} = \text{keccak256}(\text{abi.encodePacked}(\text{uint256}\ \text{gameId},\ \text{uint8}\ x,\ \text{uint8}\ y,\ \text{bool}\ \text{isHit},\ \text{bytes32}\ \text{salt}))$$
- Submits `revealShotAndFireNext(gameId, prevX, prevY, isHit, sunkShipId, proof, nextX, nextY)`.

### 4. End-Game Final Board Settlement
When all 17 ship cells are sunk or when claiming victory:
1. Winner or both players call `verifyFinalBoard(gameId, flatBoard, salt)`.
2. The smart contract validates:
   - $\text{keccak256}(\text{abi.encodePacked}(\text{flatBoard}, \text{salt})) == \text{committedBoardHash}$
   - The board contains exactly 17 non-zero elements.
   - All 5 canonical ship configurations are valid without overlapping cells.
   - All revealed hits during the match correspond to actual ship coordinates.
3. If valid, the contract awards the accumulated prize pot. If invalid, the cheater forfeits their wager.

---

## 🧪 Verification & Build Suite

ChainPlay features automated verification test suites covering every layer of the application.

### 1. Compile & Typecheck
```bash
# Production Next.js build (Zero compile errors, all static & dynamic routes)
npm run build

# Strict TypeScript type check (Zero `any` types, strict null checks)
npm run typecheck
```

### 2. Run All Automated Verification Scripts
```bash
# 1. Cryptographic Engine & Formatting Test Suite (7/7 tests passed)
npx tsx src/lib/crypto/__tests__/verifyCrypto.ts

# 2. State Stores & Mock Chain Engine (6/6 tests passed)
npx tsx src/lib/mock/__tests__/mockEngine.test.ts

# 3. Web3 Abstraction Layer & Contract Hooks (7/7 tests passed)
npx tsx src/hooks/__tests__/verifyHooks.ts

# 4. Shared Layout & UI Components (6/6 checks passed)
npx tsx src/components/__tests__/verifyComponents.ts

# 5. Tic-Tac-Toe Arena (12/12 checks passed)
npx tsx src/components/games/tictactoe/__tests__/verifyTicTacToe.ts

# 6. Battleship Arena (13/13 checks passed)
npx tsx src/components/games/battleship/__tests__/verifyBattleship.ts

# 7. Memory Duel Arena (14/14 checks passed)
npx tsx src/components/games/memory/__tests__/verifyMemoryDuel.ts
```

**Total Verification Result**: **65 / 65 checks passed (100% pass rate)**.

---

## 🚀 Getting Started

### Prerequisites
- Node.js `v18.17+` or `v20+`
- npm `v9+` or `v10+`

### Installation & Local Run
```bash
# 1. Install dependencies
npm install

# 2. Launch development server
npm run dev

# 3. Open browser
http://localhost:3000
```

To test 2-player multiplayer locally without MetaMask:
- **Player 1**: Open `http://localhost:3000` (Create a room in Lobby).
- **Player 2**: Open `http://localhost:3000?tab=2` in an incognito or separate window (Join the room).

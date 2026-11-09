# ⚡ CHAINPLAY — Web3 Arcade Arenas

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Hedera Testnet](https://img.shields.io/badge/Hedera-Testnet%20(296)-0088cc?style=for-the-badge&logo=hedera)](https://hashscan.io/testnet)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![EIP-712](https://img.shields.io/badge/EIP--712-Signed%20Vouchers-green?style=for-the-badge)](https://eips.ethereum.org/EIPS/eip-712)

> **Decentralized 1v1 PvP Web3 Gaming Arcade** built on **Hedera Testnet (EVM)** powered by **ChainPlayToken (CPT)** and cryptographic zero-trust payout vaults.

---

## 🎮 Game Modes

ChainPlay features three real-time multiplayer PvP games with instant on-chain staking and cryptographic outcomes:

| Game | Mode & Description | Stake & Pot | Tech Highlights |
| :--- | :--- | :--- | :--- |
| **⚔️ Tic-Tac-Toe** | High-speed 3x3 tactical grid duel | **60 CPT Stake**<br>→ **120 CPT Pot** | 60-second move timer, interactive sound effects, SVG laser-strike winlines |
| **🛡️ Battleship** | 10x10 cryptographic naval strategy | **60 CPT Stake**<br>→ **120 CPT Pot** | Poseidon hash commitments, fog-of-war radar, anti-cheat cryptographic verification |
| **🧠 Memory Duel** | 4x4 cyber glyph matrix matching | **60 CPT Stake**<br>→ **120 CPT Pot** | 16-card Web3 token deck, dynamic streak multipliers up to 3x, memory recall |

---

## 💎 CPT Tokenomics & Reward Mechanics

The platform operates **100% on ChainPlayToken (CPT)** with zero counterparty risk:

```
                      ┌────────────────────────┐
                      │  Player Enters Arena   │
                      └───────────┬────────────┘
                                  │
                                  ▼
                     [ Stake 60 CPT in MetaMask ]
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │  TokenManager Vault    │
                      │  Total Pot: 120 CPT    │
                      └───────────┬────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
            🏆 VICTORY                      💀 DEFEAT / DRAW
  ┌─────────────────────────────┐     ┌─────────────────────────────┐
  │  • EIP-712 Signed Voucher   │     │  • Lost 60 CPT Stake        │
  │  • Claim +120 CPT on Hedera │     │  • 0 CPT Payout             │
  │  • 0% Platform Escrow Fee   │     │  • No claim box displayed   │
  └─────────────────────────────┘     └─────────────────────────────┘
```

* **Match Entry Stake**: Exactly **60 CPT** per player transferred to `TokenManager` upon match start.
* **Winner Takes All**: The winner receives the **full 120 CPT pot** (60 CPT original stake + 60 CPT opponent stake).
* **Defeat / Stalemate**: The player forfeits the stake (**0 CPT payout**, no claim button rendered).
* **Instant Rematch**: Clicking **`Play Again (60 CPT)`** prompts MetaMask to stake another 60 CPT with a fresh on-chain `gameId`.

---

## 📜 Deployed Smart Contracts (Hedera Testnet)

All smart contracts are deployed and verified on **Hedera Testnet (EVM Chain ID `296`)**:

| Contract | Address | Network | Explorer |
| :--- | :--- | :--- | :--- |
| **ChainPlayToken (CPT)** | `0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a` | Hedera Testnet (296) | [View on HashScan](https://hashscan.io/testnet/token/0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a) |
| **TokenManager Vault** | `0x6D22E4bCF8ab77E13FEB5F59E2C7C404aDe610A9` | Hedera Testnet (296) | [View on HashScan](https://hashscan.io/testnet/contract/0x6D22E4bCF8ab77E13FEB5F59E2C7C404aDe610A9) |

---

## 🛠️ Architecture & Tech Stack

### Frontend & Web3
* **Framework**: Next.js 14 (App Router), React 18, TypeScript (Strict, 0 `any` types)
* **Web3 Integration**: Wagmi v2, Viem v2, RainbowKit
* **Network**: Hedera Testnet (EVM JSON-RPC via `https://testnet.hashio.io/api`)
* **State Management**: Zustand stores with localStorage persistence
* **Styling**: Tailwind CSS, Cyberpunk neon glow effects, Framer Motion animations
* **Audio**: Web Audio Synthesizer (Zero asset loading delay)

### Smart Contracts
* **Language**: Solidity `^0.8.24` (with `cancun` EVM version & optimizer)
* **Framework**: Hardhat, TypeChain, Ethers.js / Viem
* **Standards**: OpenZeppelin ERC-20, ERC20Burnable, ERC20Pausable, AccessControl, EIP-712, ReentrancyGuard

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.18+ or v20+
* **Package Manager**: `npm`
* **Wallet**: MetaMask with Hedera Testnet configured:
  * **Network Name**: Hedera Testnet
  * **RPC URL**: `https://testnet.hashio.io/api`
  * **Chain ID**: `296`
  * **Currency Symbol**: `HBAR`
  * **Block Explorer**: `https://hashscan.io/testnet`

---

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ChainPlay.git
   cd ChainPlay
   ```

2. **Frontend Configuration:**
   ```bash
   cd frontend
   cp .env.example .env.local
   npm install
   ```

   Configure your `.env.local`:
   ```env
   NEXT_PUBLIC_DEFAULT_CHAIN_ID=296
   NEXT_PUBLIC_HEDERA_CHAIN_PLAY_TOKEN=0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a
   NEXT_PUBLIC_HEDERA_TOKEN_MANAGER=0x6D22E4bCF8ab77E13FEB5F59E2C7C404aDe610A9
   NEXT_PUBLIC_HEDERA_TESTNET_RPC=https://testnet.hashio.io/api

   # Server-side Operator signing key (EIP-712 reward vouchers & faucet)
   HEDERA_OPERATOR_PRIVATE_KEY=0xYOUR_OPERATOR_PRIVATE_KEY
   HEDERA_OPERATOR_ACCOUNT_ID=0.0.YOUR_ACCOUNT_ID
   ```

3. **Smart Contracts (Optional, for re-compilation/testing):**
   ```bash
   cd ../contracts
   cp .env.example .env
   npm install
   npx hardhat compile
   npx hardhat test
   ```

---

### Running the Application

* **Development Mode:**
  ```bash
  cd frontend
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

* **Production Build:**
  ```bash
  cd frontend
  npm run build
  npm run start
  ```

---

## 🔒 Security & Anti-Cheat

* **EIP-712 Cryptographic Signatures**: Rewards can only be claimed using tamper-proof operator vouchers signed off-chain after verified victory.
* **Anti-Replay Protection**: `TokenManager.isGameRewarded[gameId]` ensures each match reward can only ever be claimed once on-chain.
* **Checks-Effects-Interactions & ReentrancyGuard**: Token state is updated before contract transfers are executed.
* **Secret Commitments**: Battleship fleets are committed using cryptographic hashes prior to firing, preventing board manipulation.

---

## 📄 License

This project is licensed under the **MIT License**.

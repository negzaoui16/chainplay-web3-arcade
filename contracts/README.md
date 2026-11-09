# ChainPlay — Hedera EVM Smart Contracts

This directory contains the core Hedera EVM smart contracts powering the **ChainPlay** Web3 arcade token economy.

---

## 📦 Contracts Overview

| Contract | Standard | Description |
| :--- | :--- | :--- |
| **`ChainPlayToken.sol`** | ERC-20 | The native gaming token (`CPT`, 18 decimals). Initial supply of **1,000,000 CPT** minted on deployment. Supports burnable tokens, controlled minting, and emergency pausing. |
| **`TokenManager.sol`** | EIP-712 / Vault | The economic orchestrator holding a 600,000 CPT reward pool. Validates game victory/participation vouchers signed off-chain via **EIP-712** and distributes tokens to players with anti-replay protection. |

---

## 🛠️ Prerequisites & Setup

1. **Navigate to the contracts folder:**
   ```bash
   cd contracts
   npm install
   ```

2. **Configure your Hedera Testnet Environment:**
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

3. **Obtain Hedera Testnet Credentials:**
   * Go to the [Hedera Developer Portal](https://portal.hedera.com/).
   * Register or log in to generate a free **Testnet Account**.
   * Copy your **ECDSA Private Key** (or Hex format key with or without `0x`).
   * Put it in `contracts/.env`:
     ```env
     HEDERA_OPERATOR_PRIVATE_KEY=0xYOUR_HEDERA_ECDSA_PRIVATE_KEY
     HEDERA_TESTNET_RPC_URL=https://testnet.hashio.io/api
     ```
   * Your testnet account is pre-funded with 10,000 free testnet HBAR for deployment gas.

---

## 🧪 Running Automated Tests

Run the comprehensive test suite (26 automated unit and integration tests):
```bash
npm test
```

Expected output:
```
  ChainPlayToken (CPT)
    Deployment & Metadata (4 passing)
    Controlled Minting (4 passing)
    Burning (2 passing)
    Pausable Controls (2 passing)

  TokenManager
    Deployment & Vault State (3 passing)
    Claiming Rewards via EIP-712 Vouchers (6 passing)
    Batch Distribution (Operator) (2 passing)
    Emergency & Administration (3 passing)

  26 passing (1s)
```

---

## 🚀 Deploying to Hedera Testnet

Deploy both contracts and auto-fund the `TokenManager` vault on Hedera Testnet:
```bash
npm run deploy:hedera
```

The script will:
1. Deploy `ChainPlayToken.sol` (mints 1,000,000 CPT to deployer).
2. Deploy `TokenManager.sol` configured with the token address and deployer as admin & operator.
3. Automatically transfer **600,000 CPT** into `TokenManager`'s reward vault.
4. Output the contract addresses and explorer links on [HashScan Testnet](https://hashscan.io/testnet).

---

## 🔐 EIP-712 Voucher Signing Guide (Backend / Operator)

To authorize a player to claim winnings without the backend paying on-chain gas:

```typescript
import { ethers } from "ethers";

// EIP-712 Domain definition
const domain = {
  name: "ChainPlay TokenManager",
  version: "1",
  chainId: 296, // Hedera Testnet
  verifyingContract: TOKEN_MANAGER_ADDRESS,
};

// Types definition
const types = {
  RewardVoucher: [
    { name: "gameId", type: "bytes32" },
    { name: "gameType", type: "uint8" }, // 0: TicTacToe, 1: Battleship, 2: MemoryDuel
    { name: "player", type: "address" },
    { name: "winAmount", type: "uint256" },
    { name: "participationAmount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

// Voucher payload
const voucher = {
  gameId: ethers.keccak256(ethers.toUtf8Bytes("unique_match_id_123")),
  gameType: 0,
  player: "0xPlayerAddress...",
  winAmount: ethers.parseEther("50"),          // 50 CPT win reward
  participationAmount: ethers.parseEther("10"), // 10 CPT participation
  nonce: Date.now(),
  deadline: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
};

// Sign with operator wallet
const operatorWallet = new ethers.Wallet(HEDERA_OPERATOR_PRIVATE_KEY);
const signature = await operatorWallet.signTypedData(domain, types, voucher);

// Deliver { voucher, signature } to frontend for on-chain claim
```

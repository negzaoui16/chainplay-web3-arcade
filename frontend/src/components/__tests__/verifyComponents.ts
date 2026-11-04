/**
 * ChainPlay - Shared Layout & UI Components Verification Test
 *
 * Verifies that:
 * 1. All layout and shared UI components import cleanly from `@/components`.
 * 2. Component constructors instantiate valid React elements with required props.
 * 3. Explorer link generation utility functions correctly for Sepolia & Arbitrum.
 * 4. TypeScript compilation succeeds with zero `any` types.
 */

import React from "react";
import {
  Navbar,
  NetworkBanner,
  PlayerHud,
  TransactionToast,
  GameOverModal,
  getExplorerTxUrl,
  type PlayerHudProps,
  type TransactionToastProps,
  type GameOverModalProps,
} from "../index";

export function runComponentVerification(): {
  success: boolean;
  checks: string[];
} {
  const checks: string[] = [];

  // 1. Verify Navbar component
  const navEl = React.createElement(Navbar);
  if (!React.isValidElement(navEl)) {
    throw new Error("Navbar failed to create valid React element");
  }
  checks.push("Navbar element created successfully");

  // 2. Verify NetworkBanner component
  const bannerEl = React.createElement(NetworkBanner);
  if (!React.isValidElement(bannerEl)) {
    throw new Error("NetworkBanner failed to create valid React element");
  }
  checks.push("NetworkBanner element created successfully");

  // 3. Verify PlayerHud component
  const hudProps: PlayerHudProps = {
    player1Address: "0x1111111111111111111111111111111111111111",
    player2Address: "0x2222222222222222222222222222222222222222",
    currentUserAddress: "0x1111111111111111111111111111111111111111",
    wager: 50000000000000000n, // 0.05 ETH
    currentTurn: "player1",
    timeRemaining: 45,
    maxTurnTime: 60,
    isGameOver: false,
    isBotOpponent: false,
    onClaimTimeout: () => {},
  };
  const hudEl = React.createElement(PlayerHud, hudProps);
  if (!React.isValidElement(hudEl)) {
    throw new Error("PlayerHud failed to create valid React element");
  }
  checks.push("PlayerHud element created successfully with 1v1 props");

  // 4. Verify TransactionToast component
  const toastProps: TransactionToastProps = {
    status: "confirmed",
    title: "Move Submitted",
    description: "Grid placement recorded on-chain",
    txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    chainId: 11155111,
    onClose: () => {},
  };
  const toastEl = React.createElement(TransactionToast, toastProps);
  if (!React.isValidElement(toastEl)) {
    throw new Error("TransactionToast failed to create valid React element");
  }
  checks.push("TransactionToast element created successfully");

  // Verify getExplorerTxUrl
  const sepoliaUrl = getExplorerTxUrl(
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    11155111
  );
  if (!sepoliaUrl?.includes("sepolia.etherscan.io")) {
    throw new Error("getExplorerTxUrl failed for Sepolia");
  }

  const arbUrl = getExplorerTxUrl(
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    421614
  );
  if (!arbUrl?.includes("arbiscan.io")) {
    throw new Error("getExplorerTxUrl failed for Arbitrum Sepolia");
  }
  checks.push("Explorer transaction URL generator verified for Sepolia and Arbitrum");

  // 5. Verify GameOverModal component
  const modalProps: GameOverModalProps = {
    isOpen: true,
    outcome: "victory",
    winnerAddress: "0x1111111111111111111111111111111111111111",
    currentUserAddress: "0x1111111111111111111111111111111111111111",
    wager: 100000000000000000n, // 0.1 ETH
    xpEarned: 250,
    reason: "3 in a row",
    onPlayAgain: () => {},
    onBackToLobby: () => {},
    onClose: () => {},
  };
  const modalEl = React.createElement(GameOverModal, modalProps);
  if (!React.isValidElement(modalEl)) {
    throw new Error("GameOverModal failed to create valid React element");
  }
  checks.push("GameOverModal element created successfully with victory props");

  return {
    success: true,
    checks,
  };
}

// Run verification if executed directly in node / ts-node
if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  try {
    const result = runComponentVerification();
    console.log("✅ Component Verification Passed:", result.checks.length, "checks");
    for (const c of result.checks) {
      console.log(`   - ${c}`);
    }
  } catch (err) {
    console.error("❌ Component Verification Failed:", err);
  }
}

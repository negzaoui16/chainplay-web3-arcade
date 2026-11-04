/**
 * ChainPlay - Web3 Abstraction Layer & Dual-Mode Contract Hooks Test Suite
 *
 * Verifies that all hooks operate seamlessly in Mock Mode without
 * requiring a live Web3 wallet or active blockchain connection:
 * 1. useChainPlayMode: mock routing, chainId resolution, and address registry.
 * 2. useGameManager: mock room creation, joining, cancellation, and retrieval.
 * 3. useTicTacToeContract: optimistic moves, turns, and timeout claim win.
 * 4. useBattleshipContract: commit-reveal naval warfare, firing, and board verification.
 * 5. useMemoryDuelContract: deck initialization, pair flips, and turn progression.
 * 6. useRewardManager: reward stats calculation and withdrawal in mock mode.
 *
 * Zero `any` types. Strict assertions.
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig, supportedChains, hardhatChain } from "../../config/wagmi";
import { useAppStore, MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS } from "../../store/useAppStore";
import { useTicTacToeStore } from "../../store/useTicTacToeStore";
import { useBattleshipStore } from "../../store/useBattleshipStore";
import { useMemoryStore } from "../../store/useMemoryStore";
import {
  useChainPlayMode,
  useGameManager,
  useTicTacToeContract,
  useBattleshipContract,
  useMemoryDuelContract,
  useRewardManager,
} from "../index";
import { GameType, RoomStatus } from "../../types/lobby.types";
import { CHAIN_IDS } from "../../config/constants";
import { generateRandomFleet, validateFleetPlacement, generateSalt, generateBoardHash } from "../../lib/crypto/battleshipCrypto";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

// Global test query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

/**
 * Executes a hook test inside the Wagmi + React Query provider tree.
 */
function runInHookContext<T>(hookFn: () => T): T {
  let hookResult: T | undefined;

  function TestHarness() {
    hookResult = hookFn();
    return React.createElement("div", null, "hook-executed");
  }

  renderToString(
    React.createElement(
      WagmiProvider,
      { config: wagmiConfig },
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(TestHarness)
      )
    )
  );

  if (hookResult === undefined) {
    throw new Error("Hook harness failed to execute hook function");
  }

  return hookResult;
}

async function runVerificationSuite(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚀 Starting ChainPlay Web3 Abstraction & Contract Hooks Tests");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let suitesPassed = 0;

  // -------------------------------------------------------------------------
  // 1. Wagmi Client & Multi-Chain Config
  // -------------------------------------------------------------------------
  console.log("▶ [1/7] Testing Wagmi v2 Client & Network Configuration...");
  assert(wagmiConfig !== undefined, "wagmiConfig must be defined");
  assert(supportedChains.length === 3, "Supported chains must include 3 networks");
  assert(hardhatChain.id === CHAIN_IDS.HARDHAT, "Hardhat chain ID must be 31337");

  console.log("  ✓ Wagmi client configured with Sepolia, Arbitrum Sepolia, and Hardhat");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 2. useChainPlayMode Dispatcher Hook
  // -------------------------------------------------------------------------
  console.log("\n▶ [2/7] Testing useChainPlayMode Hook...");
  useAppStore.getState().setMockMode(true);

  const mode = runInHookContext(() => useChainPlayMode());

  assert(mode.isMock === true, "isMock must be true when mock mode is enabled");
  assert(mode.isLiveOnChain === false, "isLiveOnChain must be false in mock mode");
  assert(mode.contractAddresses !== undefined, "contractAddresses registry must be accessible");
  assert(
    mode.effectiveAddress.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "effectiveAddress must fallback to mockPlayerAddress when wallet disconnected"
  );
  assert(mode.isConnected === false, "isConnected must be false without active wallet");

  console.log("  ✓ useChainPlayMode accurately routes to mock execution");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 3. useGameManager Hook (Room Creation & Lifecycle)
  // -------------------------------------------------------------------------
  console.log("\n▶ [3/7] Testing useGameManager Hook...");
  const gameManager = runInHookContext(() => useGameManager());

  // Create room
  const createRes = await gameManager.createGame(GameType.TIC_TAC_TOE, "0.02");
  assert(createRes.gameId.length > 0, "Created game must return valid gameId");

  // Get game info
  const roomInfo = await gameManager.getGameInfo(createRes.gameId);
  assert(roomInfo !== null, "Created room info must be retrievable");
  assert(roomInfo?.gameType === GameType.TIC_TAC_TOE, "Game type must match");
  assert(roomInfo?.status === RoomStatus.WAITING, "Created room status must be WAITING");

  // Join room
  useAppStore.getState().switchMockPlayerRole("player2");
  const joinRes = await gameManager.joinGame(createRes.gameId, "0.02");
  assert(joinRes.success === true, "Joining room must succeed");

  const joinedInfo = await gameManager.getGameInfo(createRes.gameId);
  assert(joinedInfo?.status === RoomStatus.ACTIVE, "Room must transition to ACTIVE");
  assert(
    joinedInfo?.player2?.toLowerCase() === MOCK_PLAYER_2_ADDRESS.toLowerCase(),
    "Room player2 must record joining address"
  );

  // Test Cancel waiting game
  useAppStore.getState().switchMockPlayerRole("player1");
  const cancelTestRoom = await gameManager.createGame(GameType.BATTLESHIP, "0.05");
  await gameManager.cancelWaitingGame(cancelTestRoom.gameId);
  const cancelledInfo = await gameManager.getGameInfo(cancelTestRoom.gameId);
  assert(cancelledInfo?.status === RoomStatus.CANCELLED, "Room status must be CANCELLED");

  console.log("  ✓ useGameManager creation, joining, and cancellation verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 4. useTicTacToeContract Hook
  // -------------------------------------------------------------------------
  console.log("\n▶ [4/7] Testing useTicTacToeContract Hook...");
  const tttGameId = "xo_mock_test_1";
  useTicTacToeStore.getState().initGame(tttGameId, MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS);

  const tttContract = runInHookContext(() => useTicTacToeContract(tttGameId));

  // Player 1 makes move to cell 4 (center)
  const moveRes = await tttContract.makeMove(tttGameId, 4);
  assert(moveRes.success === true, "Make move must succeed in mock mode");
  assert(useTicTacToeStore.getState().board[4] === 1, "Board center cell must contain X");
  assert(
    useTicTacToeStore.getState().currentTurn.toLowerCase() === MOCK_PLAYER_2_ADDRESS.toLowerCase(),
    "Turn must switch to Player 2"
  );

  // Test Timeout claim
  useTicTacToeStore.setState({ lastMoveTimestamp: Date.now() - 65000 });
  const claimRes = await tttContract.claimTimeoutWin(tttGameId);
  assert(claimRes.success === true, "Timeout claim must succeed after 60s elapsed");
  assert(
    useTicTacToeStore.getState().winner?.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "Claimant must be winner"
  );

  // Test getBoard
  const boardData = await tttContract.getBoard(tttGameId);
  assert(boardData !== null, "getBoard must return valid board state");
  assert(boardData?.board.length === 9, "Board must contain 9 cells");
  assert(boardData?.winner?.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(), "Board data winner must match");

  console.log("  ✓ useTicTacToeContract moves, timeout win, and getBoard verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 5. useBattleshipContract Hook
  // -------------------------------------------------------------------------
  console.log("\n▶ [5/7] Testing useBattleshipContract Hook...");
  const btlGameId = "btl_mock_test_1";
  useBattleshipStore.getState().initGame(btlGameId, MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS);

  const btlContract = runInHookContext(() => useBattleshipContract(btlGameId));

  // Generate fleet & commit
  const fleet = generateRandomFleet();
  const validation = validateFleetPlacement(fleet);
  const salt = generateSalt();
  const boardHash = generateBoardHash(validation.flatBoard, salt);

  const commitRes = await btlContract.commitBoard(btlGameId, boardHash);
  assert(commitRes.success === true, "commitBoard must succeed in mock mode");

  // Opponent commits to start COMBAT phase
  useBattleshipStore.getState().setOpponentCommitment(boardHash);

  // Fire shot
  const fireRes = await btlContract.fireShot(btlGameId, 0, 0);
  assert(fireRes.success === true, "fireShot must succeed in mock mode");

  // Verify board
  const verifyRes = await btlContract.verifyFinalBoard(btlGameId, validation.flatBoard, salt);
  assert(verifyRes.success === true && verifyRes.valid === true, "verifyFinalBoard must pass");

  // Claim timeout win
  const btlClaimRes = await btlContract.claimTimeoutWin(btlGameId);
  assert(btlClaimRes.success === true, "claimTimeoutWin must succeed");
  assert(useBattleshipStore.getState().phase === "FINISHED", "Phase must transition to FINISHED on timeout claim");
  assert(useBattleshipStore.getState().winner !== null, "Battleship winner must be set on timeout claim");

  console.log("  ✓ useBattleshipContract commit, firing, and verification verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 6. useMemoryDuelContract Hook
  // -------------------------------------------------------------------------
  console.log("\n▶ [6/7] Testing useMemoryDuelContract Hook...");
  const memGameId = "mem_mock_test_1";
  const memContract = runInHookContext(() => useMemoryDuelContract(memGameId));

  // Initialize deck
  const initRes = await memContract.initializeDeck(memGameId);
  assert(initRes.success === true, "initializeDeck must succeed in mock mode");
  assert(useMemoryStore.getState().cards.length === 16, "Must initialize 16 cards");

  // Flip pair
  const flipRes = await memContract.flipPair(memGameId, 0, 1);
  assert(flipRes.success === true, "flipPair must succeed in mock mode");

  // Claim timeout win
  const memClaimRes = await memContract.claimTimeoutWin(memGameId);
  assert(memClaimRes.success === true, "claimTimeoutWin must succeed");
  assert(useMemoryStore.getState().turnPhase === "TURN_LOCKED", "turnPhase must be TURN_LOCKED on timeout claim");
  assert(useMemoryStore.getState().winner !== null, "Memory Duel winner must be set on timeout claim");

  // Test getGameState
  const memState = await memContract.getGameState(memGameId);
  assert(memState !== null, "getGameState must return memory state");
  assert(typeof memState?.p1Score === "number", "p1Score must be a number");
  assert(typeof memState?.matchedPairs === "number", "matchedPairs must be a number");

  console.log("  ✓ useMemoryDuelContract deck initialization, card flips, and getGameState verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 7. useRewardManager Hook
  // -------------------------------------------------------------------------
  console.log("\n▶ [7/7] Testing useRewardManager Hook...");
  const rewardManager = runInHookContext(() => useRewardManager());

  // Get reward stats
  const stats = await rewardManager.getRewardStats(MOCK_PLAYER_1_ADDRESS);
  assert(stats.claimableWei >= 0n, "claimableWei must be valid BigInt");
  assert(stats.xpPoints >= 100, "xpPoints must be populated");
  console.log(`  ✓ Initial Mock Rewards: ${stats.claimableWei.toString()} Wei, XP: ${stats.xpPoints}`);

  // Withdraw rewards
  if (stats.claimableWei > 0n) {
    const withdrawRes = await rewardManager.withdrawRewards();
    assert(withdrawRes.success === true, "withdrawRewards must succeed in mock mode");
    const updatedStats = await rewardManager.getRewardStats(MOCK_PLAYER_1_ADDRESS);
    assert(updatedStats.claimableWei === 0n, "claimableWei must be 0 after withdrawal");
    console.log("  ✓ Rewards successfully claimed and reset to 0");
  }

  console.log("  ✓ useRewardManager stats query and claim flow verified");
  suitesPassed++;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`🎉 ALL ${suitesPassed}/7 TEST SUITES PASSED FLAWLESSLY!`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

runVerificationSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

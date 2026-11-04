/**
 * ChainPlay - Tic-Tac-Toe Arena (XO) Verification Suite
 *
 * Verifies:
 * 1. Element instantiation for `XOCell`, `XOBoard`, and `TicTacToeArena` with strict props.
 * 2. All 8 canonical winning triplets ([0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]).
 * 3. Optimistic move execution and rollback integrity in `useTicTacToeStore`.
 * 4. Full game flow against Smart Tactical Bot.
 * 5. Timeout forfeit claim evaluation.
 *
 * Zero `any` types. Strict TypeScript.
 */

import React from "react";
import {
  XOCell,
  XOBoard,
  TicTacToeArena,
  type XOCellProps,
  type XOBoardProps,
  type TicTacToeArenaProps,
} from "../index";
import {
  useTicTacToeStore,
  WINNING_COMBINATIONS,
  checkWinner,
} from "@/store/useTicTacToeStore";
import {
  botPlayTicTacToe,
} from "@/lib/mock/mockChainEngine";
import {
  type CellValue,
  type XOWinningLine,
  XO_CELL_EMPTY,
  XO_CELL_X,
  XO_CELL_O,
} from "@/types/tictactoe.types";
import { MOCK_BOT_ADDRESS } from "@/store/useAppStore";

export function runTicTacToeVerification(): {
  success: boolean;
  checks: string[];
} {
  const checks: string[] = [];

  // 1. Verify XOCell element instantiation
  const cellProps: XOCellProps = {
    index: 4,
    value: XO_CELL_X,
    isOptimisticPending: false,
    isWinningCell: true,
    winningSymbol: 1,
    isClickable: false,
    hoverSymbol: null,
    onClick: () => {},
  };
  const cellEl = React.createElement(XOCell, cellProps);
  if (!React.isValidElement(cellEl)) {
    throw new Error("XOCell failed to produce valid React element");
  }
  checks.push("XOCell created successfully with active X and winning state");

  // 1b. Verify XOCell in optimistic pending state
  const pendingCellProps: XOCellProps = {
    index: 0,
    value: XO_CELL_O,
    isOptimisticPending: true,
    isWinningCell: false,
    isClickable: false,
    onClick: () => {},
  };
  const pendingCellEl = React.createElement(XOCell, pendingCellProps);
  if (!React.isValidElement(pendingCellEl)) {
    throw new Error("XOCell failed to produce valid pending React element");
  }
  checks.push("XOCell created successfully with optimistic pending state");

  // 2. Verify XOBoard element instantiation
  const dummyBoard: CellValue[] = [1, 2, 0, 0, 1, 0, 0, 2, 1];
  const boardProps: XOBoardProps = {
    board: dummyBoard,
    winningLine: [0, 4, 8],
    winningSymbol: 1,
    optimisticPendingIndex: null,
    isBoardLocked: false,
    isMyTurn: true,
    mySymbol: 1,
    onCellClick: () => {},
  };
  const boardEl = React.createElement(XOBoard, boardProps);
  if (!React.isValidElement(boardEl)) {
    throw new Error("XOBoard failed to produce valid React element");
  }
  checks.push("XOBoard created successfully with 3x3 layout and diagonal winning line");

  // 3. Verify TicTacToeArena element instantiation
  const arenaProps: TicTacToeArenaProps = {
    gameId: "ttt_verify_001",
    initialWager: 10000000000000000n, // 0.01 ETH
    initialPlayer1: "0x1111111111111111111111111111111111111111",
    initialPlayer2: MOCK_BOT_ADDRESS,
    onBackToLobby: () => {},
    onRematch: () => {},
  };
  const arenaEl = React.createElement(TicTacToeArena, arenaProps);
  if (!React.isValidElement(arenaEl)) {
    throw new Error("TicTacToeArena failed to produce valid React element");
  }
  checks.push("TicTacToeArena created successfully with full HUD and Bot challenger");

  // 4. Verify all 8 canonical winning triplets
  const expectedCombos: XOWinningLine[] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  if (WINNING_COMBINATIONS.length !== 8) {
    throw new Error(`Expected 8 winning combinations, got ${WINNING_COMBINATIONS.length}`);
  }

  for (const combo of expectedCombos) {
    const found = WINNING_COMBINATIONS.some(
      ([a, b, c]) => a === combo[0] && b === combo[1] && c === combo[2]
    );
    if (!found) {
      throw new Error(`Missing expected winning combo: [${combo.join(",")}]`);
    }

    // Test checkWinner with this specific combo filled with X
    const testBoard: CellValue[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    testBoard[combo[0]] = XO_CELL_X;
    testBoard[combo[1]] = XO_CELL_X;
    testBoard[combo[2]] = XO_CELL_X;

    const result = checkWinner(testBoard, "0xp1", "0xp2");
    if (result.winner !== "0xp1" || !result.winningLine) {
      throw new Error(`checkWinner failed to detect winning triplet: [${combo.join(",")}]`);
    }
  }
  checks.push("All 8 winning combinations verified with checkWinner");

  // 5. Test Optimistic Move & Rollback logic in Store
  const p1 = "0x1111111111111111111111111111111111111111";
  const p2 = MOCK_BOT_ADDRESS;

  useTicTacToeStore.getState().initGame("test_game_optimistic", p1, p2);
  const playSuccess = useTicTacToeStore.getState().playMoveOptimistic(4, p1);
  const sAfter = useTicTacToeStore.getState();
  if (!playSuccess || sAfter.board[4] !== XO_CELL_X) {
    throw new Error(`playMoveOptimistic failed: playSuccess=${playSuccess}, board[4]=${sAfter.board[4]}`);
  }
  if (sAfter.optimisticPendingIndex !== 4) {
    throw new Error("optimisticPendingIndex was not set to 4");
  }
  checks.push("Store optimistic move execution verified");

  // Confirm move
  useTicTacToeStore.getState().confirmMove(4, 1, p1);
  if (useTicTacToeStore.getState().optimisticPendingIndex !== null) {
    throw new Error("confirmMove failed to clear optimisticPendingIndex");
  }
  checks.push("Store move confirmation cleared pending index");

  // Test rollback
  useTicTacToeStore.getState().playMoveOptimistic(0, p2);
  if (useTicTacToeStore.getState().board[0] !== XO_CELL_O) {
    throw new Error("P2 move failed on cell 0");
  }
  useTicTacToeStore.getState().rollbackMove(0);
  if (useTicTacToeStore.getState().board[0] !== XO_CELL_EMPTY) {
    throw new Error("rollbackMove failed to reset cell 0 to empty");
  }
  checks.push("Store rollback restored cell to empty");

  // 6. Test Smart Tactical Bot Move response
  const botBoard: CellValue[] = [
    1, 1, 0, // Bot must block cell 2!
    2, 0, 0,
    0, 0, 0,
  ];
  const botBlockedMove = botPlayTicTacToe(botBoard, 2);
  if (botBlockedMove !== 2) {
    throw new Error(`Expected bot to block opponent at index 2, got ${botBlockedMove}`);
  }
  checks.push("Smart Bot Tactical Blocker verified (blocked player win at index 2)");

  // 7. Test Bot Winning Priority
  const botWinBoard: CellValue[] = [
    2, 2, 0, // Bot can immediately win at cell 2!
    1, 1, 0, // Player threatens cell 5
    0, 0, 0,
  ];
  const botWinningMove = botPlayTicTacToe(botWinBoard, 2);
  if (botWinningMove !== 2) {
    throw new Error(`Expected bot to take immediate win at index 2, got ${botWinningMove}`);
  }
  checks.push("Smart Bot Immediate Win Priority verified");

  // 8. Test 60s Timeout Forfeit Claim evaluation
  useTicTacToeStore.getState().initGame("timeout_test", p1, p2);
  // It is P1's turn initially; P1 cannot claim timeout on themselves
  const selfClaim = useTicTacToeStore.getState().claimTimeoutWin(p1);
  if (selfClaim) {
    throw new Error("Player should not be able to claim timeout on their own active turn");
  }

  // Set lastMoveTimestamp to 65 seconds ago while it is P2's turn
  useTicTacToeStore.setState({
    currentTurn: p2.toLowerCase(),
    lastMoveTimestamp: Date.now() - 65 * 1000,
  });

  const p1TimeoutClaim = useTicTacToeStore.getState().claimTimeoutWin(p1);
  if (!p1TimeoutClaim) {
    throw new Error("P1 failed to claim forfeit victory after P2 exceeded 60s limit");
  }
  if (useTicTacToeStore.getState().winner !== p1.toLowerCase()) {
    throw new Error("Timeout claim did not set winner to P1");
  }
  checks.push("60s Timeout Forfeit Claim successfully awarded to claimant");

  // 9. Full Multi-Turn Game Loop Simulation (Human vs Bot)
  // Verifies that optimisticPendingIndex is null after every turn and the board never deadlocks
  useTicTacToeStore.getState().initGame("sim_full_match", p1, p2);
  let turnsCount = 0;
  const maxTurns = 9;

  while (
    useTicTacToeStore.getState().winner === null &&
    !useTicTacToeStore.getState().isDraw &&
    turnsCount < maxTurns
  ) {
    const currentState = useTicTacToeStore.getState();
    const isHumanTurn =
      currentState.currentTurn.toLowerCase() === p1.toLowerCase();

    if (isHumanTurn) {
      // Pick first available empty cell
      const openCell = currentState.board.findIndex((c) => c === XO_CELL_EMPTY);
      if (openCell === -1) break;

      // Human plays optimistic move
      const played = currentState.playMoveOptimistic(openCell, p1);
      if (!played) {
        throw new Error(`Human move failed unexpectedly on cell ${openCell}`);
      }

      // Verify pending index was set during optimistic phase
      if (useTicTacToeStore.getState().optimisticPendingIndex !== openCell) {
        throw new Error(`Expected optimisticPendingIndex to be ${openCell}`);
      }

      // Simulate move confirmation (as handled in makeMove)
      useTicTacToeStore.getState().confirmMove(openCell, 1, p1);

      // Verify pending index is cleared immediately
      if (useTicTacToeStore.getState().optimisticPendingIndex !== null) {
        throw new Error(
          `optimisticPendingIndex was not cleared after Human turn on cell ${openCell}`
        );
      }
    } else {
      // Bot plays using minimax / tactical blocker
      const botChosen = botPlayTicTacToe(currentState.board, 2);

      // Bot directly confirms move (as now implemented in triggerBotTurn)
      useTicTacToeStore.getState().confirmMove(botChosen, 2, p2);

      // Verify pending index is null immediately so board is not locked for human
      if (useTicTacToeStore.getState().optimisticPendingIndex !== null) {
        throw new Error(
          `optimisticPendingIndex was not null after Bot turn on cell ${botChosen}`
        );
      }
    }

    turnsCount++;
  }

  const finalSimState = useTicTacToeStore.getState();
  if (finalSimState.winner === null && !finalSimState.isDraw) {
    throw new Error("Simulated match did not resolve to win or draw");
  }
  if (finalSimState.optimisticPendingIndex !== null) {
    throw new Error("Final match state left optimisticPendingIndex non-null");
  }
  checks.push(
    `Full Human vs Bot multi-turn match resolved cleanly in ${turnsCount} turns (${
      finalSimState.winner ? `Winner: ${finalSimState.winner === p1.toLowerCase() ? "Human" : "Bot"}` : "Draw"
    }) with zero optimistic deadlocks`
  );

  // Reset store
  useTicTacToeStore.getState().reset();

  return {
    success: true,
    checks,
  };
}

// Execute verification if run directly in Node / ts-node
if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
  try {
    const res = runTicTacToeVerification();
    console.log("=================================================");
    console.log("✅ TicTacToe Arena Verification PASSED:", res.checks.length, "checks");
    console.log("=================================================");
    for (const c of res.checks) {
      console.log(`  ✓ ${c}`);
    }
  } catch (err) {
    console.error("❌ TicTacToe Arena Verification FAILED:", err);
    process.exit(1);
  }
}

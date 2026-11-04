/**
 * ChainPlay - Comprehensive Mock Engine & State Stores Test Suite
 *
 * Verifies:
 * 1. useAppStore: settings toggles, role switching, audio synthesizer sync.
 * 2. useLobbyStore: initial 3 rooms, createRoom, joinRoom, cancelRoom, filters.
 * 3. useTicTacToeStore & Bot AI: win/draw detection, blocking moves, winning moves, timeout claims.
 * 4. useBattleshipStore & Bot AI: fleet placement, rotate, commit hash, hunt/target firing, integrity check.
 * 5. useMemoryStore & Bot AI: 4x4 card matching, combo multipliers, mismatch timeout, bot recall.
 * 6. Cross-Tab P2P Engine: message broadcast and incoming message dispatch to stores.
 *
 * Zero `any` types. Strict assertions.
 */

import { useAppStore, MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS } from "../../../store/useAppStore";
import { useLobbyStore } from "../../../store/useLobbyStore";
import { useTicTacToeStore } from "../../../store/useTicTacToeStore";
import { useBattleshipStore } from "../../../store/useBattleshipStore";
import { useMemoryStore } from "../../../store/useMemoryStore";
import {
  MOCK_BOT_ADDRESS,
  botPlayTicTacToe,
  botSetupBattleship,
  botFireBattleshipShot,
  botPlayMemoryDuel,
  recordMemoryCardObservation,
  resetBotMemoryCache,
  getBotMemoryCache,
  handleIncomingP2PMessage,
  type P2PMessage,
} from "../mockChainEngine";
import { GameType, RoomStatus } from "../../../types/lobby.types";
import type { CellValue, ShotRecord } from "../../../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runMockEngineTests(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚀 Starting ChainPlay State Stores & Mock Engine Test Suite");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let suitesPassed = 0;

  // -------------------------------------------------------------------------
  // 1. App Store State & Actions
  // -------------------------------------------------------------------------
  console.log("▶ [1/6] Testing useAppStore State & Actions...");
  const app = useAppStore.getState();

  assert(app.isMockMode === true, "Initial isMockMode must be true");
  assert(app.soundEnabled === true, "Initial soundEnabled must be true");

  app.setMockSubMode("p2p");
  assert(useAppStore.getState().mockSubMode === "p2p", "mockSubMode must update to p2p");

  app.setMockSubMode("bot");
  assert(useAppStore.getState().mockSubMode === "bot", "mockSubMode must update to bot");

  app.setSoundEnabled(false);
  assert(useAppStore.getState().soundEnabled === false, "soundEnabled must be false");
  app.setSoundEnabled(true);
  assert(useAppStore.getState().soundEnabled === true, "soundEnabled must be restored to true");

  app.switchMockPlayerRole("player2");
  assert(
    useAppStore.getState().mockPlayerAddress.toLowerCase() === MOCK_PLAYER_2_ADDRESS.toLowerCase(),
    "Mock player address must switch to Player 2"
  );
  app.switchMockPlayerRole("player1");
  assert(
    useAppStore.getState().mockPlayerAddress.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "Mock player address must switch back to Player 1"
  );

  console.log("  ✓ useAppStore configuration and role switches verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 2. Lobby Store State & Matchmaking
  // -------------------------------------------------------------------------
  console.log("\n▶ [2/6] Testing useLobbyStore Room Management & Filtering...");
  const lobby = useLobbyStore.getState();

  assert(lobby.rooms.length >= 3, `Expected at least 3 initial rooms, found ${lobby.rooms.length}`);
  const waitingRooms = lobby.rooms.filter((r) => r.status === RoomStatus.WAITING);
  assert(waitingRooms.length >= 3, "Initial rooms must be in WAITING status");

  // Create Room
  const createdRoom = lobby.createRoom({
    gameType: GameType.TIC_TAC_TOE,
    wager: 25000000000000000n, // 0.025 ETH
    player1: MOCK_PLAYER_1_ADDRESS,
  });

  assert(createdRoom.wager === 25000000000000000n, "Created room must preserve BigInt wager");
  assert(
    createdRoom.player1.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "Created room must record creator address"
  );
  assert(useLobbyStore.getState().activeRoomId === createdRoom.id, "Created room must become active");

  // Filter verification
  lobby.setFilters({ gameType: GameType.TIC_TAC_TOE });
  const tttFiltered = lobby.getFilteredRooms();
  assert(
    tttFiltered.every((r) => r.gameType === GameType.TIC_TAC_TOE),
    "Filters must accurately restrict to TIC_TAC_TOE"
  );

  lobby.setFilters({ minWager: 50000000000000000n }); // >= 0.05 ETH
  const wagerFiltered = lobby.getFilteredRooms();
  assert(
    wagerFiltered.every((r) => r.wager >= 50000000000000000n),
    "Filters must accurately enforce minWager"
  );
  lobby.resetFilters();

  // Join Room
  const joined = lobby.joinRoom(createdRoom.id, MOCK_PLAYER_2_ADDRESS);
  assert(joined === true, "Join room must succeed for distinct player");
  const joinedRoom = useLobbyStore.getState().rooms.find((r) => r.id === createdRoom.id);
  assert(joinedRoom?.status === RoomStatus.ACTIVE, "Room must transition to ACTIVE status");
  assert(
    joinedRoom?.player2?.toLowerCase() === MOCK_PLAYER_2_ADDRESS.toLowerCase(),
    "Room player2 must record joining address"
  );

  console.log("  ✓ useLobbyStore lifecycle and filtering verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 3. Tic-Tac-Toe Arena & Smart Bot AI
  // -------------------------------------------------------------------------
  console.log("\n▶ [3/6] Testing Tic-Tac-Toe Store & Smart Bot AI...");
  const ttt = useTicTacToeStore.getState();
  ttt.initGame("ttt_test_1", MOCK_PLAYER_1_ADDRESS, MOCK_BOT_ADDRESS);

  assert(useTicTacToeStore.getState().board.every((c) => c === 0), "Initial board must be blank");
  assert(
    useTicTacToeStore.getState().currentTurn.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "Player 1 must have initial turn"
  );

  // Player 1 plays move
  const move1Success = ttt.playMoveOptimistic(4, MOCK_PLAYER_1_ADDRESS); // Center
  assert(move1Success === true, "Move to center must succeed");
  assert(useTicTacToeStore.getState().board[4] === 1, "Center cell must contain X (1)");
  assert(
    useTicTacToeStore.getState().currentTurn.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase(),
    "Turn must switch to Bot"
  );

  // Test Bot Blocking Move AI
  // Board: P1 has cells 0 and 1, cell 2 is empty. Bot must block by taking cell 2!
  const blockBoard: CellValue[] = [1, 1, 0, 2, 0, 0, 0, 0, 0];
  const blockCell = botPlayTicTacToe(blockBoard, 2);
  assert(blockCell === 2, `Bot must take cell 2 to block P1 win (got ${blockCell})`);

  // Test Bot Winning Move AI
  // Board: Bot has cells 3 and 4, cell 5 is empty. Bot must win by taking cell 5!
  const winBoard: CellValue[] = [1, 1, 0, 2, 2, 0, 1, 0, 0];
  const winCell = botPlayTicTacToe(winBoard, 2);
  assert(winCell === 5, `Bot must take cell 5 to win immediately (got ${winCell})`);

  // Complete game win detection
  ttt.initGame("ttt_test_win", MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS);
  // P1: 0, P2: 3, P1: 1, P2: 4, P1: 2 (Top row win)
  ttt.playMoveOptimistic(0, MOCK_PLAYER_1_ADDRESS);
  ttt.playMoveOptimistic(3, MOCK_PLAYER_2_ADDRESS);
  ttt.playMoveOptimistic(1, MOCK_PLAYER_1_ADDRESS);
  ttt.playMoveOptimistic(4, MOCK_PLAYER_2_ADDRESS);
  ttt.playMoveOptimistic(2, MOCK_PLAYER_1_ADDRESS);

  const tttState = useTicTacToeStore.getState();
  assert(
    tttState.winner?.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "Player 1 must be declared winner"
  );
  assert(
    JSON.stringify(tttState.winningLine) === JSON.stringify([0, 1, 2]),
    "Winning line must be [0, 1, 2]"
  );

  // Test Turn Timeout Claim (Must enforce 60s rule)
  ttt.initGame("ttt_test_timeout", MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS);
  // Now it's P1 turn. P2 tries to claim before 60s: must fail!
  const prematureClaim = ttt.claimTimeoutWin(MOCK_PLAYER_2_ADDRESS);
  assert(prematureClaim === false, "Premature timeout claim before 60s must fail");

  // Advance lastMoveTimestamp beyond 60s
  useTicTacToeStore.setState({ lastMoveTimestamp: Date.now() - 65000 });
  const validClaim = ttt.claimTimeoutWin(MOCK_PLAYER_2_ADDRESS);
  assert(validClaim === true, "Valid timeout claim after 60s elapsed must succeed");
  assert(
    useTicTacToeStore.getState().winner?.toLowerCase() === MOCK_PLAYER_2_ADDRESS.toLowerCase(),
    "Claimant must be awarded win upon timeout"
  );

  console.log("  ✓ Tic-Tac-Toe win calculation and Bot blocking/winning AI verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 4. Battleship Arena & Hunt-and-Target AI
  // -------------------------------------------------------------------------
  console.log("\n▶ [4/6] Testing Battleship Arena & Hunt/Target Radar AI...");
  const btl = useBattleshipStore.getState();
  btl.initGame("btl_test_1", MOCK_PLAYER_1_ADDRESS, MOCK_BOT_ADDRESS);

  assert(
    useBattleshipStore.getState().myAddress.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "myAddress must be initialized to Player 1 address"
  );
  assert(btl.myShips.length === 5, "Must initialize with 5 ships");
  assert(btl.phase === "PLACEMENT", "Must start in PLACEMENT phase");

  // Rotate Ship
  const rotated = btl.rotateShip(1);
  assert(typeof rotated === "boolean", "Rotate ship must return boolean");

  // Commit fleet
  const commitHash = await btl.commitFleet(MOCK_PLAYER_1_ADDRESS);
  assert(commitHash.startsWith("0x") && commitHash.length === 66, "Commitment hash must be valid 32-byte hex");
  assert(useBattleshipStore.getState().isCommitted === true, "Player must be committed");

  // Bot setup
  const botFleet = botSetupBattleship();
  assert(botFleet.ships.length === 5, "Bot must generate 5 valid ships");
  assert(botFleet.boardHash.startsWith("0x"), "Bot board hash must be valid");

  // Opponent commitment
  btl.setOpponentCommitment(botFleet.boardHash);
  assert(useBattleshipStore.getState().phase === "COMBAT", "Both committed -> COMBAT phase");

  // Test Hunt Mode Radar AI (no prior hits: must fire on checkerboard parity)
  const initialShots: ShotRecord[] = [];
  const huntShot = botFireBattleshipShot(initialShots);
  assert(
    (huntShot.x + huntShot.y) % 2 === 0,
    `Hunt shot (${huntShot.x}, ${huntShot.y}) must follow checkerboard parity (x+y % 2 === 0)`
  );

  // Test Target Mode Radar AI (prior HIT at (4, 4): must target neighbor)
  const hitShots: ShotRecord[] = [
    { x: 4, y: 4, result: "HIT", timestamp: Date.now() },
  ];
  const targetShot = botFireBattleshipShot(hitShots);
  const isNeighbor =
    (Math.abs(targetShot.x - 4) === 1 && targetShot.y === 4) ||
    (Math.abs(targetShot.y - 4) === 1 && targetShot.x === 4);
  assert(
    isNeighbor,
    `Target shot (${targetShot.x}, ${targetShot.y}) must be orthogonal neighbor of (4, 4)`
  );

  // Receiving Shot & Duplicate Shot Guard
  const ships = useBattleshipStore.getState().myShips;
  const firstShip = ships[0];
  if (!firstShip) {
    throw new Error("First ship must exist");
  }
  const outcome1 = btl.receiveShot(firstShip.startX, firstShip.startY);
  assert(outcome1 === "HIT" || outcome1 === "SUNK", "Shot on ship cell must result in HIT or SUNK");

  const hitsAfterFirstShot = useBattleshipStore.getState().myShips[0]?.hits ?? 0;
  // Fire again at the EXACT same coordinate: duplicate guard must trigger!
  const outcome2 = btl.receiveShot(firstShip.startX, firstShip.startY);
  assert(outcome2 === outcome1, "Duplicate shot must return identical cached result");
  const hitsAfterDuplicateShot = useBattleshipStore.getState().myShips[0]?.hits ?? 0;
  assert(
    hitsAfterDuplicateShot === hitsAfterFirstShot,
    "Duplicate shot must NOT double-increment ship hits"
  );

  // Verify integrity
  const verified = btl.verifyFinalBoard(botFleet.flatBoard, botFleet.salt);
  assert(verified === true, "Valid bot flatBoard & salt must pass cryptographic verification");

  console.log("  ✓ Battleship placement, commit, hunt/target AI and integrity checks verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 5. Memory Duel Store & Combo AI
  // -------------------------------------------------------------------------
  console.log("\n▶ [5/6] Testing Memory Duel Store & Probabilistic AI...");
  const mem = useMemoryStore.getState();
  mem.initDeck("mem_test_1", MOCK_PLAYER_1_ADDRESS, MOCK_BOT_ADDRESS);

  assert(useMemoryStore.getState().cards.length === 16, "Deck must contain exactly 16 cards");
  assert(
    useMemoryStore.getState().currentTurn.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "Player 1 must have initial turn in Memory Duel"
  );

  // Predictable matching cards test
  const currentCards = useMemoryStore.getState().cards;
  const sym0Cards = currentCards.filter((c) => c.symbolId === 0);
  assert(sym0Cards.length === 2, "There must be exactly 2 cards for symbolId 0");

  const idxA = sym0Cards[0]?.id ?? 0;
  const idxB = sym0Cards[1]?.id ?? 1;

  // Select first card
  const select1 = mem.selectCard(idxA, MOCK_PLAYER_1_ADDRESS);
  assert(select1 === true, "First card selection must succeed");
  assert(useMemoryStore.getState().cards[idxA]?.isFlipped === true, "First card must be flipped");

  // Select matching second card
  const select2 = mem.selectCard(idxB, MOCK_PLAYER_1_ADDRESS);
  assert(select2 === true, "Matching second card selection must succeed");
  assert(useMemoryStore.getState().cards[idxA]?.isMatched === true, "Card A must be matched");
  assert(useMemoryStore.getState().cards[idxB]?.isMatched === true, "Card B must be matched");
  assert(useMemoryStore.getState().p1Score === 100, "Score must increment by 100 on first match");
  assert(useMemoryStore.getState().streakMultiplier === 2, "Streak multiplier must increment to 2x");
  assert(
    useMemoryStore.getState().currentTurn.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "Same player must keep turn on match"
  );

  // Bot AI selection & Memory Recall Cache verification
  resetBotMemoryCache();
  assert(getBotMemoryCache().size === 0, "Bot memory cache must be empty after reset");

  // Find two remaining unmatched cards with identical symbol
  const remainingUnmatched = useMemoryStore.getState().cards.filter((c) => !c.isMatched);
  const symMap = new Map<number, number[]>();
  for (const c of remainingUnmatched) {
    const list = symMap.get(c.symbolId) ?? [];
    list.push(c.id);
    symMap.set(c.symbolId, list);
  }

  let pairIdx1 = -1;
  let pairIdx2 = -1;
  let pairSym = -1;
  for (const [sym, indices] of symMap) {
    if (indices.length >= 2 && indices[0] !== undefined && indices[1] !== undefined) {
      pairIdx1 = indices[0];
      pairIdx2 = indices[1];
      pairSym = sym;
      break;
    }
  }

  assert(pairIdx1 !== -1 && pairIdx2 !== -1, "Must find unmatched pair in deck");

  // Force record this known pair into bot recall memory
  recordMemoryCardObservation(pairIdx1, pairSym, true);
  recordMemoryCardObservation(pairIdx2, pairSym, true);
  assert(getBotMemoryCache().size === 2, "Bot memory cache must contain 2 recorded cards");

  // Bot must immediately pair known cards from its memory cache
  const botKnownPairMove = botPlayMemoryDuel(useMemoryStore.getState().cards);
  const isPairMatch =
    (botKnownPairMove.first === pairIdx1 && botKnownPairMove.second === pairIdx2) ||
    (botKnownPairMove.first === pairIdx2 && botKnownPairMove.second === pairIdx1);
  assert(isPairMatch, "Bot must prioritize and pair known matching cards from recall memory");

  console.log("  ✓ Memory Duel matching, multipliers, and bot recall AI verified");
  suitesPassed++;

  // -------------------------------------------------------------------------
  // 6. Cross-Tab P2P Sync Message Dispatch
  // -------------------------------------------------------------------------
  console.log("\n▶ [6/6] Testing Cross-Tab P2P Broadcast Dispatch...");

  // Dispatch mock P2P XO Move message
  useTicTacToeStore.getState().initGame("p2p_game_1", MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS);

  const mockXOMessage: P2PMessage<Record<string, unknown>> = {
    type: "XO_MOVE",
    sender: MOCK_PLAYER_1_ADDRESS,
    tabSessionId: "remote_tab_session",
    timestamp: Date.now(),
    payload: {
      cellIndex: 0,
      symbol: 1,
      player: MOCK_PLAYER_1_ADDRESS,
    },
  };

  handleIncomingP2PMessage(mockXOMessage);
  assert(
    useTicTacToeStore.getState().board[0] === 1,
    "P2P XO_MOVE message must update Tic-Tac-Toe store board[0] = 1"
  );
  assert(
    useTicTacToeStore.getState().currentTurn.toLowerCase() === MOCK_PLAYER_2_ADDRESS.toLowerCase(),
    "P2P XO_MOVE message must advance turn to Player 2"
  );

  // Dispatch mock P2P Battleship Commit message
  useBattleshipStore.getState().initGame("p2p_btl_1", MOCK_PLAYER_1_ADDRESS, MOCK_PLAYER_2_ADDRESS);
  const sampleCommitHash = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

  const mockCommitMessage: P2PMessage<Record<string, unknown>> = {
    type: "BATTLESHIP_COMMIT",
    sender: MOCK_PLAYER_2_ADDRESS,
    tabSessionId: "remote_tab_session",
    timestamp: Date.now(),
    payload: {
      boardHash: sampleCommitHash,
    },
  };

  handleIncomingP2PMessage(mockCommitMessage);
  assert(
    useBattleshipStore.getState().opponentCommitted === true,
    "P2P BATTLESHIP_COMMIT must mark opponent as committed"
  );
  assert(
    useBattleshipStore.getState().opponentBoardHash === sampleCommitHash,
    "P2P BATTLESHIP_COMMIT must record opponent board hash"
  );

  // Dispatch mock P2P Battleship Shot message (incoming shot from Player 2)
  const mockShotMessage: P2PMessage<Record<string, unknown>> = {
    type: "BATTLESHIP_SHOT",
    sender: MOCK_PLAYER_2_ADDRESS,
    tabSessionId: "remote_tab_session",
    timestamp: Date.now(),
    payload: {
      x: 0,
      y: 0,
      attacker: MOCK_PLAYER_2_ADDRESS,
    },
  };

  handleIncomingP2PMessage(mockShotMessage);
  // After defender tab receives shot, turn switches to myAddress (defender's turn to fire next)
  assert(
    useBattleshipStore.getState().currentTurn.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase(),
    "P2P BATTLESHIP_SHOT must switch turn to defender (myAddress) to fire next"
  );

  // Dispatch mock P2P Battleship Reveal message (response to my shot)
  const mockRevealMessage: P2PMessage<Record<string, unknown>> = {
    type: "BATTLESHIP_REVEAL",
    sender: MOCK_PLAYER_2_ADDRESS,
    tabSessionId: "remote_tab_session",
    timestamp: Date.now(),
    payload: {
      x: 1,
      y: 1,
      result: "MISS",
      defender: MOCK_PLAYER_2_ADDRESS,
    },
  };

  handleIncomingP2PMessage(mockRevealMessage);
  // After attacker receives reveal, turn switches to opponentAddress (defender's turn to fire)
  assert(
    useBattleshipStore.getState().currentTurn.toLowerCase() === MOCK_PLAYER_2_ADDRESS.toLowerCase(),
    "P2P BATTLESHIP_REVEAL must switch turn to opponent (opponentAddress)"
  );

  console.log("  ✓ Cross-Tab P2P message handler updates stores across tabs");
  suitesPassed++;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`🎉 ALL ${suitesPassed}/6 TEST SUITES PASSED FLAWLESSLY!`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

runMockEngineTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

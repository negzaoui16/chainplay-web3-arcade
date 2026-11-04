/**
 * ChainPlay - Cryptographic Engine & Utilities Verification Test Suite
 *
 * Verifies:
 * 1. Web Crypto secure salt generation
 * 2. Automated random fleet generation consistency
 * 3. Fleet placement validation (bounds, sizes, IDs, collision overlap rejection)
 * 4. Viem Keccak256 board hash generation matching Solidity encodePacked format
 * 5. Single-cell reveal proof generation and boundary assertions
 * 6. Secret vault recovery and export backup
 * 7. Address, Ether, countdown, and timestamp formatters
 */

import {
  generateSalt,
  generateRandomFleet,
  validateFleetPlacement,
  generateBoardHash,
  generateCellProof,
  exportSecretKeyBackup,
  saveSecretVault,
  loadSecretVault,
  clearSecretVault,
  getShipCoordinates,
} from "../battleshipCrypto";

import {
  formatAddress,
  formatEther,
  parseEther,
  formatCountdown,
  formatTimestamp,
  formatWager,
  formatPercent,
} from "../../utils/formatters";

import type { ShipPlacement, CommitData } from "../../../types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

function runVerification(): void {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🚀 Starting ChainPlay Battleship Crypto & Formatters Test Suite");
  console.log("═══════════════════════════════════════════════════════════════\n");

  let passed = 0;

  // -------------------------------------------------------------------------
  // 1. Web Crypto Salt Generation
  // -------------------------------------------------------------------------
  console.log("▶ [1/7] Testing Web Crypto Salt Generation...");
  const salt1 = generateSalt();
  const salt2 = generateSalt();

  assert(salt1.startsWith("0x"), "Salt must start with 0x");
  assert(salt1.length === 66, `Salt must be 66 characters long (got ${salt1.length})`);
  assert(salt2.startsWith("0x"), "Salt 2 must start with 0x");
  assert(salt1 !== salt2, "Two generated salts must be cryptographically distinct");
  console.log(`  ✓ Salt 1: ${salt1}`);
  console.log(`  ✓ Salt 2: ${salt2}`);
  passed++;

  // -------------------------------------------------------------------------
  // 2. Random Fleet Generation
  // -------------------------------------------------------------------------
  console.log("\n▶ [2/7] Testing Random Fleet Generation (10 iterations)...");
  for (let i = 0; i < 10; i++) {
    const fleet = generateRandomFleet();
    assert(fleet.length === 5, "Fleet must contain exactly 5 ships");

    const validation = validateFleetPlacement(fleet);
    assert(validation.valid === true, `Random fleet iteration ${i} must be valid: ${validation.error}`);
    assert(validation.flatBoard.length === 100, "Flat board must contain 100 cells");

    const occupiedCells = validation.flatBoard.filter((c) => c !== 0).length;
    assert(occupiedCells === 17, `Occupied cells must be exactly 17 (got ${occupiedCells})`);
  }
  console.log("  ✓ Successfully generated 10/10 valid non-overlapping random fleets.");
  passed++;

  // -------------------------------------------------------------------------
  // 3. Fleet Placement Validation & Collision Detection
  // -------------------------------------------------------------------------
  console.log("\n▶ [3/7] Testing Fleet Placement Validation Rules & Edge Cases...");

  // Coordinate computation test
  const testCoords = getShipCoordinates({ startX: 2, startY: 3, size: 3, orientation: "HORIZONTAL" });
  assert(testCoords.length === 3, "getShipCoordinates should return exact number of cells matching size");
  assert(testCoords[0]?.x === 2 && testCoords[0]?.y === 3, "First coordinate should match start position");
  assert(testCoords[2]?.x === 4 && testCoords[2]?.y === 3, "Last coordinate should match horizontal end position");

  // Valid fleet sample
  const validFleet: ShipPlacement[] = [
    { shipId: 1, name: "Carrier", size: 5, startX: 0, startY: 0, orientation: "HORIZONTAL", hits: 0, isSunk: false },
    { shipId: 2, name: "Battleship", size: 4, startX: 0, startY: 1, orientation: "HORIZONTAL", hits: 0, isSunk: false },
    { shipId: 3, name: "Cruiser", size: 3, startX: 0, startY: 2, orientation: "HORIZONTAL", hits: 0, isSunk: false },
    { shipId: 4, name: "Submarine", size: 3, startX: 0, startY: 3, orientation: "HORIZONTAL", hits: 0, isSunk: false },
    { shipId: 5, name: "Destroyer", size: 2, startX: 0, startY: 4, orientation: "HORIZONTAL", hits: 0, isSunk: false },
  ];
  const validRes = validateFleetPlacement(validFleet);
  assert(validRes.valid === true, "Valid parallel fleet should pass validation");
  console.log("  ✓ Valid parallel fleet passes validation");

  // Invalid count: only 4 ships
  const fourShips = validFleet.slice(0, 4);
  const fourRes = validateFleetPlacement(fourShips);
  assert(fourRes.valid === false, "4 ships should fail validation");
  console.log(`  ✓ 4 ships rejected: "${fourRes.error}"`);

  // Invalid ship: duplicate ship IDs
  const duplicateIdFleet: ShipPlacement[] = [
    { ...validFleet[0]!, shipId: 1 },
    { ...validFleet[1]!, shipId: 1 },
    validFleet[2]!,
    validFleet[3]!,
    validFleet[4]!,
  ];
  const dupRes = validateFleetPlacement(duplicateIdFleet);
  assert(dupRes.valid === false, "Duplicate ship ID should fail validation");
  console.log(`  ✓ Duplicate ship ID rejected: "${dupRes.error}"`);

  // Out of bounds horizontal
  const oobHorizontal: ShipPlacement[] = [
    { shipId: 1, name: "Carrier", size: 5, startX: 7, startY: 0, orientation: "HORIZONTAL", hits: 0, isSunk: false },
    validFleet[1]!,
    validFleet[2]!,
    validFleet[3]!,
    validFleet[4]!,
  ];
  const oobHRes = validateFleetPlacement(oobHorizontal);
  assert(oobHRes.valid === false, "Out of bounds horizontal should fail");
  console.log(`  ✓ Out-of-bounds horizontal rejected: "${oobHRes.error}"`);

  // Out of bounds vertical
  const oobVertical: ShipPlacement[] = [
    validFleet[0]!,
    { shipId: 2, name: "Battleship", size: 4, startX: 0, startY: 8, orientation: "VERTICAL", hits: 0, isSunk: false },
    validFleet[2]!,
    validFleet[3]!,
    validFleet[4]!,
  ];
  const oobVRes = validateFleetPlacement(oobVertical);
  assert(oobVRes.valid === false, "Out of bounds vertical should fail");
  console.log(`  ✓ Out-of-bounds vertical rejected: "${oobVRes.error}"`);

  // Overlap collision
  const collisionFleet: ShipPlacement[] = [
    { shipId: 1, name: "Carrier", size: 5, startX: 0, startY: 2, orientation: "HORIZONTAL", hits: 0, isSunk: false },
    { shipId: 2, name: "Battleship", size: 4, startX: 2, startY: 0, orientation: "VERTICAL", hits: 0, isSunk: false },
    validFleet[2]!,
    validFleet[3]!,
    validFleet[4]!,
  ];
  const colRes = validateFleetPlacement(collisionFleet);
  assert(colRes.valid === false, "Colliding ships should fail validation");
  console.log(`  ✓ Collision detected & rejected: "${colRes.error}"`);

  // Incorrect ship size
  const wrongSizeFleet: ShipPlacement[] = [
    { ...validFleet[0]!, size: 4 }, // Carrier should be 5
    validFleet[1]!,
    validFleet[2]!,
    validFleet[3]!,
    validFleet[4]!,
  ];
  const sizeRes = validateFleetPlacement(wrongSizeFleet);
  assert(sizeRes.valid === false, "Wrong ship size should fail");
  console.log(`  ✓ Invalid ship size rejected: "${sizeRes.error}"`);
  passed++;

  // -------------------------------------------------------------------------
  // 4. Viem Keccak256 Board Hash Generation
  // -------------------------------------------------------------------------
  console.log("\n▶ [4/7] Testing Board Hash Generation & Avalanche Effect...");
  const flatBoard1 = validRes.flatBoard;
  const boardHash1 = generateBoardHash(flatBoard1, salt1);
  assert(boardHash1.startsWith("0x"), "Board hash must start with 0x");
  assert(boardHash1.length === 66, `Board hash must be 66 characters (got ${boardHash1.length})`);
  console.log(`  ✓ Board hash 1: ${boardHash1}`);

  // Determinism test
  const boardHash1Repeat = generateBoardHash(flatBoard1, salt1);
  assert(boardHash1 === boardHash1Repeat, "Board hash must be completely deterministic for identical input");
  console.log("  ✓ Hash determinism confirmed");

  // Salt sensitivity test
  const boardHashSalt2 = generateBoardHash(flatBoard1, salt2);
  assert(boardHash1 !== boardHashSalt2, "Different salt must alter the board hash completely");
  console.log(`  ✓ Salt alteration modifies hash: ${boardHashSalt2}`);

  // Avalanche effect: modify one cell on the board
  const flatBoardAltered = [...flatBoard1];
  flatBoardAltered[99] = (flatBoardAltered[99] === 0 ? 1 : 0);
  const boardHashAltered = generateBoardHash(flatBoardAltered, salt1);
  assert(boardHash1 !== boardHashAltered, "Modifying single cell must alter the board hash completely");
  console.log(`  ✓ Single-cell alteration alters hash: ${boardHashAltered}`);
  passed++;

  // -------------------------------------------------------------------------
  // 5. Viem Keccak256 Cell Proof Generation
  // -------------------------------------------------------------------------
  console.log("\n▶ [5/7] Testing Cell Reveal Proofs & Bounds Checks...");
  const gameId = 42n;
  const proofHit = generateCellProof(gameId, 3, 4, true, salt1);
  const proofMiss = generateCellProof(gameId, 3, 4, false, salt1);

  assert(proofHit.startsWith("0x") && proofHit.length === 66, "Hit proof must be 66-char 0x hex");
  assert(proofMiss.startsWith("0x") && proofMiss.length === 66, "Miss proof must be 66-char 0x hex");
  assert(proofHit !== proofMiss, "Hit proof and Miss proof must differ");
  console.log(`  ✓ Proof (Hit=true):  ${proofHit}`);
  console.log(`  ✓ Proof (Hit=false): ${proofMiss}`);

  // Bounds check
  let oobCaught = false;
  try {
    generateCellProof(gameId, 10, 5, true, salt1);
  } catch (err) {
    oobCaught = true;
    console.log(`  ✓ Cell proof out-of-bounds correctly caught: "${(err as Error).message}"`);
  }
  assert(oobCaught, "Must reject out-of-bounds coordinate x >= 10");
  passed++;

  // -------------------------------------------------------------------------
  // 6. Local Vault Storage & Key Backup Export
  // -------------------------------------------------------------------------
  console.log("\n▶ [6/7] Testing Secret Vault & Backup Export...");
  const commitData: CommitData = {
    flatBoard: flatBoard1,
    ships: validFleet,
    salt: salt1,
    boardHash: boardHash1,
    timestamp: Date.now(),
  };

  const backupJson = exportSecretKeyBackup(commitData);
  assert(backupJson.includes(salt1), "Backup JSON must contain salt");
  assert(backupJson.includes(boardHash1), "Backup JSON must contain boardHash");
  const parsedBackup = JSON.parse(backupJson) as CommitData;
  assert(parsedBackup.salt === salt1, "Parsed backup salt must match original");
  console.log("  ✓ Secret key backup successfully exported and verified");

  // In Node environment, mock localStorage if window is absent
  const mockStorage: Record<string, string> = {};
  if (typeof window === "undefined") {
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: (k: string) => mockStorage[k] ?? null,
        setItem: (k: string, v: string) => { mockStorage[k] = v; },
        removeItem: (k: string) => { delete mockStorage[k]; },
      },
    };
  }

  saveSecretVault("game_123", "0xTestPlayerAddress", commitData);
  const loaded = loadSecretVault("game_123", "0xTestPlayerAddress");
  assert(loaded !== null, "Loaded secret vault must not be null");
  assert(loaded?.boardHash === boardHash1, "Loaded secret vault hash must match original");
  clearSecretVault("game_123", "0xTestPlayerAddress");
  const cleared = loadSecretVault("game_123", "0xTestPlayerAddress");
  assert(cleared === null, "Secret vault must be null after clearing");
  console.log("  ✓ Local secret vault roundtrip (save/load/clear) verified");
  passed++;

  // -------------------------------------------------------------------------
  // 7. Formatters & Unit Converters
  // -------------------------------------------------------------------------
  console.log("\n▶ [7/7] Testing Formatters & Unit Converters...");
  assert(formatAddress("0x1234567890abcdef1234567890abcdef12345678") === "0x1234...5678", "Address formatting failed");
  assert(formatAddress(null) === "", "Null address should format to empty string");

  assert(formatEther(50000000000000000n) === "0.05", "formatEther 0.05 ETH failed");
  assert(formatEther(1000000000000000000n) === "1", "formatEther 1 ETH failed");
  assert(formatEther(0n) === "0", "formatEther 0n failed");
  assert(formatEther(null) === "0", "formatEther null failed");

  assert(parseEther("0.05") === 50000000000000000n, "parseEther 0.05 failed");
  assert(parseEther("") === 0n, "parseEther empty string failed");

  assert(formatCountdown(60) === "01:00", "formatCountdown 60s failed");
  assert(formatCountdown(9) === "00:09", "formatCountdown 9s failed");
  assert(formatCountdown(125) === "02:05", "formatCountdown 125s failed");
  assert(formatCountdown(-5) === "00:00", "formatCountdown negative failed");

  assert(formatWager(50000000000000000n) === "0.05 ETH", "formatWager failed");
  assert(formatPercent(250) === "2.5%", "formatPercent failed");

  const formattedTs = formatTimestamp(1730725200000);
  assert(typeof formattedTs === "string" && formattedTs.length > 0, "formatTimestamp failed");
  console.log(`  ✓ Address: ${formatAddress("0x71C...B289")}`);
  console.log(`  ✓ Countdown 60s: ${formatCountdown(60)}`);
  console.log(`  ✓ Ether 0.05: ${formatEther(50000000000000000n)}`);
  console.log(`  ✓ Timestamp: ${formattedTs}`);
  passed++;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(`🎉 ALL ${passed}/7 TEST SUITES PASSED FLAWLESSLY!`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

// Execute when invoked
runVerification();

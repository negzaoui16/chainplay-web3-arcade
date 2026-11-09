"use client";

/**
 * ChainPlay - Battleship Arena (Game 2)
 *
 * Full-featured Cryptographic Commit-Reveal Naval Arena:
 * - Phase state machine: PLACEMENT -> WAITING_COMMIT -> COMBAT -> VERIFYING -> FINISHED
 * - Dual split-screen combat: Friendly Defensive Grid vs CRT Sonar Offensive Radar
 * - Fleet health monitoring for both commanders (Carrier, Battleship, Cruiser, Submarine, Destroyer)
 * - Interactive PlayerHud with 60s turn countdown clock & timeout forfeit CTA
 * - Live Cryptographic Proof Panel with secret salt inspection and backup download
 * - End-game cryptographic integrity verification (verifyFinalBoard)
 * - GameOverModal with net payout details and escrow withdrawal
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Shield,
  Crosshair,
  Radio,
  Lock,
  Ship,
} from "lucide-react";

import { useBattleshipStore } from "@/store/useBattleshipStore";
import { useBattleshipContract } from "@/hooks/useBattleshipContract";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import { useAppStore, MOCK_BOT_ADDRESS } from "@/store/useAppStore";
import {
  getBotBattleshipSecret,
  triggerBotTurn,
} from "@/lib/mock/mockChainEngine";
import { FLEET_LIST, TURN_TIMEOUT_SECONDS } from "@/config/constants";
import { GameType } from "@/types/lobby.types";
import type {
  ShipId,
  ShipOrientation,
  Coordinate,
} from "@/types/battleship.types";
import { validateFleetPlacement } from "@/lib/crypto/battleshipCrypto";
import {
  isSoundEnabled,
  setSoundEnabled,
} from "@/lib/utils/soundEffects";
import { formatAddress } from "@/lib/utils/formatters";

import { PlayerHud, type TurnPlayer } from "@/components/shared/PlayerHud";
import {
  GameOverModal,
  type GameOutcome,
} from "@/components/shared/GameOverModal";
import {
  TransactionToast,
  type TxStatus,
} from "@/components/shared/TransactionToast";

import { DefensiveGrid } from "./DefensiveGrid";
import { OffensiveRadarGrid } from "./OffensiveRadarGrid";
import { FleetPlacementDock } from "./FleetPlacementDock";
import { CryptoProofPanel } from "./CryptoProofPanel";

export interface BattleshipArenaProps {
  /**
   * Unique identifier of the game session
   */
  readonly gameId?: string;

  /**
   * Staked wager per player in wei (defaults to 0.01 ETH)
   */
  readonly initialWager?: bigint;

  /**
   * Host address (Player 1)
   */
  readonly initialPlayer1?: string;

  /**
   * Challenger or bot address (Player 2)
   */
  readonly initialPlayer2?: string | null;

  /**
   * Navigation callback to return to lobby
   */
  readonly onBackToLobby?: () => void;

  /**
   * Callback fired upon rematch
   */
  readonly onRematch?: () => void;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

interface ToastMessage {
  status: TxStatus;
  title: string;
  description?: string;
  errorMessage?: string;
  txHash?: `0x${string}` | string | null;
}

const DEFAULT_WAGER = 60000000000000000000n; // 60 CPT

export function BattleshipArena({
  gameId = "battleship_demo_1",
  initialWager = DEFAULT_WAGER,
  initialPlayer1,
  initialPlayer2,
  onBackToLobby,
  onRematch,
  className = "",
}: BattleshipArenaProps): React.JSX.Element {
  const router = useRouter();
  const { effectiveAddress } = useChainPlayMode();
  const { isMockMode, mockSubMode } = useAppStore();

  // Battleship State Store
  const store = useBattleshipStore();

  // Battleship Contract Hook
  const {
    commitBoard,
    fireShot,
    verifyFinalBoard: contractVerifyFinalBoard,
    claimTimeoutWin,
    isPending: isContractPending,
  } = useBattleshipContract(gameId);

  // Local Component State
  const [selectedShipId, setSelectedShipId] = useState<ShipId | null>(1);
  const [placementOrientation, setPlacementOrientation] =
    useState<ShipOrientation>("HORIZONTAL");
  const [timeRemaining, setTimeRemaining] = useState<number>(TURN_TIMEOUT_SECONDS);
  const [isFiringTorpedo, setIsFiringTorpedo] = useState<boolean>(false);
  const [isAuditingProof, setIsAuditingProof] = useState<boolean>(false);
  const [isClaimingTimeout, setIsClaimingTimeout] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Determine Opponent Address
  const player1Address = useMemo(() => {
    return (initialPlayer1 || effectiveAddress).toLowerCase();
  }, [initialPlayer1, effectiveAddress]);

  const player2Address = useMemo(() => {
    if (initialPlayer2) return initialPlayer2.toLowerCase();
    if (mockSubMode === "bot") return MOCK_BOT_ADDRESS.toLowerCase();
    return "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
  }, [initialPlayer2, mockSubMode]);

  // Synchronize audio setting on mount
  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  // Initialize or reset game on mount or when gameId changes
  useEffect(() => {
    store.initGame(gameId, player1Address, player2Address);
    // If in bot mode, trigger bot commitment setup
    if (mockSubMode === "bot") {
      void triggerBotTurn(GameType.BATTLESHIP, gameId);
    }
  }, [gameId, player1Address, player2Address, mockSubMode]);

  // Turn Countdown Timer (Active during COMBAT phase)
  useEffect(() => {
    if (store.phase !== "COMBAT" || store.winner !== null) {
      return;
    }

    setTimeRemaining(TURN_TIMEOUT_SECONDS);

    const intervalId = window.setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [store.phase, store.currentTurn, store.winner]);

  // Check live fleet placement validation
  const fleetValidation = useMemo(() => {
    return validateFleetPlacement(store.myShips);
  }, [store.myShips]);

  // Determine active turn player ("player1" vs "player2")
  const activeTurnPlayer: TurnPlayer = useMemo(() => {
    return store.currentTurn.toLowerCase() === player1Address.toLowerCase()
      ? "player1"
      : "player2";
  }, [store.currentTurn, player1Address]);

  const isMyTurn = useMemo(() => {
    return (
      store.phase === "COMBAT" &&
      store.currentTurn.toLowerCase() === effectiveAddress.toLowerCase()
    );
  }, [store.phase, store.currentTurn, effectiveAddress]);

  // --------------------------------------------------------------------------
  // Placement Actions
  // --------------------------------------------------------------------------

  const handlePlaceShip = useCallback(
    (shipId: ShipId, x: number, y: number, orientation: ShipOrientation) => {
      const placed = store.placeShip(shipId, x, y, orientation);
      if (placed) {
        // Automatically select the next unassigned ship if any
        const nextUnplaced = FLEET_LIST.find((def) => {
          if (def.id === shipId) return false;
          const s = store.myShips.find((p) => p.shipId === def.id);
          return !s || s.startX < 0 || s.startY < 0;
        });

        if (nextUnplaced) {
          setSelectedShipId(nextUnplaced.id as ShipId);
        }
      }
    },
    [store]
  );

  const handleToggleOrientation = useCallback(() => {
    setPlacementOrientation((prev) =>
      prev === "HORIZONTAL" ? "VERTICAL" : "HORIZONTAL"
    );
  }, []);

  const handleLockAndCommit = useCallback(async () => {
    if (!fleetValidation.valid) {
      setToast({
        status: "error",
        title: "Fleet Incomplete",
        description:
          fleetValidation.error || "Please position all 5 warships on the grid.",
      });
      return;
    }

    setToast({
      status: "pending",
      title: "Locking Fleet",
      description: "Generating 256-bit CSPRNG salt and Keccak256 commitment...",
    });

    try {
      // 1. Commit locally to state vault
      const boardHash = await store.commitFleet(effectiveAddress);

      // 2. Commit on-chain or mock broadcast
      await commitBoard(gameId, boardHash);

      setToast({
        status: "confirmed",
        title: "Fleet Cryptographically Locked",
        description: `Board commitment hash: ${formatAddress(boardHash)}`,
      });
    } catch (err) {
      setToast({
        status: "error",
        title: "Commit Failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }, [fleetValidation, store, effectiveAddress, commitBoard, gameId]);

  // --------------------------------------------------------------------------
  // Combat Actions
  // --------------------------------------------------------------------------

  const handleLaunchTorpedo = useCallback(
    async (coord: Coordinate) => {
      if (!isMyTurn || isFiringTorpedo) return;

      setIsFiringTorpedo(true);
      setToast({
        status: "pending",
        title: "Launching Torpedo",
        description: `Targeting enemy coordinates [${String.fromCharCode(
          65 + coord.x
        )}-${coord.y + 1}]...`,
      });

      try {
        await fireShot(gameId, coord.x, coord.y);
        setToast({
          status: "confirmed",
          title: "Torpedo Impact Confirmed",
          description: `Target [${String.fromCharCode(65 + coord.x)}-${
            coord.y + 1
          }] resolved.`,
        });
      } catch (err) {
        setToast({
          status: "error",
          title: "Torpedo Launch Failed",
          errorMessage: err instanceof Error ? err.message : String(err),
        });
      } finally {
        setIsFiringTorpedo(false);
      }
    },
    [isMyTurn, isFiringTorpedo, fireShot, gameId]
  );

  // --------------------------------------------------------------------------
  // Cryptographic Audit & End-Game Verification
  // --------------------------------------------------------------------------

  const handleRunIntegrityAudit = useCallback(async () => {
    setIsAuditingProof(true);
    setToast({
      status: "pending",
      title: "Auditing Board Proof",
      description: "Cryptographically verifying revealed cells on-chain...",
    });

    try {
      let targetFlatBoard = store.myFlatBoard;
      let targetSalt = store.mySalt;

      // Against smart bot, audit bot's secret board
      if (mockSubMode === "bot") {
        const botSecret = getBotBattleshipSecret();
        if (botSecret) {
          targetFlatBoard = botSecret.flatBoard;
          targetSalt = botSecret.salt;
        }
      }

      if (targetSalt) {
        const result = await contractVerifyFinalBoard(
          gameId,
          targetFlatBoard,
          targetSalt
        );

        if (result.valid || result.success) {
          useBattleshipStore.setState({ isVerified: true });
          setToast({
            status: "confirmed",
            title: "Board Integrity Verified 100%",
            description: "Zero coordinate manipulation. Keccak256 hash strictly matches.",
          });
        }
      }
    } catch (err) {
      setToast({
        status: "error",
        title: "Audit Mismatch Detected",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsAuditingProof(false);
    }
  }, [
    store.myFlatBoard,
    store.mySalt,
    isMockMode,
    mockSubMode,
    contractVerifyFinalBoard,
    gameId,
  ]);

  // Timeout Forfeit Claim
  const handleClaimTimeout = useCallback(async () => {
    if (isClaimingTimeout) return;
    setIsClaimingTimeout(true);
    setToast({
      status: "pending",
      title: "Claiming Timeout Forfeit",
      description: "Opponent turn clock expired. Awarding match victory...",
    });

    try {
      await claimTimeoutWin(gameId);
      setToast({
        status: "confirmed",
        title: "Timeout Forfeit Claimed",
        description: "Match concluded. You have won by opponent timeout.",
      });
    } catch (err) {
      setToast({
        status: "error",
        title: "Claim Failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsClaimingTimeout(false);
    }
  }, [isClaimingTimeout, claimTimeoutWin, gameId]);

  // --------------------------------------------------------------------------
  // Modal & Navigation Handlers
  // --------------------------------------------------------------------------

  const handlePlayAgain = useCallback(() => {
    store.reset();
    const nextGameId = `btl_${Date.now()}`;
    store.initGame(nextGameId, player1Address, player2Address);
    if (onRematch) {
      onRematch();
    }
  }, [store, player1Address, player2Address, onRematch]);

  const handleExitToLobby = useCallback(() => {
    if (onBackToLobby) {
      onBackToLobby();
    } else {
      router.push("/");
    }
  }, [onBackToLobby, router]);

  // Compute Game Outcome for GameOverModal
  const gameOutcome: GameOutcome = useMemo(() => {
    if (!store.winner) return "draw";
    return store.winner.toLowerCase() === effectiveAddress.toLowerCase()
      ? "victory"
      : "defeat";
  }, [store.winner, effectiveAddress]);

  const isMatchOver = Boolean(
    store.winner !== null || store.phase === "FINISHED"
  );

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 lg:p-8 relative selection:bg-cyan-500 selection:text-slate-950 ${className}`}
    >
      {/* Background Cyberpunk Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Arena Command Bar */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between pb-4 mb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExitToLobby}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
            <h1 className="text-base font-black tracking-wider text-white uppercase font-mono flex items-center gap-2">
              Battleship Arena
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-normal">
                EVM COMMIT-REVEAL
              </span>
            </h1>
          </div>
        </div>

        {/* Status Pills & Audio Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono px-3 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/20 text-cyan-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>PHASE: {store.phase}</span>
          </div>

          <button
            type="button"
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"
            title={soundOn ? "Mute sound effects" : "Unmute sound effects"}
          >
            {soundOn ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* Main Arena Workspace */}
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">
        {/* ================================================================= */}
        {/* PHASE 1: FLEET DEPLOYMENT & PLACEMENT PHASE                       */}
        {/* ================================================================= */}
        {store.phase === "PLACEMENT" && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white uppercase font-mono flex items-center gap-2">
                  <Ship className="w-5 h-5 text-cyan-400" />
                  Tactical Fleet Deployment
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Position 5 warships on friendly waters. Press{" "}
                  <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 border border-cyan-500/40 rounded text-cyan-300">
                    R
                  </kbd>{" "}
                  to rotate. When ready, lock your Keccak256 commitment hash.
                </p>
              </div>

              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-cyan-300">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Zero-Knowledge Board Vault</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
              {/* Defensive Grid Placement Board */}
              <DefensiveGrid
                ships={store.myShips}
                incomingShots={[]}
                phase="PLACEMENT"
                selectedShipId={selectedShipId}
                selectedOrientation={placementOrientation}
                onPlaceShip={handlePlaceShip}
              />

              {/* Fleet Placement Controls Dock */}
              <FleetPlacementDock
                selectedShipId={selectedShipId}
                onSelectShip={(id) => setSelectedShipId(id)}
                orientation={placementOrientation}
                onToggleOrientation={handleToggleOrientation}
                ships={store.myShips}
                onAutoDeploy={store.autoDeployRandom}
                onClearFleet={() => store.reset()}
                onCommitFleet={handleLockAndCommit}
                isCommitting={isContractPending}
                isValidFleet={fleetValidation.valid}
                validationError={fleetValidation.error}
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* PHASE 2: WAITING FOR OPPONENT COMMITMENT                         */}
        {/* ================================================================= */}
        {store.phase === "WAITING_COMMIT" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[460px] bg-slate-900/40 border border-cyan-500/20 rounded-2xl backdrop-blur-md relative overflow-hidden">
            <div className="w-24 h-24 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 relative">
              <Radio className="w-10 h-10 text-cyan-400 animate-pulse" />
              <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
            </div>

            <h2 className="text-lg font-black text-white font-mono tracking-wider uppercase">
              Fleet Cryptographically Locked
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-2 max-w-md leading-relaxed">
              Your 10x10 fleet coordinates and 32-byte salt have been stored in
              your local vault. Awaiting opponent commitment to initiate naval combat...
            </p>

            {store.myBoardHash && (
              <div className="mt-6 px-4 py-2.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 font-mono text-xs text-cyan-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Hash: {store.myBoardHash}</span>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* PHASE 3 & 4: COMBAT & VERIFICATION PHASES (DUAL GRID)             */}
        {/* ================================================================= */}
        {(store.phase === "COMBAT" ||
          store.phase === "VERIFYING" ||
          store.phase === "FINISHED") && (
          <div className="flex flex-col gap-6">
            {/* Cyberpunk Player HUD */}
            <PlayerHud
              player1Address={player1Address}
              player2Address={player2Address}
              currentUserAddress={effectiveAddress}
              wager={initialWager}
              currentTurn={activeTurnPlayer}
              timeRemaining={timeRemaining}
              maxTurnTime={TURN_TIMEOUT_SECONDS}
              isGameOver={isMatchOver}
              isBotOpponent={mockSubMode === "bot"}
              gameStatusText={
                store.winner
                  ? "MATCH CONCLUDED"
                  : isMyTurn
                  ? "YOUR TURN • FIRE TORPEDO"
                  : "ENEMY SQUADRON TARGETING..."
              }
              onClaimTimeout={handleClaimTimeout}
              isClaimingTimeout={isClaimingTimeout}
            />

            {/* Fleet Health Bars Indicator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Friendly Fleet Health */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-cyan-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-400">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    FRIENDLY FLEET INTEGRITY:
                  </span>
                  <span>
                    {5 - store.mySunkShips.length}/5 OPERATIONAL
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {FLEET_LIST.map((shipDef) => {
                    const shipState = store.myShips.find(
                      (s) => s.shipId === shipDef.id
                    );
                    const isSunk = Boolean(shipState?.isSunk);
                    const hits = shipState?.hits ?? 0;

                    return (
                      <div
                        key={shipDef.id}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isSunk
                            ? "bg-rose-950/40 border-rose-500/50 text-rose-400"
                            : "bg-slate-950/70 border-cyan-500/20 text-slate-300"
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold truncate">
                          {shipDef.name}
                        </div>
                        <div className="flex justify-center gap-0.5 mt-1.5">
                          {Array.from({ length: shipDef.size }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < hits
                                  ? "bg-rose-500"
                                  : "bg-cyan-400/80"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enemy Fleet Health */}
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-emerald-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" />
                    ENEMY FLEET CASUALTIES:
                  </span>
                  <span>
                    {store.opponentSunkShips.length}/5 SUNK
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {FLEET_LIST.map((shipDef) => {
                    const isSunk = store.opponentSunkShips.includes(
                      shipDef.id as ShipId
                    );

                    return (
                      <div
                        key={shipDef.id}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isSunk
                            ? "bg-rose-950/50 border-rose-500 text-rose-300 font-bold"
                            : "bg-slate-950/70 border-emerald-500/20 text-slate-400"
                        }`}
                      >
                        <div className="text-[10px] font-mono truncate">
                          {shipDef.name}
                        </div>
                        <div className="text-[9px] font-mono mt-1">
                          {isSunk ? "SUNK" : `${shipDef.size} Cells`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Split Screen Dual Radar Grids */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left: Friendly Defensive Grid */}
              <DefensiveGrid
                ships={store.myShips}
                incomingShots={store.defensiveShots}
                phase={store.phase}
              />

              {/* Right: Offensive Radar Grid */}
              <OffensiveRadarGrid
                shots={store.offensiveShots}
                selectedTarget={store.selectedTarget}
                onSelectTarget={(coord) => store.setSelectedTarget(coord)}
                onFire={handleLaunchTorpedo}
                isMyTurn={isMyTurn}
                isFiring={isFiringTorpedo}
                opponentSunkShips={store.opponentSunkShips}
                disabled={isMatchOver}
              />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* CRYPTOGRAPHIC PROOF INSPECTOR & AUDIT PANEL                       */}
        {/* ================================================================= */}
        <CryptoProofPanel
          gameId={gameId}
          flatBoard={store.myFlatBoard}
          salt={store.mySalt}
          boardHash={store.myBoardHash}
          opponentBoardHash={store.opponentBoardHash}
          phase={store.phase}
          isVerified={store.isVerified}
          onVerify={handleRunIntegrityAudit}
          isVerifying={isAuditingProof}
        />
      </div>

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isMatchOver}
        outcome={gameOutcome}
        winnerAddress={store.winner}
        currentUserAddress={effectiveAddress}
        wager={initialWager}
        reason={
          store.mySunkShips.length === 5
            ? "All friendly warships destroyed"
            : store.opponentSunkShips.length === 5
            ? "All enemy warships sunk"
            : "Match concluded"
        }
        gameId={gameId}
        gameType={1}
        onPlayAgain={handlePlayAgain}
        onBackToLobby={handleExitToLobby}
      />

      {/* Transaction Toast Notification */}
      {toast && (
        <TransactionToast
          status={toast.status}
          title={toast.title}
          description={toast.description}
          errorMessage={toast.errorMessage}
          txHash={toast.txHash}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default BattleshipArena;

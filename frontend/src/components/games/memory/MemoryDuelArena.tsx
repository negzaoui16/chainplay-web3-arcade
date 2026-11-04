"use client";

/**
 * ChainPlay - Memory Duel Arena (Game 3)
 *
 * Full featured 4x4 1v1 Memory Duel Arena integrating:
 * - Cyberpunk arena layout with HUD, 4x4 grid, and control deck
 * - PlayerHud with 60s circular countdown timer and timeout forfeit CTA
 * - StreakScoreboard displaying live pair counts, remaining pairs, and combo badge ("EXTRA TURN! ⚡")
 * - MemoryGrid with 16 3D perspective flip cards
 * - useMemoryStore & useMemoryDuelContract integration
 * - Strict turn lock during 1200ms mismatch window
 * - Dual mode support: Mock (Smart Bot AI with ~45% recall memory / 2-Tab P2P Sync) & Live On-Chain
 * - GameOverModal on match resolution (victory with >= 5 pairs, 4-4 draw)
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  RotateCcw,
  ArrowLeft,
  Volume2,
  VolumeX,
  BrainCircuit,
  Bot,
  Users,
  Cpu,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";

import { useMemoryStore } from "@/store/useMemoryStore";
import { useMemoryDuelContract } from "@/hooks/useMemoryDuelContract";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import { useAppStore, MOCK_BOT_ADDRESS } from "@/store/useAppStore";
import {
  getBroadcastChannel,
  broadcastP2PMessage,
  triggerBotTurn,
} from "@/lib/mock/mockChainEngine";
import { GameType } from "@/types/lobby.types";
import { soundEffects } from "@/lib/utils/soundEffects";
import { formatAddress } from "@/lib/utils/formatters";

import { PlayerHud } from "@/components/shared/PlayerHud";
import { GameOverModal, type GameOutcome } from "@/components/shared/GameOverModal";
import { TransactionToast, type TxStatus } from "@/components/shared/TransactionToast";
import { MemoryGrid } from "./MemoryGrid";
import { StreakScoreboard } from "./StreakScoreboard";

export interface MemoryDuelArenaProps {
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

const DEFAULT_WAGER = 10000000000000000n; // 0.01 ETH
const TURN_TIMEOUT_SECONDS = 60;

export function MemoryDuelArena({
  gameId = "memory_demo_1",
  initialWager = DEFAULT_WAGER,
  initialPlayer1,
  initialPlayer2,
  onBackToLobby,
  onRematch,
  className = "",
}: MemoryDuelArenaProps): JSX.Element {
  const router = useRouter();

  // Mode & Wallet info
  const { isMock, effectiveAddress, activeChainId } = useChainPlayMode();
  const mockSubMode = useAppStore((state) => state.mockSubMode);
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const switchMockPlayerRole = useAppStore((state) => state.switchMockPlayerRole);

  // Store state
  const storeGameId = useMemoryStore((state) => state.gameId);
  const player1 = useMemoryStore((state) => state.player1);
  const player2 = useMemoryStore((state) => state.player2);
  const cards = useMemoryStore((state) => state.cards);
  const firstSelected = useMemoryStore((state) => state.firstSelected);
  const secondSelected = useMemoryStore((state) => state.secondSelected);
  const turnPhase = useMemoryStore((state) => state.turnPhase);
  const currentTurn = useMemoryStore((state) => state.currentTurn);
  const p1Score = useMemoryStore((state) => state.p1Score);
  const p2Score = useMemoryStore((state) => state.p2Score);
  const p1Pairs = useMemoryStore((state) => state.p1Pairs);
  const p2Pairs = useMemoryStore((state) => state.p2Pairs);
  const streakMultiplier = useMemoryStore((state) => state.streakMultiplier);
  const lastActionTimestamp = useMemoryStore((state) => state.lastActionTimestamp);
  const winner = useMemoryStore((state) => state.winner);
  const isDraw = useMemoryStore((state) => state.isDraw);
  const initDeck = useMemoryStore((state) => state.initDeck);

  // Contract actions
  const activeGameId = storeGameId || gameId;
  const { flipPair, claimTimeoutWin, isPending } = useMemoryDuelContract(activeGameId);

  // Toast notification state
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // 1-second interval ticker for turn countdown timer
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize game session on mount or when props change
  useEffect(() => {
    if (storeGameId !== activeGameId) {
      const p1 =
        initialPlayer1 ??
        effectiveAddress ??
        "0x1111111111111111111111111111111111111111";

      const p2 =
        initialPlayer2 ??
        (mockSubMode === "bot"
          ? MOCK_BOT_ADDRESS
          : "0x2222222222222222222222222222222222222222");

      initDeck(activeGameId, p1, p2);
    }
  }, [
    storeGameId,
    activeGameId,
    initialPlayer1,
    initialPlayer2,
    effectiveAddress,
    mockSubMode,
    initDeck,
  ]);

  // Ensure BroadcastChannel listener is active in mock mode
  useEffect(() => {
    if (isMock) {
      getBroadcastChannel();
    }
  }, [isMock]);

  // Computed turn and player addresses
  const effectiveP1 =
    player1 ?? initialPlayer1 ?? "0x1111111111111111111111111111111111111111";
  const effectiveP2 =
    player2 ??
    initialPlayer2 ??
    (mockSubMode === "bot"
      ? MOCK_BOT_ADDRESS
      : "0x2222222222222222222222222222222222222222");

  const normCurrent = effectiveAddress.toLowerCase().trim();
  const normP1 = effectiveP1.toLowerCase().trim();
  const normP2 = effectiveP2.toLowerCase().trim();

  const isUserP1 = normCurrent !== "" && normCurrent === normP1;
  const isUserP2 = normCurrent !== "" && normCurrent === normP2;

  const isGameOver = Boolean(winner !== null || isDraw);
  const isTurnLocked = turnPhase === "TURN_LOCKED" || isGameOver;

  const currentTurnPlayer =
    currentTurn.toLowerCase() === normP2 ? "player2" : "player1";

  const isMyTurn =
    !isGameOver &&
    ((currentTurnPlayer === "player1" && isUserP1) ||
      (currentTurnPlayer === "player2" && isUserP2));

  // Calculate remaining countdown seconds (0 to 60)
  const elapsedSec =
    lastActionTimestamp > 0
      ? Math.floor((now - lastActionTimestamp) / 1000)
      : 0;
  const timeRemaining = isGameOver
    ? TURN_TIMEOUT_SECONDS
    : Math.max(0, TURN_TIMEOUT_SECONDS - elapsedSec);

  // Outcome relative to current user
  const gameOutcome: GameOutcome = useMemo(() => {
    if (isDraw) return "draw";
    if (!winner) return "victory";
    return winner.toLowerCase() === normCurrent ? "victory" : "defeat";
  }, [winner, isDraw, normCurrent]);

  const outcomeReason = useMemo(() => {
    if (isDraw) return "Stalemate! 4 - 4 Draw across all 8 token pairs.";
    if (winner) {
      const isWinnerP1 = winner.toLowerCase() === normP1;
      const winningPairs = isWinnerP1 ? p1Pairs : p2Pairs;
      if (winningPairs >= 5) {
        return `Dominant victory with ${winningPairs} out of 8 pairs matched!`;
      }
      return "Match won by turn timeout forfeit or highest score.";
    }
    return undefined;
  }, [winner, isDraw, normP1, p1Pairs, p2Pairs]);

  const isBotOpponent =
    normP2 === MOCK_BOT_ADDRESS.toLowerCase() ||
    normP2 === "bot" ||
    (isMock && mockSubMode === "bot");

  // --------------------------------------------------------------------------
  // Autonomous Smart Bot AI Turn Trigger
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isMock || mockSubMode !== "bot" || isGameOver) {
      return undefined;
    }

    const isBotTurn = currentTurn.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase();
    if (!isBotTurn || turnPhase !== "SELECT_FIRST") {
      return undefined;
    }

    const timer = setTimeout(() => {
      const latest = useMemoryStore.getState();
      if (
        latest.currentTurn.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase() &&
        latest.turnPhase === "SELECT_FIRST" &&
        latest.winner === null &&
        !latest.isDraw
      ) {
        void triggerBotTurn(GameType.MEMORY_DUEL, activeGameId);
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [isMock, mockSubMode, isGameOver, currentTurn, turnPhase, activeGameId]);

  // --------------------------------------------------------------------------
  // Interactive Card Selection Handler
  // --------------------------------------------------------------------------
  const handleCardClick = useCallback(
    async (index: number): Promise<void> => {
      if (isGameOver || !isMyTurn || isPending || isTurnLocked) {
        return;
      }

      const currentStore = useMemoryStore.getState();
      const phase = currentStore.turnPhase;

      if (phase === "SELECT_FIRST") {
        const success = currentStore.selectCard(index, effectiveAddress);
        if (success) {
          if (isMock && mockSubMode === "p2p") {
            broadcastP2PMessage("MEMORY_SELECT", {
              index,
              player: effectiveAddress,
            });
          }
        }
      } else if (phase === "SELECT_SECOND") {
        const firstIdx = currentStore.firstSelected;
        if (firstIdx === null || firstIdx === index) return;

        if (isMock) {
          const success = currentStore.selectCard(index, effectiveAddress);
          if (success) {
            if (mockSubMode === "p2p") {
              broadcastP2PMessage("MEMORY_SELECT", {
                index,
                player: effectiveAddress,
              });
            }
          }
        } else {
          // Live On-Chain mode
          currentStore.selectCard(index, effectiveAddress);

          try {
            const res = await flipPair(activeGameId, firstIdx, index);
            if (res.txHash) {
              setToast({
                status: "confirmed",
                title: "Pair Flip Mined On-Chain",
                description: `Cards #${firstIdx + 1} and #${index + 1} mined on-chain.`,
                txHash: res.txHash,
              });
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            setToast({
              status: "error",
              title: "Transaction Reverted",
              errorMessage: errMsg,
            });
            soundEffects.playError();
          }
        }
      }
    },
    [
      isGameOver,
      isMyTurn,
      isPending,
      isTurnLocked,
      effectiveAddress,
      isMock,
      mockSubMode,
      flipPair,
      activeGameId,
    ]
  );

  // --------------------------------------------------------------------------
  // Timeout Forfeit Claim Handler
  // --------------------------------------------------------------------------
  const handleClaimTimeout = useCallback(async (): Promise<void> => {
    if (isGameOver) return;

    try {
      setToast({
        status: "pending",
        title: "Submitting Timeout Claim",
        description: "Enforcing 60s forfeit rule on inactive opponent...",
      });

      const res = await claimTimeoutWin(activeGameId);
      if (res.success) {
        setToast({
          status: "confirmed",
          title: "Timeout Forfeit Granted!",
          description: "Opponent exceeded 60s limit. Match victory awarded.",
          txHash: res.txHash,
        });
        soundEffects.playVictory();
      } else {
        setToast({
          status: "error",
          title: "Claim Denied",
          errorMessage: "Turn has not exceeded the 60-second threshold yet.",
        });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setToast({
        status: "error",
        title: "Timeout Claim Failed",
        errorMessage: errMsg,
      });
      soundEffects.playError();
    }
  }, [isGameOver, claimTimeoutWin, activeGameId]);

  // --------------------------------------------------------------------------
  // Rematch / Reset Handler
  // --------------------------------------------------------------------------
  const handleRematch = useCallback((): void => {
    soundEffects.playTileClick();
    initDeck(activeGameId, effectiveP1, effectiveP2);
    setToast(null);

    // If opponent is Bot and Bot is Player 1, trigger its opening move
    if (
      isMock &&
      mockSubMode === "bot" &&
      effectiveP1.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase()
    ) {
      setTimeout(() => {
        void triggerBotTurn(GameType.MEMORY_DUEL, activeGameId);
      }, 750);
    }

    onRematch?.();
  }, [
    initDeck,
    activeGameId,
    effectiveP1,
    effectiveP2,
    isMock,
    mockSubMode,
    onRematch,
  ]);

  const handleBackToLobby = useCallback((): void => {
    soundEffects.playTileClick();
    if (onBackToLobby) {
      onBackToLobby();
    } else {
      router.push("/lobby");
    }
  }, [onBackToLobby, router]);

  return (
    <div
      className={`w-full max-w-4xl mx-auto flex flex-col items-center gap-5 px-3 sm:px-4 py-4 select-none ${className}`}
    >
      {/* ============================================================ */}
      {/* Arena Navigation & Mode Header Bar                          */}
      {/* ============================================================ */}
      <div className="w-full flex items-center justify-between gap-4 p-3 rounded-2xl bg-[#0D121F]/80 backdrop-blur-md border border-slate-800 shadow-lg">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackToLobby}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
            aria-label="Back to Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-black font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <span>Memory Duel Arena</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700">
                  4x4 1v1
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Mode & Audio Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Badge */}
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono">
            {isMock ? (
              mockSubMode === "bot" ? (
                <>
                  <Bot className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-slate-300">Mock: Smart Bot (45%)</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-300">Mock: P2P Sync</span>
                </>
              )
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Live On-Chain</span>
              </>
            )}
          </div>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled
                ? "bg-slate-900 border-slate-700 text-cyan-400 hover:bg-slate-800"
                : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400"
            }`}
            aria-label={soundEnabled ? "Mute sound effects" : "Enable sound effects"}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 1v1 Player HUD with Circular Countdown Timer                 */}
      {/* ============================================================ */}
      <PlayerHud
        player1Address={effectiveP1}
        player2Address={effectiveP2}
        currentUserAddress={effectiveAddress}
        wager={initialWager}
        currentTurn={currentTurnPlayer}
        timeRemaining={timeRemaining}
        maxTurnTime={TURN_TIMEOUT_SECONDS}
        isGameOver={isGameOver}
        gameStatusText={
          isGameOver
            ? isDraw
              ? "STALEMATE (4 - 4)"
              : winner?.toLowerCase() === normCurrent
              ? "VICTORY!"
              : "DEFEAT"
            : undefined
        }
        isBotOpponent={isBotOpponent}
        onClaimTimeout={handleClaimTimeout}
        isClaimingTimeout={isPending}
      />

      {/* ============================================================ */}
      {/* Streak & Pair Scoreboard                                     */}
      {/* ============================================================ */}
      <StreakScoreboard
        p1Score={p1Score}
        p2Score={p2Score}
        p1Pairs={p1Pairs}
        p2Pairs={p2Pairs}
        totalPairs={8}
        streakMultiplier={streakMultiplier}
        player1Address={effectiveP1}
        player2Address={effectiveP2}
        isMyTurn={isMyTurn}
        isUserP1={isUserP1}
        isUserP2={isUserP2}
      />

      {/* ============================================================ */}
      {/* 4x4 3D Memory Card Grid                                      */}
      {/* ============================================================ */}
      <div className="w-full flex flex-col items-center justify-center my-1">
        <MemoryGrid
          cards={cards}
          firstSelected={firstSelected}
          secondSelected={secondSelected}
          isTurnLocked={isTurnLocked}
          isMyTurn={isMyTurn}
          isUserP1={isUserP1}
          isUserP2={isUserP2}
          player1Address={effectiveP1}
          player2Address={effectiveP2}
          onCardClick={handleCardClick}
        />

        {/* Dynamic Contextual Helper Subtitle */}
        <div className="mt-3 text-center">
          <motion.p
            key={`${isMyTurn}-${isGameOver}-${turnPhase}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-mono font-medium tracking-wide ${
              isGameOver
                ? "text-slate-400"
                : isTurnLocked
                ? "text-rose-400 font-bold"
                : isMyTurn
                ? "text-cyan-300 font-bold animate-pulse"
                : "text-slate-500"
            }`}
          >
            {isGameOver
              ? "Match concluded. Review outcome or click Rematch to play again."
              : isTurnLocked
              ? "Mismatch! Memorize card positions before they flip back..."
              : isMyTurn
              ? turnPhase === "SELECT_FIRST"
                ? "Your turn! Select your first card to reveal its Web3 token."
                : "Match the token! Select a second card."
              : `Waiting for ${
                  isBotOpponent
                    ? "Smart Bot 🤖"
                    : currentTurnPlayer === "player1"
                    ? formatAddress(effectiveP1)
                    : formatAddress(effectiveP2)
                } to move...`}
          </motion.p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Action Deck & Sandbox Role Switcher Controls                 */}
      {/* ============================================================ */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          {/* Quick Rematch Button */}
          <button
            type="button"
            onClick={handleRematch}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 hover:border-cyan-500/40"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Rematch</span>
          </button>
        </div>

        {/* Sandbox Role Switcher (Available in Mock Mode for 1-click testing) */}
        {isMock && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
              Mock Role:
            </span>
            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                switchMockPlayerRole();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-all"
              title="Toggle current mock player role between Player 1 (Cyan) and Player 2 (Magenta)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Playing as:{" "}
                <span className="font-bold text-cyan-300">
                  {isUserP1 ? "P1 (Cyan)" : isUserP2 ? "P2 (Magenta)" : "Observer"}
                </span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* Game Over Modal (Victory / Defeat / Stalemate)                */}
      {/* ============================================================ */}
      <GameOverModal
        isOpen={isGameOver}
        outcome={gameOutcome}
        winnerAddress={winner}
        currentUserAddress={effectiveAddress}
        wager={initialWager}
        reason={outcomeReason}
        onPlayAgain={handleRematch}
        onBackToLobby={handleBackToLobby}
      />

      {/* ============================================================ */}
      {/* Floating Status & Transaction Toast                          */}
      {/* ============================================================ */}
      {toast && (
        <TransactionToast
          status={toast.status}
          title={toast.title}
          description={toast.description}
          errorMessage={toast.errorMessage}
          txHash={toast.txHash}
          chainId={activeChainId}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default MemoryDuelArena;

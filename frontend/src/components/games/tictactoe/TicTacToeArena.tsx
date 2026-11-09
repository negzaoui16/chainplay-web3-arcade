"use client";

/**
 * ChainPlay - Tic-Tac-Toe Arena (Game 1)
 *
 * Full featured 3x3 XO Arena integrating:
 * - Cyberpunk layout with HUD, board, and control deck
 * - PlayerHud with 60s circular countdown timer and timeout forfeit CTA
 * - XOBoard with responsive 3x3 layout and Framer Motion SVG laser strike line
 * - useTicTacToeStore & useTicTacToeContract integration
 * - Optimistic moves with instant pulse, spinner, and error rollbacks
 * - Dual mode support: Mock (Smart Bot AI / 2-Tab P2P Sync) & Live On-Chain
 * - GameOverModal on match resolution with rematch and escrow claim
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
  Swords,
  Bot,
  Users,
  Cpu,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";

import { useTicTacToeStore } from "@/store/useTicTacToeStore";
import { useTicTacToeContract } from "@/hooks/useTicTacToeContract";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import { useAppStore, MOCK_BOT_ADDRESS } from "@/store/useAppStore";
import { getBroadcastChannel, triggerBotTurn } from "@/lib/mock/mockChainEngine";
import { GameType } from "@/types/lobby.types";
import { soundEffects } from "@/lib/utils/soundEffects";
import { formatAddress } from "@/lib/utils/formatters";

import { PlayerHud } from "@/components/shared/PlayerHud";
import { GameOverModal, type GameOutcome } from "@/components/shared/GameOverModal";
import { TransactionToast, type TxStatus } from "@/components/shared/TransactionToast";
import { XOBoard } from "./XOBoard";

export interface TicTacToeArenaProps {
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
const TURN_TIMEOUT_SECONDS = 60;

export function TicTacToeArena({
  gameId = "ttt_demo_1",
  initialWager = DEFAULT_WAGER,
  initialPlayer1,
  initialPlayer2,
  onBackToLobby,
  onRematch,
  className = "",
}: TicTacToeArenaProps): JSX.Element {
  const router = useRouter();

  // Mode & Wallet info
  const { isMock, effectiveAddress, activeChainId } = useChainPlayMode();
  const mockSubMode = useAppStore((state) => state.mockSubMode);
  const soundEnabled = useAppStore((state) => state.soundEnabled);
  const toggleSound = useAppStore((state) => state.toggleSound);
  const switchMockPlayerRole = useAppStore((state) => state.switchMockPlayerRole);

  // Store state
  const storeGameId = useTicTacToeStore((state) => state.gameId);
  const player1 = useTicTacToeStore((state) => state.player1);
  const player2 = useTicTacToeStore((state) => state.player2);
  const board = useTicTacToeStore((state) => state.board);
  const currentTurn = useTicTacToeStore((state) => state.currentTurn);
  const lastMoveTimestamp = useTicTacToeStore((state) => state.lastMoveTimestamp);
  const winningLine = useTicTacToeStore((state) => state.winningLine);
  const winner = useTicTacToeStore((state) => state.winner);
  const isDraw = useTicTacToeStore((state) => state.isDraw);
  const optimisticPendingIndex = useTicTacToeStore(
    (state) => state.optimisticPendingIndex
  );
  const initGame = useTicTacToeStore((state) => state.initGame);
  const rollbackMove = useTicTacToeStore((state) => state.rollbackMove);

  // Contract actions
  const activeGameId = storeGameId || gameId;
  const { makeMove, claimTimeoutWin, isPending } = useTicTacToeContract(activeGameId);

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

      initGame(activeGameId, p1, p2);
    }
  }, [
    storeGameId,
    activeGameId,
    initialPlayer1,
    initialPlayer2,
    effectiveAddress,
    mockSubMode,
    initGame,
  ]);

  // Ensure BroadcastChannel listener is active in mock mode
  useEffect(() => {
    if (isMock) {
      getBroadcastChannel();
    }
  }, [isMock]);

  // Computed turn and timer states
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

  // Local user's assigned symbol: P1 is X (1), P2 is O (2)
  const mySymbol: 1 | 2 = isUserP2 ? 2 : 1;

  const isGameOver = Boolean(winner !== null || isDraw);

  const currentTurnPlayer =
    currentTurn.toLowerCase() === normP2 ? "player2" : "player1";

  const isMyTurn =
    !isGameOver &&
    ((currentTurnPlayer === "player1" && isUserP1) ||
      (currentTurnPlayer === "player2" && isUserP2));

  // Calculate remaining countdown seconds (0 to 60)
  const elapsedSec =
    lastMoveTimestamp > 0 ? Math.floor((now - lastMoveTimestamp) / 1000) : 0;
  const timeRemaining = isGameOver
    ? TURN_TIMEOUT_SECONDS
    : Math.max(0, TURN_TIMEOUT_SECONDS - elapsedSec);

  // Winning symbol (1 for X, 2 for O)
  const winningSymbol: 1 | 2 | null = useMemo(() => {
    if (!winner) return null;
    return winner.toLowerCase() === normP1 ? 1 : 2;
  }, [winner, normP1]);

  // Game outcome relative to current user
  const gameOutcome: GameOutcome = useMemo(() => {
    if (isDraw) return "draw";
    if (!winner) return "victory";
    return winner.toLowerCase() === normCurrent ? "victory" : "defeat";
  }, [winner, isDraw, normCurrent]);

  const outcomeReason = useMemo(() => {
    if (isDraw) return "Stalemate! All 9 cells filled without 3-in-a-row.";
    if (winner) {
      if (winningLine) return "3-in-a-row cyber laser strike line!";
      return "Opponent forfeit due to 60-second turn timeout.";
    }
    return undefined;
  }, [winner, isDraw, winningLine]);

  // If match concluded with a bot turn, ensure game state is resolved
  const isBotOpponent =
    normP2 === MOCK_BOT_ADDRESS.toLowerCase() ||
    normP2 === "bot" ||
    mockSubMode === "bot";

  // --------------------------------------------------------------------------
  // Move Submission Handler
  // --------------------------------------------------------------------------
  const handleCellClick = useCallback(
    async (cellIndex: number): Promise<void> => {
      if (isGameOver || !isMyTurn || isPending || optimisticPendingIndex !== null) {
        return;
      }

      try {
        const result = await makeMove(activeGameId, cellIndex);
        if (!result.success) {
          rollbackMove(cellIndex);
          setToast({
            status: "error",
            title: "Invalid Move",
            errorMessage: "That cell is already occupied or move is illegal.",
          });
          soundEffects.playError();
        } else if (result.txHash) {
          setToast({
            status: "confirmed",
            title: "Move Mined On-Chain",
            description: `Cell #${cellIndex + 1} locked successfully.`,
            txHash: result.txHash,
          });
        }
      } catch (err) {
        rollbackMove(cellIndex);
        const errMsg = err instanceof Error ? err.message : String(err);
        setToast({
          status: "error",
          title: "Transaction Reverted",
          errorMessage: errMsg,
        });
        soundEffects.playError();
      }
    },
    [
      isGameOver,
      isMyTurn,
      isPending,
      optimisticPendingIndex,
      makeMove,
      activeGameId,
      rollbackMove,
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
    const nextGameId = `ttt_${Date.now()}`;
    initGame(nextGameId, effectiveP1, effectiveP2);
    setToast(null);

    // If opponent is Bot and Bot is Player 1, trigger its opening move
    if (
      mockSubMode === "bot" &&
      effectiveP1.toLowerCase() === MOCK_BOT_ADDRESS.toLowerCase()
    ) {
      void triggerBotTurn(GameType.TIC_TAC_TOE, nextGameId);
    }

    onRematch?.();
  }, [
    initGame,
    effectiveP1,
    effectiveP2,
    mockSubMode,
    onRematch,
  ]);

  const handleBackToLobby = useCallback((): void => {
    soundEffects.playTileClick();
    if (onBackToLobby) {
      onBackToLobby();
    } else {
      router.push("/");
    }
  }, [onBackToLobby, router]);

  return (
    <div
      className={`w-full max-w-4xl mx-auto flex flex-col items-center gap-6 px-4 py-4 select-none ${className}`}
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
            aria-label="Back to Home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Swords className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-black font-mono tracking-wider uppercase text-white flex items-center gap-2">
                <span>Tic-Tac-Toe Arena</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-cyan-300 border border-slate-700">
                  3x3 XO
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
                  <span className="text-slate-300">Mock: Smart Bot</span>
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
              ? "STALEMATE"
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
      {/* Main Interactive 3x3 XO Board                                */}
      {/* ============================================================ */}
      <div className="relative w-full flex flex-col items-center justify-center my-2">
        <XOBoard
          board={board}
          winningLine={winningLine}
          winningSymbol={winningSymbol}
          optimisticPendingIndex={optimisticPendingIndex}
          isBoardLocked={isGameOver || isPending}
          isMyTurn={isMyTurn}
          mySymbol={mySymbol}
          onCellClick={handleCellClick}
        />

        {/* Dynamic Contextual Helper Subtitle */}
        <div className="mt-4 text-center">
          <motion.p
            key={`${isMyTurn}-${isGameOver}`}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-xs font-mono font-medium tracking-wide ${
              isGameOver
                ? "text-slate-400"
                : isMyTurn
                ? "text-cyan-300 font-bold animate-pulse"
                : "text-slate-500"
            }`}
          >
            {isGameOver
              ? "Match concluded. Review outcome or click Rematch to play again."
              : isMyTurn
              ? `Your turn! Click an empty cell to place your ${
                  mySymbol === 1 ? "X (Cyan)" : "O (Magenta)"
                }.`
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
              title="Toggle current mock player role between Player 1 (X) and Player 2 (O)"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Playing as:{" "}
                <span className="font-bold text-cyan-300">
                  {isUserP1 ? "P1 (X)" : isUserP2 ? "P2 (O)" : "Observer"}
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
        gameId={activeGameId}
        gameType={0}
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

export default TicTacToeArena;

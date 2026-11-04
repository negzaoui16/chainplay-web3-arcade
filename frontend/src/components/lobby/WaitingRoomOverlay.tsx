"use client";

/**
 * ChainPlay - 1v1 Matchmaking Waiting Room Overlay
 *
 * Implements the immersive pre-game staging room:
 * - Direct shareable URL & Room Code 1-click copy
 * - Dual player staging slots: Host (Ready & Staked) vs Challenger (Awaiting Opponent)
 * - Animated radar / sonar sweep awaiting challenger connection
 * - Mock Mode quick action triggers: "Play Against Smart Bot" & "Launch Tab 2"
 * - Cancel wager CTA invoking `useGameManager.cancelWaitingGame` with escrow refund
 * - Reactive auto-transition listener when P2 joins (mock P2P or on-chain events)
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Share2,
  Shield,
  Swords,
  Brain,
  Bot,
  ExternalLink,
  ArrowLeft,
  XCircle,
  Loader2,
  Radar,
} from "lucide-react";
import {
  GameType,
  RoomStatus,
  GAME_TYPE_LABELS,
  GAME_TYPE_SLUGS,
} from "@/types/lobby.types";
import { useLobbyStore } from "@/store/useLobbyStore";
import { useGameManager } from "@/hooks/useGameManager";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import { MOCK_BOT_ADDRESS } from "@/store/useAppStore";
import {
  formatAddress,
  formatWager,
  formatEther,
} from "@/lib/utils/formatters";
import { soundEffects } from "@/lib/utils/soundEffects";

export interface WaitingRoomOverlayProps {
  readonly roomId: string;
  readonly gameType: GameType;
  readonly wager: bigint;
  readonly player1: string;
  readonly player2?: string | null;
  readonly onOpponentJoined?: () => void;
  readonly onCancelled?: () => void;
}

export function WaitingRoomOverlay({
  roomId,
  gameType,
  wager,
  player1,
  player2,
  onOpponentJoined,
  onCancelled,
}: WaitingRoomOverlayProps): JSX.Element {
  const router = useRouter();
  const { cancelWaitingGame, joinGame, isPending } = useGameManager();
  const { isMock, effectiveAddress } = useChainPlayMode();

  const rooms = useLobbyStore((s) => s.rooms);
  const activeRoom = rooms.find((r) => r.id === roomId);

  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);

  const slug = GAME_TYPE_SLUGS[gameType];
  const isHost = player1.toLowerCase() === effectiveAddress.toLowerCase();

  const handleJoinMatch = async (): Promise<void> => {
    soundEffects.playTileClick();
    setIsJoining(true);
    try {
      const res = await joinGame(roomId, formatEther(wager));
      if (res.success) {
        soundEffects.playMatchChime();
        if (onOpponentJoined) {
          onOpponentJoined();
        }
      }
    } catch {
      soundEffects.playError();
    } finally {
      setIsJoining(false);
    }
  };

  // Watch for active room status transition
  useEffect(() => {
    if (activeRoom && activeRoom.status === RoomStatus.ACTIVE) {
      soundEffects.playMatchChime();
      if (onOpponentJoined) {
        onOpponentJoined();
      }
    }
  }, [activeRoom, onOpponentJoined]);

  const handleCopyLink = (): void => {
    soundEffects.playTileClick();
    if (typeof window !== "undefined" && navigator.clipboard) {
      const url = `${window.location.origin}/game/${slug}/${roomId}`;
      void navigator.clipboard.writeText(url).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      });
    }
  };

  const handleCopyCode = (): void => {
    soundEffects.playTileClick();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(roomId).then(() => {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      });
    }
  };

  const handleCancelWager = async (): Promise<void> => {
    soundEffects.playTileClick();
    setIsCancelling(true);
    try {
      await cancelWaitingGame(roomId);
      soundEffects.playVictory();
      if (onCancelled) {
        onCancelled();
      } else {
        router.push("/lobby");
      }
    } catch (err) {
      soundEffects.playError();
      console.error("Failed to cancel room wager:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleLaunchMockBot = (): void => {
    soundEffects.playMatchChime();
    // In mock mode, join this room as Smart Bot
    useLobbyStore.getState().joinRoom(roomId, MOCK_BOT_ADDRESS);
    if (onOpponentJoined) {
      onOpponentJoined();
    }
  };

  const handleLaunchTab2 = (): void => {
    soundEffects.playTileClick();
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "2");
      window.open(url.toString(), "_blank");
    }
  };

  const getGameIcon = (): JSX.Element => {
    switch (gameType) {
      case GameType.TIC_TAC_TOE:
        return <Swords className="w-6 h-6 text-cyan-400" />;
      case GameType.BATTLESHIP:
        return <Shield className="w-6 h-6 text-pink-400" />;
      case GameType.MEMORY_DUEL:
        return <Brain className="w-6 h-6 text-amber-400" />;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center">
      {/* Back to Lobby Link */}
      <div className="w-full flex items-center justify-between mb-8">
        <button
          type="button"
          onClick={() => {
            soundEffects.playTileClick();
            router.push("/lobby");
          }}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Lobby</span>
        </button>

        <span className="text-xs font-mono text-slate-500">
          Arena ID: {formatAddress(roomId, 6, 6)}
        </span>
      </div>

      {/* Main Glass Stage Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full rounded-3xl bg-[#0D121F]/95 border border-cyan-500/40 p-6 sm:p-10 backdrop-blur-2xl shadow-[0_0_60px_rgba(0,240,255,0.2)] flex flex-col items-center relative overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Title & Badge */}
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase mb-3 shadow-cyan-glow">
            {getGameIcon()}
            <span>{GAME_TYPE_LABELS[gameType]} Arena</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wider font-mono uppercase mb-2">
            Awaiting Challenger
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md">
            Wager is locked in smart contract escrow. Share the arena invite
            link to duel a challenger.
          </p>
        </div>

        {/* Dual Player 1v1 Staging Deck */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 my-4 relative z-10">
          {/* Player 1 (Host) Slot */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-slate-900/90 to-[#07090E]/90 border border-cyan-500/50 shadow-cyan-glow flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 font-mono">
                Player 1 (Host)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready & Staked</span>
              </span>
            </div>

            <div className="flex items-center gap-3.5 my-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center font-mono font-black text-cyan-300 text-base shadow-inner">
                P1
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm sm:text-base font-bold text-white">
                  {formatAddress(player1, 8, 6)}
                </span>
                <span className="text-xs text-slate-400">
                  {isHost ? "You (Match Creator)" : "Arena Host"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Committed Stake</span>
              <span className="font-bold text-amber-300">
                {formatWager(wager)}
              </span>
            </div>
          </div>

          {/* Player 2 (Challenger) Slot */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-slate-900/40 to-[#07090E]/90 border border-dashed border-slate-700/80 flex flex-col justify-between relative overflow-hidden">
            {/* Animated Radar Scanning Effect */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 font-mono">
                Player 2 (Challenger)
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold">
                <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                <span>Searching Radar...</span>
              </span>
            </div>

            <div className="flex items-center gap-3.5 my-3 relative z-10">
              <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-600">
                <Radar className="w-6 h-6 text-cyan-400/60 animate-spin" />
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm font-semibold text-slate-300">
                  {player2 ? formatAddress(player2, 8, 6) : "Waiting for Opponent..."}
                </span>
                <span className="text-xs text-slate-500">
                  Required Stake: {formatWager(wager)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono relative z-10">
              <span className="text-slate-500">Escrow Prize Pot</span>
              <span className="font-bold text-emerald-400">
                {formatEther((wager * 2n * 975n) / 1000n, 4)} ETH
              </span>
            </div>
          </div>
        </div>

        {/* Share Invite Bar */}
        <div className="w-full max-w-xl my-6 flex flex-col sm:flex-row items-center gap-3 relative z-10">
          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Invite Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>Copy Shareable Arena Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all flex items-center justify-center gap-2"
            title="Copy Raw Room Code"
          >
            {copiedCode ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>Room Code</span>
          </button>
        </div>

        {/* Mock Mode Shortcut Testing Controls */}
        {isMock && (
          <div className="w-full max-w-xl p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 my-2 text-xs relative z-10">
            <div className="flex items-center gap-2 text-amber-300">
              <Bot className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold">Mock Mode Instant Play:</span>
                <p className="text-[11px] text-amber-200/80">
                  Test your arena against AI or across two browser tabs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleLaunchMockBot}
                className="py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-bold transition-all shadow-sm"
              >
                Launch Smart Bot
              </button>

              <button
                type="button"
                onClick={handleLaunchTab2}
                className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-medium transition-all flex items-center gap-1"
                title="Open Tab 2 for 2-tab local testing"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Tab 2</span>
              </button>
            </div>
          </div>
        )}

        {/* Join Room CTA for Visiting Challengers */}
        {!isHost && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 w-full flex flex-col items-center gap-3 relative z-10">
            <button
              type="button"
              disabled={isJoining || isPending}
              onClick={() => void handleJoinMatch()}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-mono text-sm font-bold uppercase tracking-wider bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-magenta-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isJoining || isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Staking Wager & Entering Match...</span>
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4" />
                  <span>Join Arena & Stake {formatWager(wager)}</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-500 font-mono">
              Your wager will be securely locked in smart contract escrow.
            </p>
          </div>
        )}

        {/* Cancel Room CTA for Host */}
        {isHost && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 w-full flex justify-center relative z-10">
            <button
              type="button"
              disabled={isCancelling || isPending}
              onClick={() => void handleCancelWager()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Refunding Escrow Stake...</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Match & Refund Stake</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default WaitingRoomOverlay;

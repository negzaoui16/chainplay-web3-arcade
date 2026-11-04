"use client";

/**
 * ChainPlay - Animated Cyberpunk Transaction Toast
 *
 * Displays asynchronous on-chain and mock transaction states:
 * - `pending`: Cyan neon glow with animated spinner and "Mining Transaction..."
 * - `confirmed`: Emerald green glow with checkmark, sound chime, and block explorer link
 * - `error`: Rose red glow with alert icon, error message, and sound buzz
 *
 * Animated with Framer Motion and supports auto-dismissal.
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CHAIN_IDS } from "@/config/constants";
import { formatAddress } from "@/lib/utils/formatters";
import { soundEffects } from "@/lib/utils/soundEffects";

export type TxStatus = "idle" | "pending" | "confirmed" | "error";

export interface TransactionToastProps {
  /**
   * Current status of the transaction
   */
  readonly status: TxStatus;

  /**
   * Title headline (e.g. "Move Submitted", "Winnings Claimed")
   */
  readonly title: string;

  /**
   * Optional contextual description
   */
  readonly description?: string;

  /**
   * EVM Transaction Hash if available
   */
  readonly txHash?: `0x${string}` | string | null;

  /**
   * EVM Chain ID to construct accurate explorer link
   */
  readonly chainId?: number;

  /**
   * Error message if status === "error"
   */
  readonly errorMessage?: string | null;

  /**
   * Callback invoked to close the toast
   */
  readonly onClose?: () => void;

  /**
   * Auto-close duration in milliseconds (default: 6000ms for confirmed/error)
   */
  readonly autoCloseMs?: number;
}

/**
 * Resolves the block explorer transaction link based on chain ID.
 */
export function getExplorerTxUrl(
  txHash: string,
  chainId?: number
): string | null {
  if (!txHash) return null;
  const clean = txHash.trim();
  if (clean.length < 10) return null;

  if (chainId === CHAIN_IDS.ARBITRUM_SEPOLIA) {
    return `https://sepolia.arbiscan.io/tx/${clean}`;
  }
  // Default to Ethereum Sepolia Etherscan
  return `https://sepolia.etherscan.io/tx/${clean}`;
}

export function TransactionToast({
  status,
  title,
  description,
  txHash,
  chainId = CHAIN_IDS.SEPOLIA,
  errorMessage,
  onClose,
  autoCloseMs = 6000,
}: TransactionToastProps): JSX.Element | null {
  // Play sound effect on status transitions
  useEffect(() => {
    if (status === "confirmed") {
      soundEffects.playMatchChime();
    } else if (status === "error") {
      soundEffects.playError();
    }
  }, [status]);

  // Auto-close timer for resolved states
  useEffect(() => {
    if (status === "confirmed" || status === "error") {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, autoCloseMs, onClose]);

  if (status === "idle") {
    return null;
  }

  const explorerUrl = txHash ? getExplorerTxUrl(txHash, chainId) : null;

  // Visual theming based on status
  let borderColor = "border-cyan-500/60";
  let glowColor = "shadow-cyan-glow";
  let icon = <Loader2 className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />;

  if (status === "confirmed") {
    borderColor = "border-emerald-500/60";
    glowColor = "shadow-[0_0_25px_rgba(16,185,129,0.4)]";
    icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
  } else if (status === "error") {
    borderColor = "border-rose-500/60";
    glowColor = "shadow-[0_0_25px_rgba(244,63,94,0.4)]";
    icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
  }

  return (
    <aside aria-label="Transaction status notification">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className={`fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0D121F]/95 backdrop-blur-xl border ${borderColor} rounded-2xl p-4 ${glowColor} shadow-2xl flex flex-col gap-2`}
        >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {icon}
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white tracking-wide">
                {title}
              </span>
              {description && (
                <span className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {description}
                </span>
              )}
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                onClose();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error message detail if present */}
        {status === "error" && errorMessage && (
          <div className="mt-1 px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs font-mono break-words leading-tight">
            {errorMessage}
          </div>
        )}

        {/* Explorer Link if txHash present */}
        {txHash && (
          <div className="mt-1 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              Tx: {formatAddress(txHash, 6, 6)}
            </span>
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => soundEffects.playTileClick()}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                <span>View Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Status progress indicator bar */}
        {status === "pending" && (
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div className="w-full h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500 animate-pulse rounded-full" />
          </div>
        )}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

export default TransactionToast;
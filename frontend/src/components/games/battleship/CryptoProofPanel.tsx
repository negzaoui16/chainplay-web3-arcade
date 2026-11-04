"use client";

/**
 * ChainPlay - Battleship Cryptographic Proof Inspector Panel
 *
 * Provides cryptographic transparency & security controls:
 * - Live inspection of player's Keccak256 board commitment hash
 * - 32-byte secret salt with masked/unmasked toggle and entropy metrics
 * - Opponent's on-chain public commitment hash
 * - Backup secret key export (Download .json / Copy formatted JSON)
 * - End-game cryptographic integrity audit (triggers verifyFinalBoard)
 * - Educational EVM commit-reveal formula breakdown
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useCallback } from "react";
import {
  ShieldCheck,
  Shield,
  Key,
  Lock,
  Download,
  Copy,
  Check,
  Eye,
  EyeOff,
  Code2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Terminal,
  FileJson,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { exportSecretKeyBackup } from "@/lib/crypto/battleshipCrypto";
import type { CommitData } from "@/types/battleship.types";
import { playTileClick } from "@/lib/utils/soundEffects";

export interface CryptoProofPanelProps {
  /**
   * Unique game identifier
   */
  readonly gameId: string | null;

  /**
   * Flat 100-cell array representing friendly ship deployment
   */
  readonly flatBoard: number[];

  /**
   * Cryptographic 32-byte salt
   */
  readonly salt: `0x${string}` | null;

  /**
   * Committed Keccak256 hash of friendly board
   */
  readonly boardHash: `0x${string}` | null;

  /**
   * Opponent's committed Keccak256 hash
   */
  readonly opponentBoardHash: `0x${string}` | null;

  /**
   * Current arena phase
   */
  readonly phase: string;

  /**
   * Whether the final board has been cryptographically verified
   */
  readonly isVerified: boolean;

  /**
   * Callback to trigger end-game integrity audit
   */
  readonly onVerify?: () => void;

  /**
   * Whether verification transaction / calculation is in progress
   */
  readonly isVerifying?: boolean;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

export function CryptoProofPanel({
  gameId,
  flatBoard,
  salt,
  boardHash,
  opponentBoardHash,
  phase,
  isVerified,
  onVerify,
  isVerifying = false,
  className = "",
}: CryptoProofPanelProps): React.JSX.Element {
  const [showSalt, setShowSalt] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showFormulas, setShowFormulas] = useState<boolean>(false);

  const copyToClipboard = useCallback((text: string, keyName: string) => {
    if (typeof window === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      playTileClick();
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => {
      // Fallback
    });
  }, []);

  const downloadBackupJson = useCallback(() => {
    if (!salt || !boardHash || typeof window === "undefined") return;

    playTileClick();
    const backupData: CommitData = {
      flatBoard,
      ships: [],
      salt,
      boardHash,
      timestamp: Date.now(),
    };

    const serialized = exportSecretKeyBackup(backupData);
    const blob = new Blob([serialized], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `battleship-vault-${gameId || "game"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [salt, boardHash, flatBoard, gameId]);

  const maskSalt = (val: string): string => {
    if (!val || val.length < 16) return "••••••••••••••••";
    return `${val.substring(0, 8)}••••••••••••••••••••••••••••••••••••••••••••••••${val.substring(val.length - 6)}`;
  };

  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-cyan-500/25 rounded-2xl p-5 shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Background Cyan Glow */}
      <div className="absolute top-0 right-1/4 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Accordion Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-wider text-white uppercase font-mono">
                Cryptographic Vault & Proof Inspector
              </h3>
              {isVerified ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> VERIFIED
                </span>
              ) : boardHash ? (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Shield className="w-3 h-3" /> COMMITTED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono font-bold">
                  UNLOCKED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Zero-knowledge Keccak256 commitment protects Fog of War
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-cyan-500/20 flex flex-col gap-3"
          >
            {/* Friendly Board Commitment Hash */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-400">
                  <Key className="w-3.5 h-3.5" />
                  <span>YOUR KECCAK256 BOARD COMMITMENT:</span>
                </div>
                <div className="font-mono text-xs text-slate-200 mt-1 break-all select-all">
                  {boardHash ? (
                    boardHash
                  ) : (
                    <span className="text-slate-500 italic">
                      Pending deployment commitment...
                    </span>
                  )}
                </div>
              </div>

              {boardHash && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(boardHash, "boardHash")}
                  className="self-end sm:self-center shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  {copiedKey === "boardHash" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Secret 32-Byte Salt */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>32-BYTE SECRET SALT:</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-normal">
                    256-Bit CSPRNG
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-200 mt-1 break-all select-all">
                  {salt ? (
                    showSalt ? salt : maskSalt(salt)
                  ) : (
                    <span className="text-slate-500 italic">
                      Generated upon fleet lock...
                    </span>
                  )}
                </div>
              </div>

              {salt && (
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSalt(!showSalt)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title={showSalt ? "Mask salt" : "Reveal salt"}
                  >
                    {showSalt ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(salt, "salt")}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-200 text-xs font-mono flex items-center gap-1.5 transition-all"
                  >
                    {copiedKey === "salt" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Opponent Commitment Hash */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-rose-400">
                  <Shield className="w-3.5 h-3.5" />
                  <span>OPPONENT KECCAK256 COMMITMENT:</span>
                </div>
                <div className="font-mono text-xs text-slate-200 mt-1 break-all select-all">
                  {opponentBoardHash ? (
                    opponentBoardHash
                  ) : (
                    <span className="text-slate-500 italic">
                      Waiting for opponent to lock fleet...
                    </span>
                  )}
                </div>
              </div>

              {opponentBoardHash && (
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(opponentBoardHash, "opponentBoardHash")
                  }
                  className="self-end sm:self-center shrink-0 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-200 text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  {copiedKey === "opponentBoardHash" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Secret Backup & Export Bar */}
            {boardHash && salt && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadBackupJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Secret Vault (.json)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const backupData: CommitData = {
                        flatBoard,
                        ships: [],
                        salt,
                        boardHash,
                        timestamp: Date.now(),
                      };
                      copyToClipboard(
                        exportSecretKeyBackup(backupData),
                        "secretVaultJson"
                      );
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono transition-all active:scale-95"
                  >
                    <FileJson className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {copiedKey === "secretVaultJson"
                        ? "JSON Copied!"
                        : "Copy Vault JSON"}
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFormulas(!showFormulas)}
                  className="text-[11px] font-mono text-slate-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{showFormulas ? "Hide Formula" : "Show EVM Formula"}</span>
                </button>
              </div>
            )}

            {/* End-Game Integrity Audit Trigger */}
            {(phase === "VERIFYING" || phase === "FINISHED") && onVerify && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono font-black text-emerald-300 uppercase">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Match Resolution & Final Integrity Audit</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                    {isVerified
                      ? "Cryptographic proof strictly matches. Zero fleet coordinate tampering detected."
                      : "Execute verifyFinalBoard to audit revealed cells against the initial commit hash."}
                  </p>
                </div>

                {!isVerified && (
                  <button
                    type="button"
                    onClick={onVerify}
                    disabled={isVerifying}
                    className="shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Auditing On-Chain...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Audit Final Board</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Cryptographic Formula Technical Details */}
            <AnimatePresence>
              {showFormulas && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-xl bg-black/80 border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Solidity Hash Commitment Matching:</span>
                  </div>
                  <pre className="text-[10px] text-emerald-300 bg-slate-950 p-2 rounded border border-emerald-500/20 overflow-x-auto">
                    {`keccak256(abi.encodePacked(uint8[100] flatBoard, bytes32 salt))`}
                  </pre>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    By committing the Keccak256 hash prior to round 1, neither player can alter ship locations or fake torpedo misses. The secret salt ensures the board layout cannot be brute-forced via rainbow tables.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CryptoProofPanel;

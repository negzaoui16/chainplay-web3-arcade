"use client";

/**
 * ChainPlay - Dynamic Network & Environment Banner
 *
 * Displays below the Navbar to inform users of the active execution mode:
 * 1. Mock Local Mode: Sleek informative banner indicating zero-gas gameplay,
 *    Smart Bot AI, or 2-Tab P2P synchronization with a 1-click CTA to open Tab 2.
 * 2. Unsupported EVM Network: Critical warning banner prompting the player to switch
 *    to Sepolia or Arbitrum Sepolia via Wagmi `useSwitchChain`.
 * 3. Live Supported Network: Subtle indicator confirming smart contract escrow is active.
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import {
  Zap,
  AlertTriangle,
  ExternalLink,
  X,
  Copy,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/useAppStore";
import { useChainPlayMode } from "@/hooks/useChainPlayMode";
import { CHAIN_IDS } from "@/config/constants";
import { soundEffects } from "@/lib/utils/soundEffects";

export function NetworkBanner(): JSX.Element | null {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const { isMock, isLiveOnChain, contractsAvailable, activeChainId } =
    useChainPlayMode();
  const mockSubMode = useAppStore((s) => s.mockSubMode);
  const setMockMode = useAppStore((s) => s.setMockMode);

  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const { isConnected } = useAccount();

  // If dismissed by user, do not show
  if (isDismissed) {
    return null;
  }

  // --------------------------------------------------------------------------
  // Case 1: Local Mock Mode Active
  // --------------------------------------------------------------------------
  if (isMock) {
    const handleOpenSecondTab = (): void => {
      soundEffects.playTileClick();
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "2");
        window.open(url.toString(), "_blank");
      }
    };

    const handleCopyTab2Link = (): void => {
      soundEffects.playTileClick();
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", "2");
        void navigator.clipboard.writeText(url.toString()).then(() => {
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        });
      }
    };

    return (
      <aside aria-label="Environment notification">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative w-full border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-amber-500/10 backdrop-blur-md px-4 py-2 text-xs"
        >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-300 font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong className="font-extrabold tracking-wide uppercase">
                Local Mock Mode Active
              </strong>{" "}
              — Play against Smart Bot or open a second tab with{" "}
              <code className="px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 font-mono text-amber-200">
                ?tab=2
              </code>{" "}
              for 1v1 P2P sync. Zero gas needed.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {mockSubMode === "p2p" ? (
              <>
                <button
                  type="button"
                  onClick={handleOpenSecondTab}
                  className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Launch Tab 2</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyTab2Link}
                  className="p-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all"
                  title="Copy Tab 2 URL"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundEffects.playTileClick();
                  setMockMode(false);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium transition-all"
              >
                Go On-Chain
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        </motion.div>
      </aside>
    );
  }

  // --------------------------------------------------------------------------
  // Case 2: Live Mode on Unsupported EVM Network
  // --------------------------------------------------------------------------
  const isSupportedChain =
    activeChainId === CHAIN_IDS.HEDERA_TESTNET ||
    activeChainId === CHAIN_IDS.SEPOLIA ||
    activeChainId === CHAIN_IDS.ARBITRUM_SEPOLIA ||
    activeChainId === CHAIN_IDS.HARDHAT;

  if (isLiveOnChain && isConnected && (!isSupportedChain || !contractsAvailable)) {
    return (
      <aside aria-label="Network warning">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative w-full border-b border-rose-500/40 bg-gradient-to-r from-rose-950/80 via-slate-900/95 to-rose-950/80 backdrop-blur-md px-4 py-2.5 text-xs shadow-[0_0_20px_rgba(244,63,94,0.2)]"
        >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            <span>
              <strong className="font-extrabold uppercase">
                Unsupported Network (Chain ID: {activeChainId})
              </strong>{" "}
              — Please switch to Hedera Testnet (Chain ID 296) to interact with the deployed CPT and TokenManager contracts.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isSwitchingChain}
              onClick={() => {
                soundEffects.playTileClick();
                switchChain?.({ chainId: CHAIN_IDS.HEDERA_TESTNET });
              }}
              className="px-3 py-1 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isSwitchingChain ? "Switching..." : "Switch to Hedera Testnet"}
            </button>
            <button
              type="button"
              disabled={isSwitchingChain}
              onClick={() => {
                soundEffects.playTileClick();
                switchChain?.({ chainId: CHAIN_IDS.SEPOLIA });
              }}
              className="px-3 py-1 rounded-md bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {isSwitchingChain ? "Switching..." : "Switch to Sepolia"}
            </button>

            <button
              type="button"
              disabled={isSwitchingChain}
              onClick={() => {
                soundEffects.playTileClick();
                switchChain?.({ chainId: CHAIN_IDS.ARBITRUM_SEPOLIA });
              }}
              className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold transition-all disabled:opacity-50"
            >
              Arbitrum Sepolia
            </button>
          </div>
        </div>
        </motion.div>
      </aside>
    );
  }

  // --------------------------------------------------------------------------
  // Case 3: Live Mode on Supported Network (Subtle Status)
  // --------------------------------------------------------------------------
  return null;
}

export default NetworkBanner;
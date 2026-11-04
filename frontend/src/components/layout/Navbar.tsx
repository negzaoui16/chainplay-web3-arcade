"use client";

/**
 * ChainPlay - Responsive Cyberpunk Web3 Navbar
 *
 * Provides:
 * - High-craft Dark Web3 Arcade header with neon gradients and glassmorphism
 * - ChainPlay branding with glowing animated logo
 * - Responsive desktop & mobile navigation links (Arenas, Lobby, Profile)
 * - Real-time Unclaimed Rewards pill linking to /profile
 * - Mock Local vs On-Chain mode switcher with Bot/P2P sub-mode selector
 * - Sound FX volume and mute toggle with synthesized audio feedback
 * - RainbowKit Web3 ConnectButton customized with cyber glassmorphism
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Gamepad2,
  Volume2,
  VolumeX,
  Zap,
  Link2,
  Bot,
  Users,
  Coins,
  ChevronDown,
  Menu,
  X,
  Sparkles,
  ArrowRightLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAppStore,
  MOCK_PLAYER_1_ADDRESS,
} from "@/store/useAppStore";
import { useRewardManager } from "@/hooks/useRewardManager";
import { formatEther } from "@/lib/utils/formatters";
import { soundEffects } from "@/lib/utils/soundEffects";

export interface NavItem {
  readonly label: string;
  readonly href: string;
  readonly badge?: string;
  readonly isExternal?: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Arenas", href: "/#arenas" },
  { label: "Lobby", href: "/lobby" },
  { label: "Leaderboard & Profile", href: "/profile" },
] as const;

export function Navbar(): JSX.Element {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [mockDropdownOpen, setMockDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // App store selectors
  const isMockMode = useAppStore((s) => s.isMockMode);
  const mockSubMode = useAppStore((s) => s.mockSubMode);
  const soundEnabled = useAppStore((s) => s.soundEnabled);
  const mockPlayerAddress = useAppStore((s) => s.mockPlayerAddress);
  const setMockMode = useAppStore((s) => s.setMockMode);
  const setMockSubMode = useAppStore((s) => s.setMockSubMode);
  const toggleSound = useAppStore((s) => s.toggleSound);
  const switchMockPlayerRole = useAppStore((s) => s.switchMockPlayerRole);

  // Rewards hook
  const { rewardStats } = useRewardManager();
  const hasClaimableRewards = rewardStats.claimableWei > 0n;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setMockDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isPlayer1 =
    mockPlayerAddress.toLowerCase() === MOCK_PLAYER_1_ADDRESS.toLowerCase();

  const handleNavClick = (): void => {
    soundEffects.playTileClick();
    setMobileMenuOpen(false);
  };

  const handleToggleSound = (): void => {
    toggleSound();
    if (!soundEnabled) {
      // About to enable sound -> play feedback chirp
      soundEffects.playMatchChime();
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#07090E]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* ======================================================== */}
          {/* Left: Brand Logo & Navigation Links                     */}
          {/* ======================================================== */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              onClick={handleNavClick}
              className="group flex items-center gap-3 transition-transform duration-200 hover:scale-[1.02]"
            >
              {/* Glowing Icon Badge */}
              <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 via-amber-400 to-pink-500 p-[1.5px] shadow-cyan-glow group-hover:shadow-cyan-glow-lg transition-shadow">
                <div className="w-full h-full bg-[#07090E] rounded-[10px] flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-cyan-400 animate-pulse-slow" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full" />
              </div>

              {/* Title Typography */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-500 font-mono">
                    CHAINPLAY
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold tracking-wider">
                    v1
                  </span>
                </div>
                <span className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
                  Web3 Arcade Arenas
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:text-cyan-300 hover:bg-slate-800/60 transition-all duration-150 flex items-center gap-2 group"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </div>

          {/* ======================================================== */}
          {/* Right: Controls & Web3 Wallet                            */}
          {/* ======================================================== */}
          <div className="hidden md:flex items-center gap-3">
            {/* Unclaimed Rewards Pill */}
            {hasClaimableRewards && (
              <Link
                href="/profile"
                onClick={handleNavClick}
                className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/50 text-amber-300 shadow-amber-glow hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all duration-200"
                title="Claim Pending Rewards in Profile"
              >
                <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
                <span className="text-xs font-mono font-bold tracking-tight">
                  +{formatEther(rewardStats.claimableWei, 3)} ETH
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-amber-400 text-black px-1.5 py-0.2 rounded-full">
                  Claim
                </span>
              </Link>
            )}

            {/* Mock Local vs On-Chain Mode Switcher */}
            <div className="flex items-center p-0.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  if (!isMockMode) {
                    setMockMode(true);
                    soundEffects.playTileClick();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                  isMockMode
                    ? "bg-gradient-to-r from-amber-500/30 to-amber-400/20 text-amber-300 border border-amber-500/60 shadow-amber-glow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Activate Local Mock Mode (Zero Gas, Instant Test Matches)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Mock</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isMockMode) {
                    setMockMode(false);
                    soundEffects.playTileClick();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                  !isMockMode
                    ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/20 text-cyan-300 border border-cyan-500/60 shadow-cyan-glow"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Activate Live On-Chain Smart Contracts"
              >
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>On-Chain</span>
              </button>
            </div>

            {/* In Mock Mode: Sub-Mode Selector (Smart Bot vs P2P Cross-Tab) */}
            {isMockMode && (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playTileClick();
                    setMockDropdownOpen((prev) => !prev);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/70 hover:border-slate-600 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
                >
                  {mockSubMode === "bot" ? (
                    <>
                      <Bot className="w-3.5 h-3.5 text-cyan-400" />
                      <span>vs Smart Bot</span>
                    </>
                  ) : (
                    <>
                      <Users className="w-3.5 h-3.5 text-pink-400" />
                      <span>2-Tab P2P ({isPlayer1 ? "P1" : "P2"})</span>
                    </>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                <AnimatePresence>
                  {mockDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 p-2 rounded-xl bg-slate-900/95 border border-slate-800 backdrop-blur-xl shadow-2xl z-50 flex flex-col gap-1 text-xs"
                    >
                      <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                        Mock Opponent Engine
                      </div>

                      {/* Bot Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setMockSubMode("bot");
                          soundEffects.playTileClick();
                          setMockDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                          mockSubMode === "bot"
                            ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-cyan-400" />
                          <div className="flex flex-col text-left">
                            <span className="font-semibold">Smart Bot AI</span>
                            <span className="text-[10px] text-slate-400">
                              Instant single-player AI opponent
                            </span>
                          </div>
                        </div>
                        {mockSubMode === "bot" && (
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                      </button>

                      {/* Cross-Tab P2P Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setMockSubMode("p2p");
                          soundEffects.playTileClick();
                          setMockDropdownOpen(false);
                        }}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg transition-colors ${
                          mockSubMode === "p2p"
                            ? "bg-pink-500/15 text-pink-300 border border-pink-500/30"
                            : "text-slate-300 hover:bg-slate-800/70 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-pink-400" />
                          <div className="flex flex-col text-left">
                            <span className="font-semibold">2-Tab P2P Sync</span>
                            <span className="text-[10px] text-slate-400">
                              Play across 2 browser tabs (?tab=2)
                            </span>
                          </div>
                        </div>
                        {mockSubMode === "p2p" && (
                          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                        )}
                      </button>

                      {/* Switch Mock Player Role */}
                      {mockSubMode === "p2p" && (
                        <div className="mt-1 pt-1.5 border-t border-slate-800 flex items-center justify-between px-2 py-1">
                          <span className="text-[11px] text-slate-400">
                            Current Role:{" "}
                            <span className="font-bold text-white">
                              {isPlayer1 ? "Player 1 (Host)" : "Player 2 (Challenger)"}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              switchMockPlayerRole();
                              soundEffects.playTileClick();
                            }}
                            className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                            title="Swap active mock address role between 0x1111 and 0x2222"
                          >
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Switch</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Sound FX Mute Toggle Button */}
            <button
              type="button"
              onClick={handleToggleSound}
              className={`p-2 rounded-full border transition-all duration-150 ${
                soundEnabled
                  ? "bg-slate-900 border-cyan-500/40 text-cyan-400 hover:bg-slate-800 hover:border-cyan-400 shadow-cyan-glow"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700"
              }`}
              title={soundEnabled ? "Mute Arcade SFX" : "Unmute Arcade SFX"}
              aria-label="Toggle sound effects"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>

            {/* RainbowKit ConnectButton Custom Cyber Styling */}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                if (!ready) {
                  return (
                    <div
                      aria-hidden="true"
                      className="h-10 w-28 rounded-full bg-slate-900/60 border border-slate-800 animate-pulse"
                    />
                  );
                }

                if (!connected) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTileClick();
                        openConnectModal();
                      }}
                      className="relative group px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black font-extrabold text-xs tracking-wider uppercase transition-all duration-200 shadow-cyan-glow hover:shadow-cyan-glow-lg flex items-center gap-2"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Connect Wallet</span>
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playError();
                        openChainModal();
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/60 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition-all shadow-[0_0_15px_rgba(244,63,94,0.35)] flex items-center gap-1.5"
                    >
                      <span>Wrong Network</span>
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-2">
                    {/* Chain Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTileClick();
                        openChainModal();
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-cyan-500/60 text-xs font-semibold text-slate-300 transition-all"
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        <img
                          alt={chain.name ?? "Chain icon"}
                          src={chain.iconUrl}
                          className="w-3.5 h-3.5 rounded-full"
                        />
                      )}
                      <span className="hidden sm:inline">{chain.name}</span>
                    </button>

                    {/* Account Pill */}
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playTileClick();
                        openAccountModal();
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 text-xs font-mono font-bold transition-all shadow-cyan-glow"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{account.displayName}</span>
                    </button>
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>

          {/* ======================================================== */}
          {/* Mobile Menu Toggle Button                                */}
          {/* ======================================================== */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
              aria-label="Toggle sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEffects.playTileClick();
                setMobileMenuOpen((prev) => !prev);
              }}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:text-white"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Mobile Drawer Navigation                                 */}
      {/* ======================================================== */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-800 bg-[#07090E]/95 backdrop-blur-xl px-4 py-4 flex flex-col gap-3"
          >
            {/* Navigation Links */}
            <div className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-200 hover:text-cyan-300 hover:bg-slate-900 flex items-center justify-between"
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>

            {/* Unclaimed Rewards Mobile Pill */}
            {hasClaimableRewards && (
              <Link
                href="/profile"
                onClick={handleNavClick}
                className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-300 shadow-amber-glow"
              >
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span className="text-xs font-bold">Unclaimed Rewards</span>
                </div>
                <span className="text-sm font-mono font-extrabold text-amber-400">
                  +{formatEther(rewardStats.claimableWei, 3)} ETH
                </span>
              </Link>
            )}

            {/* Mock vs On-Chain Mobile Toggle */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-semibold text-slate-300">
                Network Mode
              </span>
              <div className="flex items-center p-0.5 rounded-full bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMockMode(true);
                    soundEffects.playTileClick();
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                    isMockMode
                      ? "bg-amber-500/30 text-amber-300 border border-amber-500/60"
                      : "text-slate-400"
                  }`}
                >
                  Mock
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMockMode(false);
                    soundEffects.playTileClick();
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                    !isMockMode
                      ? "bg-cyan-500/30 text-cyan-300 border border-cyan-500/60"
                      : "text-slate-400"
                  }`}
                >
                  On-Chain
                </button>
              </div>
            </div>

            {/* Connect Wallet in Mobile */}
            <div className="pt-2">
              <ConnectButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export default Navbar;
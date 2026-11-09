"use client";

/**
 * ChainPlay - Decentralized Arcade Arenas Landing Page
 *
 * Provides the flagship Cyberpunk Web3 Arcade experience:
 * - High-impact animated Hero banner with neon typography & glassmorphism
 * - Protocol summary stats (Total Staked, Matches Battled, Active Arenas)
 * - Hero Game Selector Cards (Tic-Tac-Toe, Battleship, Memory Duel)
 * - Live Open Lobbies preview table with instant join actions
 * - Trust pillars: ZK cryptography, escrow guarantees, instant settlements
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Swords,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  PlusCircle,
  Coins,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useAccount } from "wagmi";
import { useHederaTokenManager } from "@/hooks/useHederaTokenManager";
import { GameType } from "@/types/lobby.types";
import { GameSelectorCards } from "@/components/lobby/GameSelectorCards";
import { CreateRoomModal } from "@/components/lobby/CreateRoomModal";
import { RoomListTable } from "@/components/lobby/RoomListTable";
import { useLobbyStore } from "@/store/useLobbyStore";
import { soundEffects } from "@/lib/utils/soundEffects";

export default function HomePage(): JSX.Element {
  const rooms = useLobbyStore((s) => s.rooms);
  const { address } = useAccount();
  const { refreshBalances } = useHederaTokenManager();

  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameType>(
    GameType.TIC_TAC_TOE
  );
  const [copiedContract, setCopiedContract] = useState<boolean>(false);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState<boolean>(false);
  const [faucetMessage, setFaucetMessage] = useState<string | null>(null);

  const openRoomsCount = rooms.filter((r) => r.status === 0).length;

  const handleOpenCreateModal = (gameType: GameType = GameType.TIC_TAC_TOE): void => {
    soundEffects.playTileClick();
    setSelectedGameForModal(gameType);
    setCreateModalOpen(true);
  };

  const handleCopyContract = (): void => {
    soundEffects.playTileClick();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText("0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a").then(() => {
        setCopiedContract(true);
        setTimeout(() => setCopiedContract(false), 2000);
      });
    }
  };

  const handleAddTokenToMetaMask = async (): Promise<void> => {
    if (typeof window !== "undefined" && (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum) {
      try {
        soundEffects.playTileClick();
        await (window as unknown as { ethereum: { request: (args: unknown) => Promise<unknown> } }).ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: "0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a",
              symbol: "CPT",
              decimals: 18,
            },
          },
        });
      } catch (err) {
        console.warn("Failed to add CPT to MetaMask:", err);
      }
    }
  };

  const handleClaimFaucet = async (): Promise<void> => {
    const targetAddress = address || "0x94DbD1F0843E9A07E173Fdc60540Cb830E053CDE";
    setIsClaimingFaucet(true);
    setFaucetMessage(null);
    try {
      soundEffects.playTileClick();
      const res = await fetch("/api/faucet/claim-cpt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerAddress: targetAddress }),
      });
      const data = await res.json();
      if (data.success) {
        soundEffects.playVictory();
        setFaucetMessage("Claimed +500 CPT!");
        await refreshBalances();
        setTimeout(() => setFaucetMessage(null), 3500);
      } else {
        setFaucetMessage(data.error || "Failed");
        soundEffects.playError();
        setTimeout(() => setFaucetMessage(null), 3500);
      }
    } catch {
      setFaucetMessage("Error");
      soundEffects.playError();
      setTimeout(() => setFaucetMessage(null), 3500);
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center">
      {/* ======================================================== */}
      {/* 1. Hero Section                                          */}
      {/* ======================================================== */}
      <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 flex flex-col items-center text-center overflow-hidden">
        {/* Neon Ambient Background Blurs */}
        <div className="absolute top-10 left-1/4 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-20 right-1/4 translate-x-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Protocol Version Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider uppercase mb-6 shadow-cyan-glow"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Gen Decentralized 1v1 PvP Gaming</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white font-mono uppercase max-w-5xl leading-[1.1]"
        >
          Stake CPT.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-amber-300 to-pink-500">
            Outplay Rivals.
          </span>{" "}
          Claim Hedera Escrow.
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed"
        >
          Battle live opponents in Tic-Tac-Toe, ZK-verified Battleship, and
          Memory Duel. Zero counterparty risk, guaranteed smart contract
          payouts, and anti-abandonment game protection.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/lobby"
            onClick={() => soundEffects.playTileClick()}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-cyan-glow hover:shadow-cyan-glow-lg flex items-center justify-center gap-2"
          >
            <Swords className="w-4 h-4" />
            <span>Enter Matchmaking Lobby</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            <span>Create New Arena</span>
          </button>
        </motion.div>

        {/* ======================================================== */}
        {/* Hedera Testnet & CPT Token Portal Box                    */}
        {/* ======================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-8 w-full max-w-4xl p-5 rounded-2xl bg-gradient-to-r from-[#101726]/95 via-[#0B101D]/95 to-[#101726]/95 border border-cyan-500/50 backdrop-blur-xl shadow-cyan-glow flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Hedera Testnet Token Hub
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  Chain ID 296
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5 flex-wrap">
                <span>CPT Contract:</span>
                <code className="text-cyan-300 select-all font-bold">
                  0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap justify-end shrink-0">
            {/* 1-Click Add to MetaMask */}
            <button
              type="button"
              onClick={handleAddTokenToMetaMask}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              title="Import CPT Token directly into MetaMask"
            >
              <span>🦊 Add CPT to MetaMask</span>
            </button>

            {/* Claim 500 CPT Faucet */}
            <button
              type="button"
              disabled={isClaimingFaucet}
              onClick={handleClaimFaucet}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isClaimingFaucet ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{faucetMessage || "Get 500 CPT Faucet"}</span>
                </>
              )}
            </button>

            {/* Copy Address */}
            <button
              type="button"
              onClick={handleCopyContract}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
              title="Copy CPT Token Contract Address"
            >
              {copiedContract ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* HashScan Explorer Link */}
            <a
              href="https://hashscan.io/testnet/contract/0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-cyan-400 transition-all"
              title="View Contract on HashScan Explorer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* Quick Stats Banner                                       */}
        {/* ======================================================== */}
        <div className="w-full max-w-4xl mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
              3
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mt-1">
              Live Arenas
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-pink-400 font-mono">
              {openRoomsCount}
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mt-1">
              Open Lobbies
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
              2.5%
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mt-1">
              Protocol Fee
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md flex flex-col items-center">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
              100%
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mt-1">
              ZK & Escrow Audited
            </span>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. Arenas Selection Section                              */}
      {/* ======================================================== */}
      <section
        id="arenas"
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-20"
      >
        <div className="flex flex-col items-center text-center mb-12">
          <span className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-400 mb-2">
            Select Your Battlefield
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white font-mono uppercase tracking-wide">
            Arcade Arenas
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mt-2">
            Choose between rapid tactical duels, cryptographic naval strategy,
            or high-stakes pattern recall.
          </p>
        </div>

        <GameSelectorCards
          onOpenCreateModal={(gt) => handleOpenCreateModal(gt)}
        />
      </section>

      {/* ======================================================== */}
      {/* 3. Live Open Lobbies Preview                             */}
      {/* ======================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xl sm:text-2xl font-black text-white font-mono uppercase">
                Active Open Lobbies
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Join an open match instantly with one click and stake your CPT
            </p>
          </div>

          <Link
            href="/lobby"
            onClick={() => soundEffects.playTileClick()}
            className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>View All Matchmaking</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <RoomListTable
          limit={5}
          showFilters={false}
          onOpenCreateModal={() => handleOpenCreateModal()}
        />
      </section>

      {/* ======================================================== */}
      {/* 4. Trust Pillars & Cryptography Section                  */}
      {/* ======================================================== */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#0D121F]/80 border border-slate-800/90 backdrop-blur-md flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-cyan-glow">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-mono uppercase">
              Decentralized Escrow
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Wagers are locked in verified Solidity smart contracts. Funds
              never touch intermediaries and are paid out automatically to the
              victor.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D121F]/80 border border-slate-800/90 backdrop-blur-md flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-950/60 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-magenta-glow">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-mono uppercase">
              Poseidon Cryptography
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              In Battleship, secret fleet coordinates are committed using
              cryptographic hash proofs, making cheating mathematically
              impossible.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#0D121F]/80 border border-slate-800/90 backdrop-blur-md flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-amber-glow">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-mono uppercase">
              Timeout Protection
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              60-second turn clocks prevent stalled games. If an opponent
              disconnects or abandons the match, you can claim victory and all
              staked funds.
            </p>
          </div>
        </div>
      </section>

      {/* Create Room Modal */}
      <CreateRoomModal
        isOpen={createModalOpen}
        defaultGameType={selectedGameForModal}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}

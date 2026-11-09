import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { Web3Providers } from "@/components/providers/Web3Providers";
import { Navbar } from "@/components/layout/Navbar";
import { NetworkBanner } from "@/components/layout/NetworkBanner";
import Link from "next/link";
import { Gamepad2, ShieldCheck, Zap, GitFork } from "lucide-react";

export const metadata: Metadata = {
  title: "ChainPlay - Web3 Arcade Arenas",
  description:
    "Decentralized 1v1 on-chain arcade gaming. Stake CPT, outplay opponents in Tic-Tac-Toe, Battleship, and Memory Duel, and claim instant smart contract payouts.",
  keywords: [
    "Web3",
    "Ethereum",
    "Smart Contract Gaming",
    "PvP Arcade",
    "Zero Knowledge Battleship",
    "Decentralized Escrow",
  ],
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090E] text-slate-100 antialiased min-h-screen flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
        <Web3Providers>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <NetworkBanner />
            <main className="flex-1 w-full flex flex-col">{children}</main>

            {/* Cyberpunk Arcade Footer */}
            <footer className="border-t border-slate-800/80 bg-[#07090E]/90 backdrop-blur-md py-8 px-4 sm:px-6 lg:px-8 mt-auto">
              <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 p-[1px] flex items-center justify-center">
                    <div className="w-full h-full bg-[#07090E] rounded-[7px] flex items-center justify-center">
                      <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-200 font-mono tracking-wider">
                      CHAINPLAY
                    </span>
                    <span className="text-slate-500 ml-2">
                      Decentralized 1v1 PvP Gaming Protocol
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5 text-emerald-400/90">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Audited Escrow Contracts</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-400/90">
                    <Zap className="w-4 h-4" />
                    <span>Instant Payouts</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-pink-400/90">
                    <GitFork className="w-4 h-4" />
                    <span>ZK/Poseidon Verified</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-500">
                  <Link
                    href="/#arenas"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Arenas
                  </Link>
                  <Link
                    href="/lobby"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Matchmaking
                  </Link>
                  <Link
                    href="/profile"
                    className="hover:text-cyan-400 transition-colors"
                  >
                    Profile & Rewards
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </Web3Providers>
      </body>
    </html>
  );
}

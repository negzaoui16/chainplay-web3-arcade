"use client";

/**
 * ChainPlay - Offensive Naval Radar Grid (Enemy Waters)
 *
 * 10x10 Tactical Targeting Grid featuring:
 * - Cyberpunk CRT radar sweep & concentric sonar circles
 * - Targeting reticle crosshair with coordinate indicator
 * - Lock-on state with amber/cyan corner brackets
 * - Visual hit (burning crater / explosion) and miss (water splash) records
 * - "Launch Torpedo" CTA with keyboard 'Enter' / 'Space' shortcut support
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Crosshair,
  Flame,
  Droplets,
  Target,
  Loader2,
  Radio,
} from "lucide-react";
import { motion } from "framer-motion";
import type {
  Coordinate,
  ShotRecord,
  ShipId,
} from "@/types/battleship.types";
import { playTileClick, playTorpedo } from "@/lib/utils/soundEffects";

const COL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
const ROW_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface OffensiveRadarGridProps {
  /**
   * Shots fired by the player on the enemy's grid
   */
  readonly shots: ShotRecord[];

  /**
   * Currently locked-on target coordinate
   */
  readonly selectedTarget: Coordinate | null;

  /**
   * Callback fired when a target cell is selected
   */
  readonly onSelectTarget: (coord: Coordinate) => void;

  /**
   * Callback fired when the torpedo is launched
   */
  readonly onFire: (coord: Coordinate) => void;

  /**
   * Whether it is currently the local player's turn to shoot
   */
  readonly isMyTurn: boolean;

  /**
   * Whether torpedo firing transaction or optimistic action is pending
   */
  readonly isFiring?: boolean;

  /**
   * Opponent ships already sunk
   */
  readonly opponentSunkShips?: ShipId[];

  /**
   * Whether the grid is disabled
   */
  readonly disabled?: boolean;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

export function OffensiveRadarGrid({
  shots,
  selectedTarget,
  onSelectTarget,
  onFire,
  isMyTurn,
  isFiring = false,
  opponentSunkShips = [],
  disabled = false,
  className = "",
}: OffensiveRadarGridProps): React.JSX.Element {
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);

  // Map of fired shots by "x,y"
  const shotMap = useMemo(() => {
    const map = new Map<string, ShotRecord>();
    for (const shot of shots) {
      map.set(`${shot.x},${shot.y}`, shot);
    }
    return map;
  }, [shots]);

  // Firing action handler
  const handleLaunchTorpedo = useCallback(() => {
    if (!selectedTarget || !isMyTurn || isFiring || disabled) return;
    playTorpedo();
    onFire(selectedTarget);
  }, [selectedTarget, isMyTurn, isFiring, disabled, onFire]);

  // Keyboard shortcut: Press Enter or Space to fire at selected target
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isMyTurn || isFiring || disabled || !selectedTarget) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleLaunchTorpedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMyTurn, isFiring, disabled, selectedTarget, handleLaunchTorpedo]);

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (disabled || isFiring) return;
      const alreadyFired = shotMap.has(`${x},${y}`);
      if (alreadyFired) return;

      playTileClick();
      onSelectTarget({ x, y });
    },
    [disabled, isFiring, shotMap, onSelectTarget]
  );

  return (
    <div
      className={`flex flex-col items-center select-none bg-[#030e0c]/90 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md relative overflow-hidden ${className}`}
    >
      {/* CRT Scanline & Radar Radial Sweep Overlays */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* Rotating Conic Sonar Beam */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
          className="w-[120%] h-[120%] rounded-full opacity-30"
          style={{
            background:
              "conic-gradient(from 0deg, transparent 0deg, transparent 280deg, rgba(16, 185, 129, 0.4) 360deg)",
          }}
        />
      </div>

      {/* Concentric Sonar Circles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[82%] h-[82%] rounded-full border border-emerald-500/15" />
        <div className="w-[58%] h-[58%] rounded-full border border-emerald-500/20" />
        <div className="w-[32%] h-[32%] rounded-full border border-emerald-500/25" />
      </div>

      {/* Radar Header */}
      <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-emerald-500/30 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-black tracking-widest text-emerald-300 uppercase flex items-center gap-2">
            Offensive Sonar Radar
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-normal">
              CRT ACTIVE
            </span>
          </span>
        </div>

        {/* Selected Target Badge */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          {selectedTarget ? (
            <span className="text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 font-bold flex items-center gap-1">
              <Crosshair className="w-3 h-3 animate-spin-slow" />
              LOCKED: [{COL_LABELS[selectedTarget.x]} - {selectedTarget.y + 1}]
            </span>
          ) : (
            <span className="text-emerald-500/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/20">
              SCANNING TARGETS...
            </span>
          )}
        </div>
      </div>

      {/* 10x10 Radar Board */}
      <div className="relative inline-block z-10">
        {/* Top Header: Columns A - J */}
        <div className="grid grid-cols-[28px_repeat(10,minmax(28px,36px))] mb-1">
          <div className="w-7 h-6" /> {/* Corner Empty */}
          {COL_LABELS.map((col) => (
            <div
              key={col}
              className="h-6 flex items-center justify-center font-mono text-[11px] font-bold text-emerald-400/80"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Board Rows with Left Numbers 1 - 10 */}
        <div
          className="flex flex-col gap-[3px]"
          onMouseLeave={() => setHoverCoord(null)}
        >
          {ROW_LABELS.map((rowNum, rowIndex) => (
            <div
              key={rowNum}
              className="grid grid-cols-[28px_repeat(10,minmax(28px,36px))] gap-[3px] items-center"
            >
              {/* Row Number */}
              <div className="w-7 flex items-center justify-center font-mono text-[11px] font-bold text-emerald-400/80">
                {rowNum}
              </div>

              {/* 10 Radar Cells */}
              {COL_LABELS.map((_, colIndex) => {
                const x = colIndex;
                const y = rowIndex;
                const cellKey = `${x},${y}`;

                const shot = shotMap.get(cellKey);
                const isSelected =
                  selectedTarget?.x === x && selectedTarget?.y === y;
                const isHovered = hoverCoord?.x === x && hoverCoord?.y === y;
                const alreadyFired = Boolean(shot);

                let cellBg =
                  "bg-emerald-950/20 border-emerald-500/25 hover:border-emerald-400/70 hover:bg-emerald-500/20";
                let content: React.ReactNode = null;

                if (shot) {
                  if (shot.result === "HIT" || shot.result === "SUNK") {
                    cellBg =
                      "bg-rose-950/90 border-rose-500 shadow-md shadow-rose-500/40 text-rose-300";
                    content = (
                      <Flame className="w-4 h-4 text-rose-400 fill-rose-500" />
                    );
                  } else {
                    // Miss
                    cellBg =
                      "bg-slate-900/60 border-slate-700/50 text-slate-500 opacity-60";
                    content = (
                      <Droplets className="w-3.5 h-3.5 text-blue-400/60" />
                    );
                  }
                } else if (isSelected) {
                  cellBg =
                    "bg-amber-500/30 border-amber-400 shadow-lg shadow-amber-500/40 text-amber-300";
                  content = (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-amber-400 animate-pulse" />
                      {/* Tactical Reticle Corner Accents */}
                      <span className="absolute top-0.5 left-0.5 w-1 h-1 border-t border-l border-amber-300" />
                      <span className="absolute top-0.5 right-0.5 w-1 h-1 border-t border-r border-amber-300" />
                      <span className="absolute bottom-0.5 left-0.5 w-1 h-1 border-b border-l border-amber-300" />
                      <span className="absolute bottom-0.5 right-0.5 w-1 h-1 border-b border-r border-amber-300" />
                    </div>
                  );
                } else if (isHovered && isMyTurn && !disabled) {
                  cellBg =
                    "bg-emerald-500/25 border-emerald-400 text-emerald-300";
                  content = (
                    <Crosshair className="w-3.5 h-3.5 text-emerald-400/80 animate-spin-slow" />
                  );
                }

                return (
                  <motion.div
                    key={cellKey}
                    whileHover={{
                      scale: !alreadyFired && !disabled ? 1.08 : 1,
                    }}
                    onMouseEnter={() => {
                      if (!alreadyFired && !disabled) {
                        setHoverCoord({ x, y });
                      }
                    }}
                    onClick={() => handleCellClick(x, y)}
                    className={`aspect-square w-full rounded-md border flex items-center justify-center transition-all ${cellBg} ${
                      !alreadyFired && !disabled ? "cursor-crosshair" : "cursor-not-allowed"
                    }`}
                  >
                    {content}
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Target Launch Command Strip */}
      <div className="w-full mt-4 pt-3 border-t border-emerald-500/30 flex flex-col gap-2 relative z-10">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>
              {isMyTurn
                ? "RADAR STATUS: LOCKED & READY"
                : "RADAR STATUS: WAITING FOR ENEMY SHOT..."}
            </span>
          </div>

          <div className="text-[10px] font-mono text-slate-400">
            SUNK: {opponentSunkShips.length}/5 WARSHIPS
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleLaunchTorpedo}
          disabled={!selectedTarget || !isMyTurn || isFiring || disabled}
          className={`w-full py-3 px-4 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
            selectedTarget && isMyTurn && !isFiring && !disabled
              ? "bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 shadow-rose-500/30 hover:shadow-rose-500/50 cursor-pointer active:scale-[0.99]"
              : "bg-slate-900/80 border border-slate-800 text-slate-600 cursor-not-allowed"
          }`}
        >
          {isFiring ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Torpedo in Flight...</span>
            </>
          ) : (
            <>
              <Target className="w-4 h-4" />
              <span>
                {selectedTarget
                  ? `Launch Torpedo At [${COL_LABELS[selectedTarget.x]}-${selectedTarget.y + 1}]`
                  : "Select Target Coordinate"}
              </span>
              {selectedTarget && isMyTurn && (
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-950/30 border border-slate-950/40 rounded text-slate-950">
                  ENTER
                </kbd>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default OffensiveRadarGrid;

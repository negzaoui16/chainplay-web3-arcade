"use client";

/**
 * ChainPlay - Battleship Fleet Placement Dock
 *
 * Interactive fleet deployment dock allowing players to:
 * - Select and inspect 5 naval warships (Carrier, Battleship, Cruiser, Submarine, Destroyer)
 * - Toggle placement orientation (Horizontal / Vertical) via button or 'R' keyboard shortcut
 * - Drag or click-to-select warships for deployment onto the defensive grid
 * - Instant random auto-deployment ("Auto-Deploy Fleet")
 * - Clear and reset fleet configuration
 * - Generate cryptographic Keccak256 commitment hash and lock fleet
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useEffect, useCallback } from "react";
import {
  RotateCcw,
  Shuffle,
  ShieldAlert,
  Lock,
  Loader2,
  Anchor,
  Compass,
  CheckCircle2,
  Ship,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FLEET_LIST, TOTAL_SHIP_CELLS } from "@/config/constants";
import type {
  ShipId,
  ShipOrientation,
  ShipPlacement,
} from "@/types/battleship.types";
import { playTileClick } from "@/lib/utils/soundEffects";

export interface FleetPlacementDockProps {
  /**
   * Currently active/selected ship awaiting placement
   */
  readonly selectedShipId: ShipId | null;

  /**
   * Callback fired when a ship is selected
   */
  readonly onSelectShip: (id: ShipId) => void;

  /**
   * Current deployment orientation
   */
  readonly orientation: ShipOrientation;

  /**
   * Callback fired when orientation is toggled
   */
  readonly onToggleOrientation: () => void;

  /**
   * Placed ships array
   */
  readonly ships: ShipPlacement[];

  /**
   * Callback to trigger randomized fleet deployment
   */
  readonly onAutoDeploy: () => void;

  /**
   * Callback to clear all placed ships
   */
  readonly onClearFleet?: () => void;

  /**
   * Callback to commit fleet to cryptographic vault
   */
  readonly onCommitFleet: () => void;

  /**
   * Whether cryptographic commit transaction or hash generation is in progress
   */
  readonly isCommitting?: boolean;

  /**
   * Whether the current fleet configuration passes 100% of placement rules
   */
  readonly isValidFleet: boolean;

  /**
   * Validation error message if fleet is invalid
   */
  readonly validationError?: string;

  /**
   * Whether the dock controls are disabled
   */
  readonly disabled?: boolean;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

export function FleetPlacementDock({
  selectedShipId,
  onSelectShip,
  orientation,
  onToggleOrientation,
  ships,
  onAutoDeploy,
  onClearFleet,
  onCommitFleet,
  isCommitting = false,
  isValidFleet,
  validationError,
  disabled = false,
  className = "",
}: FleetPlacementDockProps): React.JSX.Element {
  // Listen for 'R' or 'r' key to toggle ship orientation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled || isCommitting) return;

      // Ignore when typing inside an input or textarea
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        playTileClick();
        onToggleOrientation();
      }
    },
    [disabled, isCommitting, onToggleOrientation]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const placedCount = ships.filter((s) => s.startX >= 0 && s.startY >= 0).length;

  return (
    <div
      className={`flex flex-col bg-slate-900/80 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-5 shadow-2xl relative overflow-hidden ${className}`}
    >
      {/* Background Cyberpunk Accents */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Anchor className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-2">
              Fleet Command
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono font-normal">
                {placedCount}/5 DEPLOYED
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Position all warships to lock coordinates
            </p>
          </div>
        </div>

        {/* Orientation Toggle Button */}
        <button
          type="button"
          onClick={() => {
            playTileClick();
            onToggleOrientation();
          }}
          disabled={disabled || isCommitting}
          title="Press 'R' on keyboard to rotate"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 transition-all font-mono text-xs active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Compass className="w-3.5 h-3.5 animate-spin-slow" />
          <span>{orientation === "HORIZONTAL" ? "HORIZ ⇋" : "VERT ⇅"}</span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-bold bg-cyan-950/80 border border-cyan-500/40 rounded text-cyan-200">
            R
          </kbd>
        </button>
      </div>

      {/* Warship List */}
      <div className="flex flex-col gap-2.5 py-4">
        {FLEET_LIST.map((shipDef) => {
          const shipId = shipDef.id as ShipId;
          const isSelected = selectedShipId === shipId;
          const placement = ships.find((s) => s.shipId === shipId);
          const isPlaced = Boolean(
            placement && placement.startX >= 0 && placement.startY >= 0
          );

          return (
            <motion.div
              key={shipId}
              whileHover={{ scale: disabled ? 1 : 1.01 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              draggable={!disabled && !isCommitting}
              onDragStart={(e) => {
                const dragEvent = e as unknown as React.DragEvent;
                if (dragEvent.dataTransfer) {
                  dragEvent.dataTransfer.setData("text/plain", String(shipId));
                }
                onSelectShip(shipId);
              }}
              onClick={() => {
                if (disabled || isCommitting) return;
                playTileClick();
                onSelectShip(shipId);
              }}
              className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/20"
                  : isPlaced
                  ? "bg-slate-800/40 border-cyan-500/20 hover:border-cyan-500/40"
                  : "bg-slate-900/60 border-slate-700/50 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                    isSelected
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : isPlaced
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-800 border-slate-700 text-slate-400"
                  }`}
                >
                  <Ship className="w-4 h-4" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {shipDef.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      [{shipDef.size} Cells]
                    </span>
                  </div>

                  {/* Ship Segment Visualizer */}
                  <div className="flex items-center gap-1 mt-1.5">
                    {Array.from({ length: shipDef.size }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`w-3.5 h-1.5 rounded-sm transition-all ${
                          isSelected
                            ? "bg-cyan-400 shadow-sm shadow-cyan-400"
                            : isPlaced
                            ? "bg-emerald-400/80"
                            : "bg-slate-700 group-hover:bg-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {isPlaced && placement ? (
                  <div className="flex items-center gap-1.5 text-right font-mono">
                    <div className="text-[10px] text-emerald-400">
                      {String.fromCharCode(65 + placement.startX)}
                      {placement.startY + 1}
                      <span className="text-slate-500 ml-1">
                        ({placement.orientation === "HORIZONTAL" ? "H" : "V"})
                      </span>
                    </div>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-800 border border-slate-700/60">
                    UNASSIGNED
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Fleet Controls & Helpers */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={() => {
            playTileClick();
            onAutoDeploy();
          }}
          disabled={disabled || isCommitting}
          className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/40 text-slate-200 hover:text-white transition-all text-xs font-semibold font-mono active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Auto-Deploy</span>
        </button>

        {onClearFleet && (
          <button
            type="button"
            onClick={() => {
              playTileClick();
              onClearFleet();
            }}
            disabled={disabled || isCommitting || placedCount === 0}
            className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 transition-all text-xs font-semibold font-mono active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Fleet</span>
          </button>
        )}
      </div>

      {/* Validation Message Banner */}
      <AnimatePresence>
        {!isValidFleet && validationError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-300 text-xs font-mono"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lock & Commit Fleet CTA */}
      <div className="mt-4 pt-3 border-t border-cyan-500/20">
        <button
          type="button"
          onClick={() => {
            if (!isValidFleet || disabled || isCommitting) return;
            onCommitFleet();
          }}
          disabled={!isValidFleet || disabled || isCommitting}
          className={`w-full relative group overflow-hidden py-3 px-4 rounded-xl font-mono text-xs uppercase font-black tracking-wider transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 ${
            isValidFleet && !disabled && !isCommitting
              ? "bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-slate-950 shadow-cyan-500/25 hover:shadow-cyan-500/40 cursor-pointer"
              : "bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed"
          }`}
        >
          {/* Subtle sheen highlight animation */}
          {isValidFleet && !isCommitting && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}

          {isCommitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Generating Keccak256 Hash...</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Lock & Commit Fleet</span>
              <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded bg-slate-950/20 text-slate-950 font-bold">
                {TOTAL_SHIP_CELLS} Cells
              </span>
            </>
          )}
        </button>

        <p className="mt-2 text-[10px] text-center text-slate-400 font-mono">
          🔒 Generates 256-bit salt & Keccak256 commitment hash
        </p>
      </div>
    </div>
  );
}

export default FleetPlacementDock;

"use client";

/**
 * ChainPlay - Defensive Naval Grid (Friendly Waters)
 *
 * 10x10 Naval Grid displaying:
 * - Placement Phase: interactive ship placement preview with collision and boundary detection
 *   (Green = valid footprint, Red = invalid/overlap).
 * - Combat Phase: live friendly fleet status showing undamaged armor plates,
 *   incoming enemy hits (burning craters / fire effects), and misses (water ripples / splash).
 * - Standard naval coordinates (A-J columns, 1-10 rows).
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState, useMemo, useCallback } from "react";
import { Flame, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import type {
  ShipId,
  ShipOrientation,
  ShipPlacement,
  ShotRecord,
  Coordinate,
} from "@/types/battleship.types";
import { FLEET_LIST, GRID_CONFIG } from "@/config/constants";
import { getShipCoordinates } from "@/lib/crypto/battleshipCrypto";
import { playTileClick } from "@/lib/utils/soundEffects";

const GRID_SIZE = GRID_CONFIG.BATTLESHIP_GRID_SIZE; // 10
const COL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
const ROW_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface DefensiveGridProps {
  /**
   * Array of placed friendly ships
   */
  readonly ships: ShipPlacement[];

  /**
   * Incoming enemy shots on friendly waters
   */
  readonly incomingShots: ShotRecord[];

  /**
   * Current arena phase
   */
  readonly phase: string;

  /**
   * Currently selected ship for placement (in PLACEMENT phase)
   */
  readonly selectedShipId?: ShipId | null;

  /**
   * Active orientation for placement
   */
  readonly selectedOrientation?: ShipOrientation;

  /**
   * Callback fired when a ship is placed at coordinates (x, y)
   */
  readonly onPlaceShip?: (
    shipId: ShipId,
    startX: number,
    startY: number,
    orientation: ShipOrientation
  ) => void;

  /**
   * Whether grid interactions are disabled
   */
  readonly disabled?: boolean;

  /**
   * Optional custom CSS class name
   */
  readonly className?: string;
}

export function DefensiveGrid({
  ships,
  incomingShots,
  phase,
  selectedShipId = null,
  selectedOrientation = "HORIZONTAL",
  onPlaceShip,
  disabled = false,
  className = "",
}: DefensiveGridProps): React.JSX.Element {
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);

  const isPlacementMode = phase === "PLACEMENT";

  // Build a fast lookup map of which ship occupies which cell (x, y)
  const shipCellMap = useMemo(() => {
    const map = new Map<string, { ship: ShipPlacement; isLeadCell: boolean }>();
    for (const ship of ships) {
      if (ship.startX >= 0 && ship.startY >= 0) {
        const coords = getShipCoordinates(ship);
        coords.forEach((c, idx) => {
          map.set(`${c.x},${c.y}`, { ship, isLeadCell: idx === 0 });
        });
      }
    }
    return map;
  }, [ships]);

  // Build a fast lookup map for incoming shots
  const shotMap = useMemo(() => {
    const map = new Map<string, ShotRecord>();
    for (const shot of incomingShots) {
      map.set(`${shot.x},${shot.y}`, shot);
    }
    return map;
  }, [incomingShots]);

  // Calculate hover preview footprint during placement phase
  const placementPreview = useMemo(() => {
    if (!isPlacementMode || !selectedShipId || !hoverCoord) {
      return null;
    }

    const shipDef = FLEET_LIST.find((s) => s.id === selectedShipId);
    if (!shipDef) return null;

    const size = shipDef.size;
    const { x, y } = hoverCoord;

    // Check boundary
    const isOutOfBounds =
      selectedOrientation === "HORIZONTAL"
        ? x + size > GRID_SIZE
        : y + size > GRID_SIZE;

    const previewCoords = getShipCoordinates({
      startX: x,
      startY: y,
      size,
      orientation: selectedOrientation,
    });

    // Check collision against OTHER placed ships (excluding currently selected ship)
    let hasCollision = false;
    for (const c of previewCoords) {
      if (c.x < 0 || c.x >= GRID_SIZE || c.y < 0 || c.y >= GRID_SIZE) {
        hasCollision = true;
        break;
      }
      const existing = shipCellMap.get(`${c.x},${c.y}`);
      if (existing && existing.ship.shipId !== selectedShipId) {
        hasCollision = true;
        break;
      }
    }

    const isValid = !isOutOfBounds && !hasCollision;

    return {
      coords: previewCoords,
      isValid,
    };
  }, [
    isPlacementMode,
    selectedShipId,
    hoverCoord,
    selectedOrientation,
    shipCellMap,
  ]);

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      if (!isPlacementMode || disabled || !selectedShipId || !onPlaceShip) {
        return;
      }

      if (placementPreview && placementPreview.isValid) {
        playTileClick();
        onPlaceShip(selectedShipId, x, y, selectedOrientation);
      }
    },
    [
      isPlacementMode,
      disabled,
      selectedShipId,
      onPlaceShip,
      placementPreview,
      selectedOrientation,
    ]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, x: number, y: number) => {
      e.preventDefault();
      if (!isPlacementMode || disabled) return;
      if (!hoverCoord || hoverCoord.x !== x || hoverCoord.y !== y) {
        setHoverCoord({ x, y });
      }
    },
    [isPlacementMode, disabled, hoverCoord]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, x: number, y: number) => {
      e.preventDefault();
      if (!isPlacementMode || disabled || !onPlaceShip) return;

      const rawShipId = e.dataTransfer.getData("text/plain");
      const draggedShipId = Number(rawShipId) as ShipId;

      if (draggedShipId >= 1 && draggedShipId <= 5) {
        const shipDef = FLEET_LIST.find((s) => s.id === draggedShipId);
        if (!shipDef) return;

        const size = shipDef.size;
        const coords = getShipCoordinates({
          startX: x,
          startY: y,
          size,
          orientation: selectedOrientation,
        });

        const isOutOfBounds = coords.some(
          (c) => c.x < 0 || c.x >= GRID_SIZE || c.y < 0 || c.y >= GRID_SIZE
        );

        let hasCollision = false;
        for (const c of coords) {
          const existing = shipCellMap.get(`${c.x},${c.y}`);
          if (existing && existing.ship.shipId !== draggedShipId) {
            hasCollision = true;
            break;
          }
        }

        if (!isOutOfBounds && !hasCollision) {
          playTileClick();
          onPlaceShip(draggedShipId, x, y, selectedOrientation);
        }
      }
    },
    [isPlacementMode, disabled, onPlaceShip, selectedOrientation, shipCellMap]
  );

  return (
    <div
      className={`flex flex-col items-center select-none bg-slate-950/70 border border-cyan-500/20 rounded-2xl p-4 shadow-xl backdrop-blur-md relative overflow-hidden ${className}`}
    >
      {/* Grid Sub-Header */}
      <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-black tracking-widest text-white uppercase">
            Defensive Waters [Friendly Fleet]
          </span>
        </div>

        {isPlacementMode && selectedShipId && (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
            <span>READY TO PLACE:</span>
            <span className="font-bold text-white uppercase">
              {FLEET_LIST.find((s) => s.id === selectedShipId)?.name}
            </span>
          </div>
        )}
      </div>

      {/* 10x10 Coordinate Board Container */}
      <div className="relative inline-block">
        {/* Top Header: Column Letters A - J */}
        <div className="grid grid-cols-[28px_repeat(10,minmax(28px,36px))] mb-1">
          <div className="w-7 h-6" /> {/* Corner Empty */}
          {COL_LABELS.map((col) => (
            <div
              key={col}
              className="h-6 flex items-center justify-center font-mono text-[11px] font-bold text-cyan-400/80"
            >
              {col}
            </div>
          ))}
        </div>

        {/* Board Rows with Left Row Numbers 1 - 10 */}
        <div
          className="flex flex-col gap-[3px]"
          onMouseLeave={() => setHoverCoord(null)}
        >
          {ROW_LABELS.map((rowNum, rowIndex) => (
            <div
              key={rowNum}
              className="grid grid-cols-[28px_repeat(10,minmax(28px,36px))] gap-[3px] items-center"
            >
              {/* Left Row Number Label */}
              <div className="w-7 flex items-center justify-center font-mono text-[11px] font-bold text-cyan-400/80">
                {rowNum}
              </div>

              {/* 10 Cells in this Row */}
              {COL_LABELS.map((_, colIndex) => {
                const x = colIndex;
                const y = rowIndex;
                const cellKey = `${x},${y}`;

                const occupied = shipCellMap.get(cellKey);
                const shot = shotMap.get(cellKey);

                // Check if this cell is in the active placement preview
                const inPreview = placementPreview?.coords.some(
                  (c) => c.x === x && c.y === y
                );
                const isPreviewValid = placementPreview?.isValid ?? false;

                // Calculate Cell Styling
                let cellBg = "bg-slate-900/80 border-cyan-900/40 hover:border-cyan-500/50";
                let content: React.ReactNode = null;

                if (isPlacementMode) {
                  if (inPreview) {
                    cellBg = isPreviewValid
                      ? "bg-emerald-500/35 border-emerald-400 shadow-md shadow-emerald-500/30 text-emerald-200"
                      : "bg-rose-500/35 border-rose-400 shadow-md shadow-rose-500/30 text-rose-200";
                  } else if (occupied) {
                    const isCurrent = occupied.ship.shipId === selectedShipId;
                    cellBg = isCurrent
                      ? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
                      : "bg-slate-800/90 border-cyan-500/40 text-slate-300";
                    content = (
                      <span className="text-[10px] font-mono font-black text-cyan-300">
                        {occupied.ship.name.charAt(0)}
                      </span>
                    );
                  }
                } else {
                  // Combat / Finished Phase
                  if (shot) {
                    if (shot.result === "HIT" || shot.result === "SUNK") {
                      // Burning crater / direct explosion
                      cellBg =
                        "bg-rose-950/90 border-rose-500 shadow-lg shadow-rose-500/40 text-rose-300 animate-pulse";
                      content = (
                        <Flame className="w-4 h-4 text-rose-400 fill-rose-500 animate-bounce" />
                      );
                    } else {
                      // Water Splash Miss
                      cellBg =
                        "bg-blue-950/60 border-blue-500/40 text-blue-300";
                      content = (
                        <Droplets className="w-3.5 h-3.5 text-blue-400/80" />
                      );
                    }
                  } else if (occupied) {
                    // Friendly ship undamaged
                    cellBg =
                      "bg-cyan-950/80 border-cyan-500/50 text-cyan-300 shadow-inner";
                    content = (
                      <span className="text-[9px] font-mono font-bold text-cyan-300/90">
                        {occupied.ship.name.substring(0, 2).toUpperCase()}
                      </span>
                    );
                  } else {
                    // Empty calm water
                    cellBg =
                      "bg-slate-900/60 border-slate-800/80 hover:border-slate-700";
                  }
                }

                return (
                  <motion.div
                    key={cellKey}
                    whileHover={{
                      scale: isPlacementMode && !disabled ? 1.08 : 1,
                    }}
                    onMouseEnter={() => {
                      if (isPlacementMode && !disabled) {
                        setHoverCoord({ x, y });
                      }
                    }}
                    onDragOver={(e) => handleDragOver(e, x, y)}
                    onDrop={(e) => handleDrop(e, x, y)}
                    onClick={() => handleCellClick(x, y)}
                    className={`aspect-square w-full rounded-md border flex items-center justify-center transition-all ${cellBg} ${
                      isPlacementMode && !disabled ? "cursor-pointer" : ""
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

      {/* Grid Status Legend */}
      <div className="w-full mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-cyan-950 border border-cyan-500/60" />
            <span>Friendly Ship</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-rose-950 border border-rose-500 flex items-center justify-center">
              <Flame className="w-2 h-2 text-rose-400" />
            </span>
            <span>Direct Hit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-950 border border-blue-500 flex items-center justify-center">
              <Droplets className="w-2 h-2 text-blue-400" />
            </span>
            <span>Splash Miss</span>
          </div>
        </div>

        <div>
          {isPlacementMode ? (
            <span className="text-cyan-400 font-bold">MODE: DEPLOYMENT</span>
          ) : (
            <span className="text-emerald-400 font-bold">DEFENSIVE RADAR ACTIVE</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default DefensiveGrid;

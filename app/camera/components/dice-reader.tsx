"use client";

import type { RefObject } from "react";
import { useDiceReader } from "../use-dice-reader";
import CameraAngleControl from "../angle-guide/camera-angle-control";
import DiceRemovedIndicator from "../removal/dice-removed-indicator";
import PlayAreaOverlay from "../play-area/play-area-overlay";
import type { DieCropBatch } from "../die-crops/types";

interface DiceReaderProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  zoom?: number;
  zoomRevision?: number;
  onDiceRemoved?: () => void;
  showPlayArea?: boolean;
  onCrops?: (batch: DieCropBatch | null) => void;
}

export default function DiceReader({ videoRef, zoom = 1, zoomRevision = 0, onDiceRemoved, showPlayArea = false, onCrops }: DiceReaderProps) {
  const {
    overlayRef,
    expectedCount,
    cameraTilt,
    status,
    lastRoll,
    diceRemoved,
    playArea,
    changeCameraTilt,
    changeExpectedCount,
  } = useDiceReader(videoRef, zoom, zoomRevision, onDiceRemoved, onCrops);

  return (
    <div className="pointer-events-none absolute inset-0">
      {showPlayArea && playArea && <PlayAreaOverlay area={playArea} zoom={zoom} />}
      <canvas ref={overlayRef} aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" />
      {diceRemoved && <DiceRemovedIndicator />}
      <div className={`absolute left-3 top-3 z-10 rounded-lg bg-black/80 px-3 py-2 text-xs text-white ${diceRemoved ? "max-w-[calc(100%-9rem)]" : "max-w-[calc(100%-1.5rem)]"}`}>
        <p>{status}</p>
        <p className="mt-1 text-emerald-300" role="status">Last roll: {lastRoll}</p>
        {showPlayArea && !playArea && <p className="mt-1 text-sky-200">Confirm a roll to locate the play area.</p>}
      </div>
      <div className="absolute inset-0 flex flex-wrap content-end items-end justify-between gap-2 p-3">
        <CameraAngleControl angle={cameraTilt} onChange={changeCameraTilt} />
        <label className="pointer-events-auto relative flex items-center gap-2 rounded-lg bg-black/80 px-3 py-2 text-sm text-white">
          Dice to read
          <select
            aria-label="Dice to read"
            value={expectedCount}
            onChange={(event) => changeExpectedCount(Number(event.target.value))}
            className="rounded border border-white/30 bg-zinc-900 px-2 py-1 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

"use client";

import type { RefObject } from "react";
import { useDiceReader } from "./use-dice-reader";

interface DiceReaderProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export default function DiceReader({ videoRef }: DiceReaderProps) {
  const {
    overlayRef,
    expectedCount,
    cameraTilt,
    status,
    lastRoll,
    changeCameraTilt,
    changeExpectedCount,
  } = useDiceReader(videoRef);

  return (
    <div className="pointer-events-none absolute inset-0">
      <canvas ref={overlayRef} aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute left-3 top-3 max-w-[calc(100%-1.5rem)] rounded-lg bg-black/80 px-3 py-2 text-xs text-white">
        <p>{status}</p>
        <p className="mt-1 text-emerald-300" role="status">Last roll: {lastRoll}</p>
      </div>
      <div className="pointer-events-auto absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-2">
        <label className="rounded-lg bg-black/80 px-3 py-2 text-xs text-white">
          <span className="mb-1 block">Camera angle: {cameraTilt}°</span>
          <input
            type="range"
            min="0"
            max="60"
            step="5"
            value={cameraTilt}
            aria-label="Camera angle from overhead"
            onChange={(event) => changeCameraTilt(Number(event.target.value))}
            className="block w-28 accent-emerald-400"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg bg-black/80 px-3 py-2 text-sm text-white">
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

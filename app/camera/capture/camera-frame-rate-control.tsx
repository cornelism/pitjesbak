"use client";

import { useEffect, useRef, useState } from "react";
import { applyCameraFrameRate, cameraFrameRate } from "./camera-frame-rate";

/** Optional stream control; changing FPS keeps the reader and confirmed roll mounted. */
export default function CameraFrameRateControl({ track }: { track: MediaStreamTrack }) {
  const { rates } = cameraFrameRate(track);
  const [state, setState] = useState(() => ({
    limit: null as number | null, actual: cameraFrameRate(track).actual, pending: false, error: "",
  }));
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, [track]);

  async function change(limit: number | null) {
    if (state.pending) return;
    const id = ++request.current;
    setState((current) => ({ ...current, pending: true, error: "" }));
    try {
      const actual = await applyCameraFrameRate(track, limit);
      if (id === request.current) setState({ limit, actual, pending: false, error: "" });
    } catch {
      if (id === request.current) setState((current) => ({
        ...current, pending: false, error: "The camera could not apply this frame-rate limit. Try another value.",
      }));
    }
  }

  return (
    <div className="space-y-2 text-sm text-zinc-300">
      <label className="flex flex-wrap items-center gap-3">
        <span>Frame rate</span>
        <select aria-label="Frame rate" value={state.limit ?? "auto"} disabled={state.pending || !rates.length}
          onChange={(event) => { void change(event.target.value === "auto" ? null : Number(event.target.value)); }}
          className="rounded-lg border border-white/20 bg-zinc-900 px-3 py-2 disabled:opacity-50">
          <option value="auto">Auto</option>
          {rates.map((rate) => <option key={rate} value={rate}>{rate} FPS</option>)}
        </select>
        {state.actual !== null && <span>Camera reports {Number(state.actual.toFixed(1))} FPS</span>}
      </label>
      {!rates.length && <p>Frame-rate control is unavailable for this camera.</p>}
      {state.error && <p role="alert" className="text-amber-300">{state.error}</p>}
    </div>
  );
}

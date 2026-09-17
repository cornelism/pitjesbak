"use client";

import { Camera, CameraOff } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import DiceReader from "./dice-reader";
import SaveCameraFrame from "./save-camera-frame";
import { useCamera } from "../capture/use-camera";
import PlayAreaToggle from "../play-area/play-area-toggle";
import SaveDieCrops from "../die-crops/save-die-crops";
import type { DieCropBatch } from "../die-crops/types";
import StabilizationToggle from "../tracking/stabilization-toggle";

export default function CameraPreview() {
  const {
    state, videoRef, zoom, zoomPending, zoomError, zoomRevision, cropZoom,
    startCamera, stopCamera, changeZoom, resetZoom,
  } = useCamera();
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [showPlayArea, setShowPlayArea] = useState(false);
  const [stabilizationEnabled, setStabilizationEnabled] = useState(true);
  const cropBatchRef = useRef<DieCropBatch | null>(null);
  const isLive = state.status === "live";
  const isRequesting = state.status === "requesting";

  return (
    <section className="m-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 text-white shadow-2xl sm:m-8" aria-labelledby="camera-title">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 p-5 sm:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">Pitjesbak</p>
          <h1 id="camera-title" className="mt-1 text-2xl font-semibold">Your camera</h1>
        </div>
        <Link href="/game" className="rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
          Go to game &rarr;
        </Link>
      </header>

      <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio }}>
        <video
          ref={videoRef}
          aria-label="Live camera preview"
          autoPlay
          muted
          playsInline
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video.videoWidth && video.videoHeight) setAspectRatio(video.videoWidth / video.videoHeight);
          }}
          style={{ transform: `scale(${isLive ? cropZoom : 1})` }}
          className={`absolute inset-0 h-full w-full object-contain ${isLive ? "" : "invisible"}`}
        />
        {isLive && <DiceReader videoRef={videoRef} zoom={cropZoom} zoomRevision={zoomRevision} onDiceRemoved={resetZoom} showPlayArea={showPlayArea}
          stabilizationEnabled={stabilizationEnabled}
          onCrops={process.env.NODE_ENV === "development" ? (batch) => { cropBatchRef.current = batch; } : undefined} />}
        {!isLive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <CameraOff className="h-9 w-9 text-zinc-500" aria-hidden="true" />
            <p className="text-lg font-medium">{isRequesting ? "Connecting to your camera…" : "Camera is off"}</p>
            <p className="max-w-md text-sm text-zinc-400">
              {isRequesting
                ? "Allow camera access when your browser asks."
                : "Start your camera to see a live preview here."}
            </p>
          </div>
        )}
      </div>

      <footer className="space-y-4 border-t border-white/10 p-5 sm:px-8">
        {isLive && process.env.NODE_ENV === "development" && <SaveDieCrops batchRef={cropBatchRef} />}
        {isLive && (
          <div>
            <label className="flex flex-wrap items-center gap-3 text-sm text-zinc-200">
              <span>Zoom: {(zoom.value / zoom.min).toFixed(1)}× ({zoom.mode})</span>
              <input
                type="range"
                aria-label="Camera zoom"
                min={zoom.min}
                max={zoom.max}
                step={zoom.step}
                value={zoom.value}
                disabled={zoomPending}
                onChange={(event) => { void changeZoom(Number(event.target.value)); }}
                className="w-48 accent-emerald-400"
              />
            </label>
            {zoomError && <p role="alert" className="mt-2 text-sm text-amber-300">{zoomError}</p>}
            <div className="mt-3"><PlayAreaToggle checked={showPlayArea} onChange={setShowPlayArea} /></div>
            <div className="mt-3"><StabilizationToggle checked={stabilizationEnabled} onChange={setStabilizationEnabled} /></div>
          </div>
        )}
        <p className="text-sm text-zinc-400">
          OpenCV reads light dice with dark pips on a darker surface. Keep the camera upright and the dice apart.
          Set Camera angle to 0° for overhead or about 45° for a slanted view.
          Confirmed rolls are logged to the browser console.
        </p>
        <div role="status" aria-live="polite" className="text-sm text-zinc-300">
          {state.status === "error" ? (
            <p className="text-amber-300">{state.message}</p>
          ) : isLive ? (
            <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" />Live preview</span>
          ) : isRequesting ? "Waiting for your camera…" : "Ready when you are."}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">Your video stays on this device. No audio is captured.</p>
          {isLive && <SaveCameraFrame videoRef={videoRef} zoom={cropZoom} />}
          {isLive || isRequesting ? (
            <button type="button" onClick={stopCamera} className="rounded-lg border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
              {isRequesting ? "Cancel" : "Stop camera"}
            </button>
          ) : (
            <button type="button" onClick={startCamera} className="flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
              <Camera className="h-4 w-4" aria-hidden="true" />
              {state.status === "error" ? "Try again" : "Start camera"}
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

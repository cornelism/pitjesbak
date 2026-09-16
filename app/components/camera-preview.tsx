"use client";

import { Camera, CameraOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import DiceReader from "../camera/dice-reader";
import SaveCameraFrame from "../camera/save-camera-frame";
import { applyCameraZoom, cameraZoom, digitalZoom } from "../camera/camera-zoom";

type CameraState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "live"; track: MediaStreamTrack }
  | { status: "error"; message: string };

function cameraErrorMessage(error: unknown): string {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? error.name
      : "";

  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera access was blocked. Allow camera access in your browser’s site settings, then try again.";
    case "NotFoundError":
      return "No camera was found. Connect a camera, then try again.";
    case "NotReadableError":
    case "AbortError":
      return "Your camera could not start. Close other apps using it, then try again.";
    default:
      return "The camera preview could not start. Check your camera and try again.";
  }
}

export default function CameraPreview() {
  const [state, setState] = useState<CameraState>({ status: "idle" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [zoom, setZoom] = useState(digitalZoom);
  const [zoomPending, setZoomPending] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [zoomRevision, setZoomRevision] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  const releaseCamera = useCallback(() => {
    // Invalidate pending permission and playback requests, including on unmount.
    requestRef.current += 1;
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  useEffect(() => releaseCamera, [releaseCamera]);

  async function startCamera() {
    releaseCamera();

    if (!navigator.mediaDevices?.getUserMedia) {
      setState({
        status: "error",
        message:
          "Camera access is unavailable. Open this page over HTTPS or localhost in a browser that supports cameras.",
      });
      return;
    }

    const request = requestRef.current;
    setZoomPending(false);
    setZoomError(null);
    setState({ status: "requesting" });

    try {
      const videoConstraints: MediaTrackConstraints & { zoom: boolean } = {
        width: { ideal: 1920 }, height: { ideal: 1080 }, zoom: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false,
      });
      const video = videoRef.current;

      if (request !== requestRef.current || !video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      function handleEnded() {
        releaseCamera();
        setState({
          status: "error",
          message: "The camera disconnected or access ended. Check your camera, then try again.",
        });
      }

      const tracks = stream.getTracks();
      cleanupRef.current = () => {
        tracks.forEach((track) => {
          track.removeEventListener("ended", handleEnded);
          track.stop();
        });
        video.srcObject = null;
      };
      tracks.forEach((track) => track.addEventListener("ended", handleEnded));
      video.srcObject = stream;
      await video.play();

      if (request === requestRef.current) {
        const track = stream.getVideoTracks()[0];
        setZoom(cameraZoom(track));
        setState({ status: "live", track });
      }
    } catch (error: unknown) {
      if (request !== requestRef.current) return;
      releaseCamera();
      setState({ status: "error", message: cameraErrorMessage(error) });
    }
  }

  function stopCamera() {
    releaseCamera();
    setState({ status: "idle" });
  }

  async function changeZoom(value: number) {
    if (state.status !== "live" || zoomPending) return;
    setZoomError(null);
    if (zoom.mode === "digital") {
      setZoom({ ...zoom, value });
      return;
    }
    const request = requestRef.current;
    setZoomPending(true);
    try {
      await applyCameraZoom(state.track, value);
      if (request !== requestRef.current) return;
      const actual = cameraZoom(state.track);
      if (actual.mode !== "camera" || Math.abs(actual.value - value) > zoom.step / 2) {
        throw new Error("Camera did not apply zoom");
      }
      setZoom(actual);
      setZoomRevision((revision) => revision + 1);
    } catch {
      if (request !== requestRef.current) return;
      setZoom(digitalZoom());
      setZoomRevision((revision) => revision + 1);
      setZoomError("Camera zoom is unavailable. Use digital zoom instead.");
    } finally {
      if (request === requestRef.current) setZoomPending(false);
    }
  }

  const isLive = state.status === "live";
  const isRequesting = state.status === "requesting";
  const cropZoom = zoom.mode === "digital" ? zoom.value : 1;

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
        {isLive && <DiceReader videoRef={videoRef} zoom={cropZoom} zoomRevision={zoomRevision} />}
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
          </div>
        )}
        <p className="text-sm text-zinc-400">
          OpenCV reads light dice with dark pips on a darker surface. Keep the camera upright and the dice apart.
          Set Camera angle to 0° for overhead or about 45° for a slanted view.
          Settled rolls are logged to the browser console.
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

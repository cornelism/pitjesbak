"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyCameraZoom, cameraZoom, digitalZoom } from "./camera-zoom";

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

/** Own camera tracks, pending requests, and zoom for one preview session. */
export function useCamera() {
  const [state, setState] = useState<CameraState>({ status: "idle" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [zoom, setZoom] = useState(digitalZoom);
  const [zoomPending, setZoomPending] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [zoomRevision, setZoomRevision] = useState(0);

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

  return {
    state, videoRef, zoom, zoomPending, zoomError, zoomRevision,
    startCamera, stopCamera, changeZoom,
    cropZoom: zoom.mode === "digital" ? zoom.value : 1,
  };
}

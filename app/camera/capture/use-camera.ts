"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyCameraZoom, cameraZoom, digitalZoom } from "./camera-zoom";
import { createCameraSession, cameraErrorMessage, type CameraSession } from "./camera-session";

type CameraState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "live"; track: MediaStreamTrack }
  | { status: "error"; message: string };

/** React camera state and zoom controls, backed by one active camera session. */
export function useCamera() {
  const [state, setState] = useState<CameraState>({ status: "idle" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<CameraSession | null>(null);
  const [zoom, setZoom] = useState(digitalZoom);
  const [zoomPending, setZoomPending] = useState(false);
  const [zoomError, setZoomError] = useState<string | null>(null);
  const [zoomRevision, setZoomRevision] = useState(0);

  const releaseCamera = useCallback(() => {
    sessionRef.current?.stop();
    // Session identity also invalidates pending startup and zoom responses.
    sessionRef.current = null;
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

    setZoomPending(false);
    setZoomError(null);
    setState({ status: "requesting" });

    const session = createCameraSession({
      getVideo: () => videoRef.current,
      onEnded: () => {
        releaseCamera();
        setState({
          status: "error",
          message: "The camera disconnected or access ended. Check your camera, then try again.",
        });
      },
    });
    sessionRef.current = session;

    try {
      const track = await session.start();
      if (sessionRef.current !== session || !track) return;
      setZoom(cameraZoom(track));
      setState({ status: "live", track });
    } catch (error: unknown) {
      if (sessionRef.current !== session) return;
      releaseCamera();
      setState({ status: "error", message: cameraErrorMessage(error) });
    }
  }

  function stopCamera() {
    releaseCamera();
    setState({ status: "idle" });
  }

  async function changeZoom(value: number) {
    const session = sessionRef.current;
    if (state.status !== "live" || !session || zoomPending) return;
    setZoomError(null);
    if (zoom.mode === "digital") {
      setZoom({ ...zoom, value });
      return;
    }
    setZoomPending(true);
    try {
      const actual = await applyCameraZoom(state.track, value, zoom.step);
      if (sessionRef.current !== session) return;
      setZoom(actual);
      setZoomRevision((revision) => revision + 1);
    } catch {
      if (sessionRef.current !== session) return;
      setZoom(digitalZoom());
      setZoomRevision((revision) => revision + 1);
      setZoomError("Camera zoom is unavailable. Use digital zoom instead.");
    } finally {
      if (sessionRef.current === session) setZoomPending(false);
    }
  }

  return {
    state, videoRef, zoom, zoomPending, zoomError, zoomRevision,
    startCamera, stopCamera, changeZoom,
    cropZoom: zoom.mode === "digital" ? zoom.value : 1,
  };
}

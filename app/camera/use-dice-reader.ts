"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { startDiceReader } from "./dice-reader-session";

/** React settings and display state; each settings change replaces the reader session. */
export function useDiceReader(videoRef: RefObject<HTMLVideoElement | null>, zoom = 1, zoomRevision = 0) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [expectedCount, setExpectedCount] = useState(3);
  const [cameraTilt, setCameraTilt] = useState(45);
  const [status, setStatus] = useState("Loading OpenCV…");
  const [lastRoll, setLastRoll] = useState("None yet");

  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;

    return startDiceReader({
      video, overlay, expectedCount, cameraTilt, zoom,
      onReady: () => setLastRoll("None yet"),
      onStatus: setStatus,
      onRoll: (roll) => {
        console.log("[Dice roll]", {
          dice: roll,
          total: roll.reduce<number>((sum, value) => sum + value, 0),
          timestamp: new Date().toISOString(),
        });
        setLastRoll(roll.join(" · "));
      },
    });
  }, [expectedCount, cameraTilt, videoRef, zoom, zoomRevision]);

  function resetReading() {
    setStatus("Looking for dice…");
    setLastRoll("None yet");
  }

  function changeCameraTilt(value: number) {
    setCameraTilt(value);
    resetReading();
  }

  function changeExpectedCount(value: number) {
    setExpectedCount(value);
    resetReading();
  }

  return {
    overlayRef,
    expectedCount,
    cameraTilt,
    status,
    lastRoll,
    changeCameraTilt,
    changeExpectedCount,
  };
}

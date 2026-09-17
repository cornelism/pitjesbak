"use client";

import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import { startDiceReader } from "./dice-reader-session";
import type { PlayArea } from "./play-area/play-area";
import type { DieCropBatch } from "./die-crops/types";

/** React settings and display state; each settings change replaces the reader session. */
export function useDiceReader(videoRef: RefObject<HTMLVideoElement | null>, zoom = 1, zoomRevision = 0, onDiceRemoved?: () => void, onCrops?: (batch: DieCropBatch | null) => void, stabilizationEnabled = true) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [expectedCount, setExpectedCount] = useState(3);
  const [cameraTilt, setCameraTilt] = useState(45);
  const [status, setStatus] = useState("Loading OpenCV…");
  const [lastRoll, setLastRoll] = useState("None yet");
  const [diceRemoved, setDiceRemoved] = useState(false);
  const [surface, setSurface] = useState<{ area: PlayArea | null; revision: number } | null>(null);
  const notifyCrops = useEffectEvent((batch: DieCropBatch | null) => onCrops?.(batch));
  const notifyRemoval = useEffectEvent(() => {
    setDiceRemoved(true);
    setLastRoll("None yet");
    console.log("[Dice removed]", { timestamp: new Date().toISOString() });
    onDiceRemoved?.();
  });

  useEffect(() => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;

    return startDiceReader({
      video, overlay, expectedCount, cameraTilt, zoom, stabilizationEnabled,
      onReady: () => setLastRoll("None yet"),
      onStatus: setStatus,
      onCrops: notifyCrops,
      onDiceRemoved: notifyRemoval,
      onDiceVisible: () => setDiceRemoved(false),
      onPlayArea: (area) => setSurface({ area, revision: zoomRevision }),
      onRoll: (roll) => {
        console.log("[Dice roll]", {
          dice: roll,
          total: roll.reduce<number>((sum, value) => sum + value, 0),
          timestamp: new Date().toISOString(),
        });
        setLastRoll(roll.join(" · "));
      },
    });
  }, [expectedCount, cameraTilt, videoRef, zoom, zoomRevision, stabilizationEnabled]);

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
    diceRemoved,
    playArea: surface?.revision === zoomRevision ? surface.area : null,
    changeCameraTilt,
    changeExpectedCount,
  };
}

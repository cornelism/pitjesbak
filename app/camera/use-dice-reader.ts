"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "./dice-types";
import { cameraFrameSize } from "./frame-size";
import { detectDiceOpenCv } from "./opencv-dice";
import { loadOpenCv } from "./opencv-runtime";
import { createRollTracker, RECOVERY_ATTEMPTS, RECOVERY_MATCHES, type RollTrackingState } from "./roll-tracker";

const FRAME_INTERVAL_MS = 160;

function drawMarkers(
  drawing: CanvasRenderingContext2D,
  width: number,
  height: number,
  dice: readonly DetectedDie[],
) {
  drawing.clearRect(0, 0, width, height);
  drawing.lineWidth = 2;
  drawing.font = "bold 16px sans-serif";
  for (const die of dice) {
    drawing.strokeStyle = "#34d399";
    drawing.strokeRect(die.x, die.y, die.width, die.height);
    drawing.fillStyle = "#34d399";
    drawing.fillRect(die.x, die.y, 22, 22);
    drawing.fillStyle = "#052e16";
    drawing.fillText(String(die.value), die.x + 6, die.y + 17);
  }
}

function readingStatus(tracked: RollTrackingState, visibleCount: number, expectedCount: number): string {
  if (tracked.recovering) {
    return `Stabilizing dice · ${tracked.matchingAttempts}/${RECOVERY_ATTEMPTS} agreeing readings · need ${RECOVERY_MATCHES}`;
  }
  if (tracked.confirmedDice.length) return "Roll confirmed";
  if (visibleCount === expectedCount) return `${visibleCount} dice visible · hold still to read`;
  return `${visibleCount} of ${expectedCount} dice visible`;
}

/** Own the camera sampling loop, settings and confirmation display together. */
export function useDiceReader(videoRef: RefObject<HTMLVideoElement | null>) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [expectedCount, setExpectedCount] = useState(3);
  const [cameraTilt, setCameraTilt] = useState(45);
  const [status, setStatus] = useState("Loading OpenCV…");
  const [lastRoll, setLastRoll] = useState("None yet");

  useEffect(() => {
    const frame = document.createElement("canvas");
    const trackRoll = createRollTracker(expectedCount);
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    let cv: typeof OpenCv | null = null;

    function readFrame() {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      if (!active || !cv || !video || !overlay) return;
      if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        timer = setTimeout(readFrame, FRAME_INTERVAL_MS);
        return;
      }

      try {
        const { width, height } = cameraFrameSize(video);
        if (frame.width !== width || frame.height !== height) {
          frame.width = overlay.width = width;
          frame.height = overlay.height = height;
        }
        const context = frame.getContext("2d", { willReadFrequently: true });
        const drawing = overlay.getContext("2d");
        if (!context || !drawing) {
          setStatus("Dice reading is unavailable in this browser.");
          return;
        }

        context.drawImage(video, 0, 0, width, height);
        const dice = detectDiceOpenCv(cv, context.getImageData(0, 0, width, height), cameraTilt);
        const tracked = trackRoll(dice, performance.now());
        const holdMarkers = tracked.confirmedDice.length > 0 || tracked.recovering;
        const markers = holdMarkers ? tracked.confirmedDice : dice;
        drawMarkers(drawing, width, height, markers);

        const { roll } = tracked;
        if (roll) {
          console.log("[Dice roll]", {
            dice: roll,
            total: roll.reduce<number>((sum, value) => sum + value, 0),
            timestamp: new Date().toISOString(),
          });
          setLastRoll(roll.join(" · "));
        }
        setStatus(readingStatus(tracked, dice.length, expectedCount));
      } catch {
        setStatus("Dice reading failed. Stop and restart the camera to retry.");
        return;
      }
      timer = setTimeout(readFrame, FRAME_INTERVAL_MS);
    }

    loadOpenCv()
      .then((runtime) => {
        if (!active) return;
        cv = runtime.cv;
        setStatus("OpenCV ready · looking for dice…");
        timer = setTimeout(readFrame, FRAME_INTERVAL_MS);
      })
      .catch(() => {
        if (active) setStatus("OpenCV could not load. Stop and restart the camera to retry.");
      });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [expectedCount, cameraTilt, videoRef]);

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

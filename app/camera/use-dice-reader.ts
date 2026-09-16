"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "./dice-types";
import { cameraFrameSize } from "./capture/frame-size";
import { drawCameraFrame } from "./capture/draw-camera-frame";
import { detectDiceOpenCv } from "./detection/opencv-dice";
import { loadOpenCv } from "./detection/opencv-runtime";
import { createRollMotionTracker } from "./tracking/roll-motion";
import { createRollTracker } from "./tracking/roll-tracker";
import { drawMarkers, readingStatus } from "./components/reader-display";

const FRAME_INTERVAL_MS = 160;

/** Own the camera sampling loop, settings and confirmation display together. */
export function useDiceReader(videoRef: RefObject<HTMLVideoElement | null>, zoom = 1, zoomRevision = 0) {
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [expectedCount, setExpectedCount] = useState(3);
  const [cameraTilt, setCameraTilt] = useState(45);
  const [status, setStatus] = useState("Loading OpenCV…");
  const [lastRoll, setLastRoll] = useState("None yet");

  useEffect(() => {
    const frame = document.createElement("canvas");
    const trackRoll = createRollTracker(expectedCount);
    const motion = createRollMotionTracker();
    let displayedMarkers: readonly DetectedDie[] | null = null;
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
          displayedMarkers = null;
        }
        const context = frame.getContext("2d", { willReadFrequently: true });
        const drawing = overlay.getContext("2d");
        if (!context || !drawing) {
          setStatus("Dice reading is unavailable in this browser.");
          return;
        }

        drawCameraFrame(context, video, zoom);
        const image = context.getImageData(0, 0, width, height);
        const dice = detectDiceOpenCv(cv, image, cameraTilt);
        const tracked = trackRoll(dice, performance.now(), motion.hasMoved(image));
        const holdMarkers = tracked.confirmedDice.length > 0 || tracked.recovering;
        const markers = holdMarkers ? tracked.confirmedDice : dice;
        if (markers !== displayedMarkers) {
          drawMarkers(drawing, width, height, markers);
          displayedMarkers = markers;
        }

        const { roll } = tracked;
        if (roll) {
          motion.capture(image, tracked.confirmedDice);
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
        setLastRoll("None yet");
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

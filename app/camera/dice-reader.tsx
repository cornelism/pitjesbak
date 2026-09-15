"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv } from "./opencv-dice";
import { loadOpenCv } from "./opencv-runtime";
import { createRollTracker } from "./roll-tracker";
import { cameraFrameSize } from "./frame-size";

const FRAME_INTERVAL_MS = 160;

interface DiceReaderProps {
  videoRef: RefObject<HTMLVideoElement | null>;
}

export default function DiceReader({ videoRef }: DiceReaderProps) {
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

        const roll = trackRoll(dice, performance.now());
        if (roll) {
          console.log("[Dice roll]", {
            dice: roll,
            total: roll.reduce<number>((sum, value) => sum + value, 0),
            timestamp: new Date().toISOString(),
          });
          setLastRoll(roll.join(" · "));
        }
        setStatus(dice.length === expectedCount
          ? `${dice.length} dice visible · hold still to read`
          : `${dice.length} of ${expectedCount} dice visible`);
      } catch {
        setStatus("Dice reading failed. Stop and restart the camera to retry.");
        return;
      }
      timer = setTimeout(readFrame, FRAME_INTERVAL_MS);
    }

    loadOpenCv().then((runtime) => {
      if (!active) return;
      cv = runtime.cv;
      setStatus("OpenCV ready · looking for dice…");
      timer = setTimeout(readFrame, FRAME_INTERVAL_MS);
    }).catch(() => {
      if (active) setStatus("OpenCV could not load. Stop and restart the camera to retry.");
    });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [expectedCount, cameraTilt, videoRef]);

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
            type="range" min="0" max="60" step="5" value={cameraTilt}
            aria-label="Camera angle from overhead"
            onChange={(event) => {
              setCameraTilt(Number(event.target.value));
              setStatus("Looking for dice…");
              setLastRoll("None yet");
            }}
            className="block w-28 accent-emerald-400"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg bg-black/80 px-3 py-2 text-sm text-white">
          Dice to read
          <select
            aria-label="Dice to read"
            value={expectedCount}
            onChange={(event) => {
              setExpectedCount(Number(event.target.value));
              setStatus("Looking for dice…");
              setLastRoll("None yet");
            }}
            className="rounded border border-white/30 bg-zinc-900 px-2 py-1 focus-visible:outline-2 focus-visible:outline-emerald-400"
          >
            {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

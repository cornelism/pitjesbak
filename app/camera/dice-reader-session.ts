import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie, DieValue } from "./dice-types";
import { cameraFrameSize } from "./capture/frame-size";
import { drawCameraFrame } from "./capture/draw-camera-frame";
import { detectDiceOpenCv } from "./detection/opencv-dice";
import { loadOpenCv } from "./detection/opencv-runtime";
import { createRollMotionTracker } from "./tracking/roll-motion";
import { createRollTracker } from "./tracking/roll-tracker";
import { drawMarkers, readingStatus } from "./components/reader-display";

const FRAME_INTERVAL_MS = 160;

interface ReaderSession {
  video: HTMLVideoElement;
  overlay: HTMLCanvasElement;
  expectedCount: number;
  cameraTilt: number;
  zoom: number;
  onReady: () => void;
  onStatus: (status: string) => void;
  onRoll: (roll: readonly DieValue[]) => void;
}

/** Keep frame buffers, motion history, and frozen markers local to one session. */
function createFrameReader(cv: typeof OpenCv, session: ReaderSession) {
  const { video, overlay, expectedCount, cameraTilt, zoom, onStatus, onRoll } = session;
  const frame = document.createElement("canvas");
  const trackRoll = createRollTracker(expectedCount);
  const motion = createRollMotionTracker();
  let displayedMarkers: readonly DetectedDie[] | null = null;

  // Return false only when reading is unavailable and the loop must stop.
  return function readFrame(): boolean {
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return true;

    const { width, height } = cameraFrameSize(video);
    if (frame.width !== width || frame.height !== height) {
      frame.width = overlay.width = width;
      frame.height = overlay.height = height;
      displayedMarkers = null;
    }
    const context = frame.getContext("2d", { willReadFrequently: true });
    const drawing = overlay.getContext("2d");
    if (!context || !drawing) {
      onStatus("Dice reading is unavailable in this browser.");
      return false;
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
    if (tracked.roll) {
      motion.capture(image, tracked.confirmedDice);
      onRoll(tracked.roll);
    }
    onStatus(readingStatus(tracked, dice.length, expectedCount));
    return true;
  };
}

/** Load OpenCV and sample until stopped or a frame fails. Safe to stop while loading. */
export function startDiceReader(session: ReaderSession): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule(readFrame: () => boolean) {
    timer = setTimeout(() => {
      if (!active) return;
      try {
        if (readFrame() && active) schedule(readFrame);
      } catch {
        session.onStatus("Dice reading failed. Stop and restart the camera to retry.");
      }
    }, FRAME_INTERVAL_MS);
  }

  loadOpenCv()
    .then(({ cv }) => {
      if (!active) return;
      const readFrame = createFrameReader(cv, session);
      session.onReady();
      session.onStatus("OpenCV ready · looking for dice…");
      if (active) schedule(readFrame);
    })
    .catch(() => {
      if (active) session.onStatus("OpenCV could not load. Stop and restart the camera to retry.");
    });

  return () => {
    active = false;
    clearTimeout(timer);
  };
}

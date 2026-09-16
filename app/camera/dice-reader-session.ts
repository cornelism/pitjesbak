import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie, DieValue } from "./dice-types";
import { cameraFrameSize } from "./capture/frame-size";
import { drawCameraFrame } from "./capture/draw-camera-frame";
import { detectDiceOpenCv } from "./detection/opencv-dice";
import { loadOpenCv } from "./detection/opencv-runtime";
import { createRollMotionTracker } from "./tracking/roll-motion";
import { createRollTracker } from "./tracking/roll-tracker";
import { drawMarkers, readingStatus } from "./components/reader-display";
import { createDiceRemovalTracker } from "./removal/dice-removal";
import { unzoomDice } from "./capture/frame-coordinates";

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
  onDiceRemoved?: () => void;
  onDiceVisible?: () => void;
}

/** Keep frame buffers, motion history, and frozen markers local to one session. */
function createFrameReader(cv: typeof OpenCv, session: ReaderSession) {
  const { video, overlay, expectedCount, cameraTilt, zoom, onStatus, onRoll } = session;
  const frame = document.createElement("canvas");
  let trackRoll = createRollTracker(expectedCount);
  const motion = createRollMotionTracker();
  const removal = createDiceRemovalTracker();
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

    // Removal checks the full field, including dice moved outside a digital crop.
    drawCameraFrame(context, video);
    const fullImage = context.getImageData(0, 0, width, height);
    if (zoom > 1) drawCameraFrame(context, video, zoom);
    const image = zoom > 1 ? context.getImageData(0, 0, width, height) : fullImage;
    const dice = detectDiceOpenCv(cv, image, cameraTilt);
    const now = performance.now();
    if (dice.length) session.onDiceVisible?.();
    if (removal.update(fullImage, dice.length, now)) {
      trackRoll = createRollTracker(expectedCount);
      drawMarkers(drawing, width, height, []);
      displayedMarkers = null;
      onStatus("Dice removed · waiting for the next roll");
      session.onDiceRemoved?.();
      return true;
    }
    const tracked = trackRoll(dice, now, motion.hasMoved(image));
    const holdMarkers = tracked.confirmedDice.length > 0 || tracked.recovering;
    const markers = holdMarkers ? tracked.confirmedDice : dice;
    if (markers !== displayedMarkers) {
      drawMarkers(drawing, width, height, markers);
      displayedMarkers = markers;
    }
    if (tracked.roll) {
      motion.capture(image, tracked.confirmedDice);
      removal.capture(fullImage, unzoomDice(tracked.confirmedDice, width, height, zoom));
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

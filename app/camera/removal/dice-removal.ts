import type { DetectedDie } from "../dice-types";
import { createRollMotionTracker } from "../tracking/roll-motion";
import { captureTable, type CameraFrame } from "./clear-table";

const ABSENCE_MS = 2000;
const MAX_SAMPLE_GAP_MS = 750;

/** One removal event per confirmed roll, after movement and a clear table. */
export function createDiceRemovalTracker() {
  const motion = createRollMotionTracker();
  let isClear: ReturnType<typeof captureTable> | null = null;
  let moved = false;
  let emptySince: number | null = null;
  let lastSample: number | null = null;

  return {
    capture(frame: CameraFrame, dice: readonly DetectedDie[]) {
      isClear = dice.length ? captureTable(frame, dice) : null;
      motion.capture(frame, dice);
      moved = false;
      emptySince = lastSample = null;
    },
    update(frame: CameraFrame, visibleCount: number, now: number): boolean {
      if (!isClear) return false;
      if (lastSample !== null && (now - lastSample > MAX_SAMPLE_GAP_MS || now < lastSample)) emptySince = null;
      lastSample = now;
      moved ||= motion.hasMoved(frame);
      if (!moved || visibleCount > 0 || !isClear(frame)) {
        emptySince = null;
        return false;
      }
      emptySince ??= now;
      if (now - emptySince < ABSENCE_MS) return false;
      isClear = null;
      return true;
    },
  };
}

import type { DetectedDie } from "../dice-types";

type CameraFrame = Pick<ImageData, "data" | "width" | "height">;
interface Sample { x: number; y: number; brightness: number }
interface Reference {
  width: number;
  height: number;
  background: Sample[];
  dice: Sample[][];
}

function brightnessAt(frame: CameraFrame, x: number, y: number): number {
  const index = (y * frame.width + x) * 4;
  return frame.data[index] * 0.299 + frame.data[index + 1] * 0.587 + frame.data[index + 2] * 0.114;
}

function sampleRegion(frame: CameraFrame, region: { x: number; y: number; width: number; height: number }): Sample[] {
  return Array.from({ length: 256 }, (_, i) => {
    const x = Math.max(0, Math.min(frame.width - 1, Math.floor(region.x + (i % 16 + 0.5) * region.width / 16)));
    const y = Math.max(0, Math.min(frame.height - 1, Math.floor(region.y + (Math.floor(i / 16) + 0.5) * region.height / 16)));
    return { x, y, brightness: brightnessAt(frame, x, y) };
  });
}

/** Compare camera pixels with the confirmed roll, independently of recognition. */
export function createRollMotionTracker() {
  let reference: Reference | null = null;

  return {
    capture(frame: CameraFrame, dice: readonly DetectedDie[]) {
      reference = {
        width: frame.width,
        height: frame.height,
        background: sampleRegion(frame, { x: 0, y: 0, width: frame.width, height: frame.height }),
        dice: dice.map((die) => sampleRegion(frame, die)),
      };
    },

    hasMoved(frame: CameraFrame): boolean {
      if (!reference) return false;
      if (frame.width !== reference.width || frame.height !== reference.height) return true;

      // A whole-image exposure shift is not a throw. Most background samples
      // are table pixels, so their median difference estimates that shift.
      const differences = reference.background.map((sample) =>
        brightnessAt(frame, sample.x, sample.y) - sample.brightness,
      ).sort((a, b) => a - b);
      const exposureShift = differences[Math.floor(differences.length / 2)];

      // Require a substantial change within at least one confirmed die. Small
      // edge jitter and pip-threshold changes must not release frozen markers.
      return reference.dice.some((samples) => {
        const changed = samples.filter((sample) =>
          Math.abs(brightnessAt(frame, sample.x, sample.y) - sample.brightness - exposureShift) > 32,
        ).length;
        return changed / samples.length > 0.25;
      });
    },
  };
}

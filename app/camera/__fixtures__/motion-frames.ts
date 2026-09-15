import type { DetectedDie } from "../dice-types";

/** Synthetic camera pixels for testing motion independently of pip recognition. */
export function motionFrame(dice: readonly DetectedDie[], exposure = 0) {
  const width = 640;
  const height = 480;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = 40 + exposure;
    data[i + 3] = 255;
  }
  for (const die of dice) {
    for (let y = Math.max(0, die.y); y < Math.min(height, die.y + die.height); y++) {
      for (let x = Math.max(0, die.x); x < Math.min(width, die.x + die.width); x++) {
        const i = (y * width + x) * 4;
        data[i] = data[i + 1] = data[i + 2] = 200 + exposure;
      }
    }
  }
  return { data, width, height };
}

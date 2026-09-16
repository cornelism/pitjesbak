import type { DetectedDie } from "../dice-types";

/** Map detections in a centered digital crop back to the full camera image. */
export function unzoomDice(dice: readonly DetectedDie[], width: number, height: number, zoom: number): DetectedDie[] {
  const scale = Math.max(1, zoom);
  return dice.map((die) => ({
    ...die,
    x: width / 2 + (die.x - width / 2) / scale,
    y: height / 2 + (die.y - height / 2) / scale,
    width: die.width / scale,
    height: die.height / scale,
  }));
}

import type { DetectedDie } from "../dice-types";
import { RECOVERY_ATTEMPTS, RECOVERY_MATCHES, type RollTrackingState } from "../tracking/roll-tracker";

export function drawMarkers(
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

export function readingStatus(tracked: RollTrackingState, visibleCount: number, expectedCount: number): string {
  if (tracked.recovering) {
    return `Stabilizing dice · ${tracked.matchingAttempts}/${RECOVERY_ATTEMPTS} agreeing readings · need ${RECOVERY_MATCHES}`;
  }
  if (tracked.confirmedDice.length) return "Roll confirmed";
  if (visibleCount === expectedCount) return `${visibleCount} dice visible · hold still to read`;
  return `${visibleCount} of ${expectedCount} dice visible`;
}

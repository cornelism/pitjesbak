import type { DetectedDie, DieValue } from "./dice-types";

const SETTLE_MS = 900;
const REARM_MS = 400;

function sameDice(a: readonly DetectedDie[], b: readonly DetectedDie[]): boolean {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  return a.every((die) => {
    const match = remaining.findIndex((other) =>
      die.value === other.value &&
      Math.hypot(die.x - other.x, die.y - other.y) <= Math.max(3, die.width * 0.08) &&
      Math.abs(die.width - other.width) <= Math.max(3, die.width * 0.1) &&
      Math.abs(die.height - other.height) <= Math.max(3, die.height * 0.1),
    );
    if (match === -1) return false;
    remaining.splice(match, 1);
    return true;
  });
}

/** Emits once after a complete roll settles; sustained motion/removal rearms it. */
export function createRollTracker(expectedCount: number) {
  let candidate: readonly DetectedDie[] = [];
  let candidateSince = 0;
  let logged: readonly DetectedDie[] | null = null;
  let changedSince: number | null = null;

  return (dice: readonly DetectedDie[], now: number): DieValue[] | null => {
    if (logged) {
      if (sameDice(logged, dice)) {
        changedSince = null;
      } else {
        changedSince ??= now;
        if (now - changedSince >= REARM_MS) logged = null;
      }
    }

    if (dice.length !== expectedCount) {
      candidate = [];
      candidateSince = now;
      return null;
    }
    if (!sameDice(candidate, dice)) {
      candidate = dice.map((die) => ({ ...die }));
      candidateSince = now;
      return null;
    }
    if (logged || now - candidateSince < SETTLE_MS) return null;
    logged = dice.map((die) => ({ ...die }));
    changedSince = null;
    return dice.map((die) => die.value);
  };
}

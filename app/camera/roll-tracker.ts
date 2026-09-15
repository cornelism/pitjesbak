import type { DetectedDie, DieValue } from "./dice-types";

const SETTLE_MS = 900;
const REARM_MS = 400;
export const RECOVERY_ATTEMPTS = 10;

export interface RollTrackingState {
  roll: DieValue[] | null;
  confirmedDice: readonly DetectedDie[];
  matchingAttempts: number;
  recovering: boolean;
}

function sameDice(a: readonly DetectedDie[], b: readonly DetectedDie[], compareValues = true): boolean {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  return a.every((die) => {
    const match = remaining.findIndex((other) =>
      (!compareValues || die.value === other.value) &&
      Math.hypot(die.x - other.x, die.y - other.y) <= Math.max(3, die.width * 0.08) &&
      Math.abs(die.width - other.width) <= Math.max(3, die.width * 0.1) &&
      Math.abs(die.height - other.height) <= Math.max(3, die.height * 0.1),
    );
    if (match === -1) return false;
    remaining.splice(match, 1);
    return true;
  });
}

/** Confirm steady rolls normally; require ten consecutive matches after flicker.
 * Brief dropouts retain the confirmed markers. Sustained motion/removal rearms.
 */
export function createRollTracker(expectedCount: number) {
  let candidate: readonly DetectedDie[] = [];
  let candidateSince = 0;
  let matchingAttempts = 0;
  let recovering = false;
  let logged: readonly DetectedDie[] | null = null;
  let changedSince: number | null = null;

  return (dice: readonly DetectedDie[], now: number): RollTrackingState => {
    if (candidate.length && !sameDice(candidate, dice)
      && (dice.length !== expectedCount || sameDice(candidate, dice, false))) recovering = true;

    if (logged) {
      if (sameDice(logged, dice)) {
        changedSince = null;
      } else {
        changedSince ??= now;
        const newThrow = !dice.length || (dice.length === expectedCount && !sameDice(logged, dice, false));
        if (newThrow && now - changedSince >= REARM_MS) {
          // Removal or clear movement starts a new throw. Stationary value
          // changes retain the old confirmation until ten attempts agree.
          recovering = false;
          logged = null;
          candidate = [];
          matchingAttempts = 0;
        }
      }
    }

    let roll: DieValue[] | null = null;
    if (dice.length !== expectedCount) {
      candidate = [];
      matchingAttempts = 0;
      candidateSince = now;
    } else {
      if (!sameDice(candidate, dice)) {
        candidate = dice.map((die) => ({ ...die }));
        candidateSince = now;
        matchingAttempts = 1;
      } else {
        matchingAttempts = Math.min(RECOVERY_ATTEMPTS, matchingAttempts + 1);
      }
      const ready = recovering ? matchingAttempts >= RECOVERY_ATTEMPTS : now - candidateSince >= SETTLE_MS;
      if (ready && (!logged || !sameDice(logged, dice))) {
        logged = dice.map((die) => ({ ...die })).sort((a, b) => a.x - b.x || a.y - b.y);
        roll = logged.map((die) => die.value);
        changedSince = null;
        recovering = false;
      }
      if (logged && sameDice(logged, dice) && matchingAttempts >= RECOVERY_ATTEMPTS) recovering = false;
    }
    return { roll, confirmedDice: logged ?? [], matchingAttempts, recovering };
  };
}

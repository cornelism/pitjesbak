import type { DetectedDie, DieValue } from "./dice-types";

const SETTLE_MS = 900;
const REARM_MS = 400;
export const RECOVERY_ATTEMPTS = 10;
export const RECOVERY_MATCHES = 8;

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
      Math.hypot(die.x + die.width / 2 - other.x - other.width / 2,
        die.y + die.height / 2 - other.y - other.height / 2) <= Math.max(4, die.width * 0.15) &&
      Math.abs(die.width - other.width) <= Math.max(4, die.width * 0.2) &&
      Math.abs(die.height - other.height) <= Math.max(4, die.height * 0.2),
    );
    if (match === -1) return false;
    remaining.splice(match, 1);
    return true;
  });
}

/** Confirm steady rolls normally; use eight-of-ten agreement after flicker.
 * Confirmed rolls stay frozen until sustained motion/removal rearms detection.
 */
export function createRollTracker(expectedCount: number) {
  let candidate: readonly DetectedDie[] = [];
  let positionAnchor: readonly DetectedDie[] = [];
  let attempts: (readonly DetectedDie[])[] = [];
  let candidateSince = 0;
  let matchingAttempts = 0;
  let recovering = false;
  let logged: readonly DetectedDie[] | null = null;
  let changedSince: number | null = null;

  return (dice: readonly DetectedDie[], now: number): RollTrackingState => {
    if (logged) {
      const newThrow = !dice.length || (dice.length === expectedCount && !sameDice(logged, dice, false));
      if (!newThrow) {
        changedSince = null;
      } else {
        changedSince ??= now;
        if (now - changedSince >= REARM_MS) {
          recovering = false;
          logged = null;
          candidate = [];
          positionAnchor = [];
          attempts = [];
          matchingAttempts = 0;
          changedSince = null;
        }
      }
      // Ignore value changes and small jitter after confirmation. Only a new
      // throw can unlock the roll, even if a stationary misread persists.
      if (logged) return { roll: null, confirmedDice: logged, matchingAttempts, recovering: false };
    }

    if (dice.length === expectedCount && !sameDice(positionAnchor, dice, false)) {
      // Compare against a fixed position, so small steps cannot accumulate into
      // an apparently stationary roll. Never carry votes into a new location.
      positionAnchor = dice.map((die) => ({ ...die }));
      candidate = [];
      attempts = [];
      recovering = false;
    }

    if (candidate.length && !sameDice(candidate, dice)
      && (dice.length !== expectedCount || sameDice(candidate, dice, false))) recovering = true;

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
    }
    let confirmed = dice;
    let ready = dice.length === expectedCount && now - candidateSince >= SETTLE_MS;
    if (recovering) {
      attempts.push(dice.map((die) => ({ ...die })));
      if (attempts.length > RECOVERY_ATTEMPTS) attempts.shift();
      matchingAttempts = 0;
      for (const attempt of attempts) {
        if (attempt.length !== expectedCount) continue;
        const matches = attempts.filter((other) => sameDice(attempt, other)).length;
        if (matches > matchingAttempts) {
          matchingAttempts = matches;
          confirmed = attempt;
        }
      }
      // Missing/minority readings count against agreement and cannot trigger
      // confirmation themselves, even when earlier readings have a majority.
      ready = attempts.length === RECOVERY_ATTEMPTS && matchingAttempts >= RECOVERY_MATCHES
        && sameDice(confirmed, dice);
    }
    if (ready) {
      logged = confirmed.map((die) => ({ ...die })).sort((a, b) => a.x - b.x || a.y - b.y);
      roll = logged.map((die) => die.value);
      changedSince = null;
      recovering = false;
    }
    return { roll, confirmedDice: logged ?? [], matchingAttempts, recovering };
  };
}

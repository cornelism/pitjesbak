import type { DetectedDie, DieValue } from "../dice-types";

const SETTLE_MS = 900;
const REARM_MS = 400;
export const RECOVERY_ATTEMPTS = 6;
export const RECOVERY_MATCHES = 5;

export interface RollTrackingState {
  roll: DieValue[] | null;
  confirmedDice: readonly DetectedDie[];
  matchingAttempts: number;
  recovering: boolean;
}

function copyDice(dice: readonly DetectedDie[]): DetectedDie[] {
  return dice.map((die) => ({ ...die }));
}

function samePosition(die: DetectedDie, other: DetectedDie): boolean {
  const dx = die.x + die.width / 2 - other.x - other.width / 2;
  const dy = die.y + die.height / 2 - other.y - other.height / 2;
  const positionTolerance = Math.max(4, die.width * 0.15);
  const widthTolerance = Math.max(4, die.width * 0.2);
  const heightTolerance = Math.max(4, die.height * 0.2);

  return Math.hypot(dx, dy) <= positionTolerance
    && Math.abs(die.width - other.width) <= widthTolerance
    && Math.abs(die.height - other.height) <= heightTolerance;
}

function sameDice(a: readonly DetectedDie[], b: readonly DetectedDie[], compareValues = true): boolean {
  if (a.length !== b.length) return false;
  const remaining = [...b];
  return a.every((die) => {
    const match = remaining.findIndex((other) =>
      (!compareValues || die.value === other.value) && samePosition(die, other),
    );
    if (match === -1) return false;
    remaining.splice(match, 1);
    return true;
  });
}

function findAgreement(attempts: readonly (readonly DetectedDie[])[], expectedCount: number) {
  let dice: readonly DetectedDie[] = [];
  let matches = 0;

  for (const attempt of attempts) {
    if (attempt.length !== expectedCount) continue;
    const count = attempts.filter((other) => sameDice(attempt, other)).length;
    if (count > matches) {
      dice = attempt;
      matches = count;
    }
  }

  return { dice, matches };
}

/**
 * Confirm steady rolls normally; use five-of-six agreement after flicker.
 * Confirmed rolls stay frozen until sustained camera motion rearms detection.
 */
export function createRollTracker(expectedCount: number) {
  let candidate: readonly DetectedDie[] = [];
  let positionAnchor: readonly DetectedDie[] = [];
  let attempts: (readonly DetectedDie[])[] = [];
  let candidateSince = 0;
  let matchingAttempts = 0;
  let recovering = false;
  let confirmedDice: readonly DetectedDie[] | null = null;
  let movementSince: number | null = null;

  function resetCandidate(anchor: readonly DetectedDie[]) {
    positionAnchor = anchor;
    candidate = [];
    attempts = [];
    recovering = false;
    matchingAttempts = 0;
  }

  return (dice: readonly DetectedDie[], now: number, cameraMoved = false): RollTrackingState => {
    const complete = dice.length === expectedCount;
    if (confirmedDice) {
      movementSince = cameraMoved ? movementSince ?? now : null;
      // Ignore value changes and small jitter after confirmation. Only a new
      // throw can unlock the roll, even if a stationary misread persists.
      if (movementSince === null || now - movementSince < REARM_MS) {
        return { roll: null, confirmedDice, matchingAttempts, recovering: false };
      }
      confirmedDice = null;
      movementSince = null;
      resetCandidate([]);
    }

    if (complete && !sameDice(positionAnchor, dice, false)) {
      // Compare against a fixed position, so small steps cannot accumulate into
      // an apparently stationary roll. Never carry votes into a new location.
      resetCandidate(copyDice(dice));
    }

    if (candidate.length && !sameDice(candidate, dice)
      && (!complete || sameDice(candidate, dice, false))) {
      recovering = true;
    }

    if (!complete) {
      candidate = [];
      matchingAttempts = 0;
      candidateSince = now;
    } else if (!sameDice(candidate, dice)) {
      candidate = copyDice(dice);
      candidateSince = now;
      matchingAttempts = 1;
    } else {
      matchingAttempts = Math.min(RECOVERY_ATTEMPTS, matchingAttempts + 1);
    }

    let result = dice;
    let ready = complete && now - candidateSince >= SETTLE_MS;
    if (recovering) {
      attempts.push(copyDice(dice));
      if (attempts.length > RECOVERY_ATTEMPTS) attempts.shift();
      const agreement = findAgreement(attempts, expectedCount);
      matchingAttempts = agreement.matches;
      result = agreement.dice;
      // Missing/minority readings count against agreement and cannot trigger
      // confirmation themselves, even when earlier readings have a majority.
      ready = attempts.length === RECOVERY_ATTEMPTS && matchingAttempts >= RECOVERY_MATCHES
        && sameDice(result, dice);
    }

    let roll: DieValue[] | null = null;
    if (ready) {
      confirmedDice = copyDice(result).sort((a, b) => a.x - b.x || a.y - b.y);
      roll = confirmedDice.map((die) => die.value);
      recovering = false;
    }
    return { roll, confirmedDice: confirmedDice ?? [], matchingAttempts, recovering };
  };
}

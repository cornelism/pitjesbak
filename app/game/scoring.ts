import { DEFAULTS, PRIZE, RULES } from "./constants";
import type { DiceRoll } from "./types";

const { SAND, OTHER_PLAYER_SKIPS_TURN, GETS_200_POINTS, SCORES, RETRY } = RULES;

export const isRollValid = (dice: DiceRoll) => {
  return SAND(dice) ||
    OTHER_PLAYER_SKIPS_TURN(dice) ||
    GETS_200_POINTS(dice) ||
    SCORES(dice) ||
    RETRY(dice);
};

export const calculateScore = (dice: DiceRoll, hasConfirmed?: boolean) => {
  let points = 0;
  if (SAND(dice) && hasConfirmed) {
    points += PRIZE.SAND;
  }
  if (GETS_200_POINTS(dice)) {
    points += PRIZE.GETS_200_POINTS;
  }

  if (SCORES(dice)) {
    dice.forEach((value) => {
      if (value === 1) {
        points += PRIZE.ONE;
      } else if (value === 5) {
        points += PRIZE.FIVE;
      }
    });
  }

  return points;
};

export const roll = () => {
  return Array.from(
    { length: DEFAULTS.DICE_COUNT },
    () => Math.floor(Math.random() * DEFAULTS.DIE_SIDES) + 1
  ).sort((a, b) => b - a) as DiceRoll;
};

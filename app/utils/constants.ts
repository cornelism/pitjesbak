import { DiceRoll } from "./types";

export const DEFAULTS = {
  DICE_COUNT: 3,
  DIE_SIDES: 6,
  DICE_START: [1, 1, 1] as DiceRoll,
  SCORE: 0,
  GOAL: 3000,
} as const;

export const RULES = {
  SAND: (dice: DiceRoll) => dice.every((value) => value === dice[0]),
  SKIP_TURN: (dice: DiceRoll) =>
    dice.includes(6) && dice.includes(3) && dice.includes(1),
  OTHER_PLAYER_SKIPS_TURN: (dice: DiceRoll) =>
    dice.includes(4) && dice.includes(2) && dice.includes(1),
  GETS_200_POINTS: (dice: DiceRoll) =>
    dice.includes(2) && dice.includes(3) && dice.includes(4),
  SCORES: (dice: DiceRoll) => dice.some((value) => value === 1 || value === 5),
  RETRY: (dice: DiceRoll) =>
    dice.includes(6) && dice.includes(4) && dice.includes(2),
} as const;

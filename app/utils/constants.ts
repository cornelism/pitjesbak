import { DiceRoll } from "./types";

export const DEFAULTS = {
  DICE_COUNT: 3,
  DIE_SIDES: 6,
  DICE: [1, 1, 1] as DiceRoll,
  SCORE: 0,
  GOAL: 3000,
  MINIMUM_BANKING_SCORE: 500,
  MULTIPLIER: 1,
  POINTS_TO_CONFIRM: 0,
} as const;

const SAND = (dice: DiceRoll): boolean =>
  dice.every((value) => value === dice[0]);

const OTHER_PLAYER_SKIPS_TURN = (dice: DiceRoll): boolean =>
  dice.includes(4) && dice.includes(2) && dice.includes(1);

const DOUBLE_UP = (dice: DiceRoll): boolean =>
  dice.includes(6) && dice.includes(2) && dice.includes(1);

const GETS_200_POINTS = (dice: DiceRoll): boolean =>
  dice.includes(2) && dice.includes(3) && dice.includes(4);

const SCORES = (dice: DiceRoll): boolean =>
  dice.some((value) => value === 1 || value === 5);

const RETRY = (dice: DiceRoll): boolean =>
  dice.includes(6) && dice.includes(4) && dice.includes(2);

const SKIP_TURN = (dice: DiceRoll): boolean =>
  dice.includes(6) && dice.includes(3) && dice.includes(1);

const PLAYER_BANKING = (score: number): boolean =>
  score < DEFAULTS.MINIMUM_BANKING_SCORE;

const PLAYER_WINS = (score: number): boolean => score === DEFAULTS.GOAL;

export const RULES = {
  SAND,
  SKIP_TURN,
  OTHER_PLAYER_SKIPS_TURN,
  DOUBLE_UP,
  GETS_200_POINTS,
  SCORES,
  RETRY,
  PLAYER_BANKING,
  PLAYER_WINS,
};

export const PRIZE = {
  SAND: 1000,
  GETS_200_POINTS: 200,
  ONE: 100,
  FIVE: 50,
};

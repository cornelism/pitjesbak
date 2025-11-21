"use client";

import { DEFAULTS, RULES } from "./constants";
import { DiceRoll } from "./types";

const { SAND, OTHER_PLAYER_SKIPS_TURN, GETS_200_POINTS, SCORES, RETRY } = RULES;

export const isRollValid = (dice: DiceRoll) => {
  if (
    SAND(dice) ||
    OTHER_PLAYER_SKIPS_TURN(dice) ||
    GETS_200_POINTS(dice) ||
    SCORES(dice) ||
    RETRY(dice)
  ) {
    return true;
  }

  return false;
};

export const calculateScore = (dice: DiceRoll, hasConfirmed?: boolean) => {
  let points = 0;
  if (SAND(dice) && hasConfirmed) {
    points += 1000;
  }
  if (GETS_200_POINTS(dice)) {
    points += 200;
  }

  if (SCORES(dice)) {
    dice.forEach((value) => {
      if (value === 1) {
        points += 100;
      } else if (value === 5) {
        points += 50;
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

export const randomRotation = () => {
  const classes = [
    "rotate-1",
    "-rotate-1",
    "rotate-2",
    "-rotate-2",
    "rotate-3",
    "-rotate-3",
    "rotate-4",
    "-rotate-4",
    "rotate-5",
    "-rotate-5",
    "rotate-6",
    "-rotate-6",
  ];
  return classes[Math.floor(Math.random() * classes.length)];
};

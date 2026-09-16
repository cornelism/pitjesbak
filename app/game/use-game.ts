"use client";

import { useState } from "react";
import { DEFAULTS, PRIZE, RULES } from "./constants";
import type { DiceRoll } from "./types";
import { calculateScore, isRollValid, roll } from "./scoring";

const {
  DICE,
  SCORE,
  MINIMUM_BANKING_SCORE,
  MULTIPLIER,
  POINTS_TO_CONFIRM,
} = DEFAULTS;

const { DOUBLE_UP, SAND } = RULES;

export function useGame() {
  const [dice, setDice] = useState<DiceRoll>(DICE);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState<number>(SCORE);
  const [currentScore, setCurrentScore] = useState<number>(SCORE);
  const [pointsToConfirm, setPointsToConfirm] = useState<number>(POINTS_TO_CONFIRM);
  const [multiplier, setMultiplier] = useState<number>(MULTIPLIER);
  const [decidingToMultiply, setDecidingToMultiply] = useState(false);

  const needsConfirmation = pointsToConfirm > 0;
  const hasBank = (score === 0 && currentScore >= MINIMUM_BANKING_SCORE)
    || (score >= MINIMUM_BANKING_SCORE && currentScore > 0);
  const canTakePoints = hasBank && !needsConfirmation;

  const rollTheDice = () => {
    const newRoll = roll();
    setDice(newRoll);

    if (!isRollValid(newRoll)) {
      setIsGameOver(true);
      return;
    }
    if (DOUBLE_UP(newRoll)) setDecidingToMultiply(true);
    if (SAND(newRoll)) {
      setPointsToConfirm((pointsToConfirm + PRIZE.SAND) * multiplier);
      return;
    }
    const rollScore = calculateScore(newRoll);
    setCurrentScore((currentScore + rollScore + pointsToConfirm) * multiplier);
    setPointsToConfirm(0);
    setDecidingToMultiply(false);
    setMultiplier(MULTIPLIER);
  };

  const cashOut = () => {
    setScore(score + currentScore);
    setCurrentScore(0);
    setMultiplier(MULTIPLIER);
  };

  const resetGame = () => {
    setDice(DICE);
    setIsGameOver(false);
    setCurrentScore(SCORE);
    setMultiplier(MULTIPLIER);
    setPointsToConfirm(POINTS_TO_CONFIRM);
  };

  return {
    dice, isGameOver, score, currentScore, pointsToConfirm, multiplier,
    decidingToMultiply, needsConfirmation, canTakePoints, setMultiplier,
    rollTheDice, cashOut, resetGame,
  };
}

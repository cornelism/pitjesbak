"use client";

import { useMemo, useState } from "react";

import { calculateScore, isRollValid, roll } from "./utils";
import { DiceRoll } from "./utils/types";
import { DEFAULTS, PRIZE, RULES } from "./utils/constants";
import { Dice } from "./components/dice";

import { DialogConfirmDoubleUp } from "./components/dialogConfirmDoubleUp";

const {
  DICE,
  SCORE,
  // GOAL,
  MINIMUM_BANKING_SCORE,
  MULTIPLIER,
  POINTS_TO_CONFIRM,
} = DEFAULTS;

const { DOUBLE_UP, SAND } = RULES;

export default function Home() {
  const [dice, setDice] = useState<DiceRoll>(DICE as DiceRoll);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(SCORE);
  const [currentScore, setCurrentScore] = useState<number>(SCORE);
  const [pointsToConfirm, setPointsToConfirm] =
    useState<number>(POINTS_TO_CONFIRM);
  const [multiplier, setMultiplier] = useState<number>(MULTIPLIER);
  const [needsConfirmDoubleUp, setConfirmNeedsDoubleUp] =
    useState<boolean>(true);

  const needsConfirmation = useMemo(() => {
    return pointsToConfirm > 0;
  }, [pointsToConfirm]);

  const hasBank = useMemo(() => {
    return (
      (score === 0 && currentScore >= MINIMUM_BANKING_SCORE) ||
      (score >= MINIMUM_BANKING_SCORE && currentScore > 0)
    );
  }, [score, currentScore]);

  const canTakePoints = useMemo(() => {
    return hasBank && !needsConfirmation;
  }, [hasBank, needsConfirmation]);

  const rollTheDice = () => {
    const newRoll = roll();
    setDice(newRoll);

    if (!isRollValid(newRoll)) {
      gameOver();
    } else {
      if (DOUBLE_UP(newRoll)) {
        // ask player if they want to double the points from now on
        // OR not
        // OR take points now
      }
      if (SAND(newRoll)) {
        setPointsToConfirm((pointsToConfirm + PRIZE.SAND) * multiplier);
      } else {
        const rollScore = calculateScore(newRoll);
        setCurrentScore(
          currentScore + (rollScore + pointsToConfirm) * multiplier
        );
        setPointsToConfirm(0);
      }
    }
  };

  const cashOut = () => {
    setScore(score + currentScore);
    setCurrentScore(0);
    setMultiplier(MULTIPLIER);
    // setDice(DICE);
  };

  const resetGame = () => {
    setDice(DICE);
    setIsGameOver(false);
    setCurrentScore(SCORE);
    setMultiplier(MULTIPLIER);
    setPointsToConfirm(POINTS_TO_CONFIRM);
  };

  const gameOver = () => {
    // resetGame();
    setIsGameOver(true);
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-(image:--carpet) bg-size-[450px] bg-center font-sans">
      <div className="flex flex-col gap-6 items-center justify-center">
        <h1 className="text-7xl font-bold text-white text-shadow-lg text-shadow-2xl">
          {isGameOver
            ? "Game Over!"
            : needsConfirmation
            ? "Please confirm"
            : "Draadust."}
        </h1>
        <DialogConfirmDoubleUp open={needsConfirmation} />
        <div className="flex flex-row gap-8 text-lg mb-5 text-white text-shadow-2xl">
          <span className="bg-amber-800 rounded-4xl px-3 py-1">
            Score: {score}
          </span>
          <span className="bg-amber-500 rounded-4xl px-3 py-1">
            Current Score: {currentScore}
          </span>
          <span className="bg-blue-400 rounded-4xl px-3 py-1">
            Points to Confirm: {pointsToConfirm}
          </span>
        </div>
        <Dice dice={dice} />
        {isGameOver ? (
          <button
            onClick={resetGame}
            className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Next player, click when ready
          </button>
        ) : (
          <div className="flex flex-row gap-4">
            <button
              onClick={rollTheDice}
              disabled={!isRollValid(dice)}
              className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              {needsConfirmation ? "Roll to Confirm" : "Roll the Dice"}
            </button>
            {canTakePoints && (
              <button
                onClick={cashOut}
                disabled={currentScore === 0}
                className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
              >
                Take Points
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

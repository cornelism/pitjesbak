"use client";

import { useMemo, useState } from "react";

import { calculateScore, isRollValid, randomRotation, roll } from "./utils";
import { DiceRoll } from "./utils/types";
import { DEFAULTS, PRIZE, RULES } from "./utils/constants";
import { Dice } from "./components/dice";

const { DICE, SCORE, GOAL, MINIMUM_BANKING_SCORE } = DEFAULTS;

export default function Home() {
  const [dice, setDice] = useState<DiceRoll>(DICE as DiceRoll);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(SCORE);
  const [currentScore, setCurrentScore] = useState<number>(SCORE);
  const [pointsToConfirm, setPointsToConfirm] = useState<number>(0);

  const needsConfirmation = useMemo(() => {
    return pointsToConfirm > 0;
  }, [pointsToConfirm]);

  const playerHasBankedEnough = useMemo(() => {
    return (
      (score === 0 && currentScore >= MINIMUM_BANKING_SCORE) ||
      (score >= MINIMUM_BANKING_SCORE && currentScore > 0)
    );
  }, [score, currentScore]);

  const canTakePoints = useMemo(() => {
    return playerHasBankedEnough && !needsConfirmation;
  }, [playerHasBankedEnough, needsConfirmation]);

  const rollTheDice = () => {
    const newRoll = roll();
    setDice(newRoll);

    if (!isRollValid(newRoll)) {
      gameOver();
    } else {
      if (RULES.SAND(newRoll)) {
        setPointsToConfirm(pointsToConfirm + PRIZE.SAND);
      } else {
        const rollScore = calculateScore(newRoll);
        setPointsToConfirm(0);
        setCurrentScore(currentScore + rollScore + pointsToConfirm);
      }
    }
  };

  const cashOut = () => {
    setScore(score + currentScore);
    setCurrentScore(0);
    // setDice(DICE);
  };

  const resetGame = () => {
    setDice(DICE);
    setIsGameOver(false);
    setCurrentScore(SCORE);
  };

  const gameOver = () => {
    // resetGame();
    setIsGameOver(true);
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-(image:--carpet) bg-size-[300px] font-sans">
      <div className="flex flex-col gap-6 items-center justify-center">
        <h1 className="text-7xl font-bold text-white text-shadow-lg text-shadow-2xl">
          {isGameOver
            ? "Game Over!"
            : needsConfirmation
            ? "Please confirm"
            : "Draadust."}
        </h1>
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
      {/* <div className="basis-1/2 shadow-lg">
        <div className="bg-white h-full">
          <div className="flex flex-row justify-between">
            <div className=" p-8">
              <h2 className="text-4xl font-bold">Scoresheet</h2>
            </div>
            <div>
              <button className="m-8 rounded-full bg-red-600 px-6 py-3 text-white hover:bg-red-700">
                + Add player
              </button>
            </div>
          </div>
        </div>
      </div> */}
    </main>
  );
}

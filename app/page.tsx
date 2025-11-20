"use client";

import { useState } from "react";

const DEFAULTS = {
  DICE_COUNT: 3,
  DIE_SIDES: 6,
  DICE_START: [1, 1, 1],
  SCORE: 0,
  GOAL: 3000,
};

const isRollValid = (dice: number[]) => {
  return dice.includes(1) || dice.includes(5);
};

const calculateScore = (dice: number[]) => {
  let points = 0;
  dice.forEach((value) => {
    if (value === 5) {
      points += 50;
    } else if (value === 1) {
      points += 100;
    }
  });
  return points;
};

export default function Home() {
  const [dice, setDice] = useState(DEFAULTS.DICE_START);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(DEFAULTS.SCORE);
  const [currentScore, setCurrentScore] = useState(DEFAULTS.SCORE);

  const rollTheDice = () => {
    const newDice = Array.from(
      { length: DEFAULTS.DICE_COUNT },
      () => Math.floor(Math.random() * DEFAULTS.DIE_SIDES) + 1
    ).sort((a, b) => b - a);

    setDice(newDice);

    if (!isRollValid(newDice)) {
      setIsGameOver(true);
      setCurrentScore(0);
    } else {
      const points = calculateScore(newDice);
      setCurrentScore(currentScore + points);
    }
  };

  const cashOut = () => {
    setScore(score + currentScore);
    setCurrentScore(0);
    setDice(DEFAULTS.DICE_START);
  };

  const resetGame = () => {
    setDice(DEFAULTS.DICE_START);
    setIsGameOver(false);
    setScore(DEFAULTS.SCORE);
    setCurrentScore(DEFAULTS.SCORE);
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      {isGameOver ? (
        <h1 className="text-4xl font-bold mb-4 text-red-600">Game Over!</h1>
      ) : (
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Good Luck!
        </h1>
      )}
      <p className="text-lg mb-8 text-gray-700 dark:text-gray-300">
        Score: {score}
      </p>
      <p className="text-lg mb-8 text-gray-700 dark:text-gray-300">
        Current Score: {currentScore}
      </p>
      <div className="grid grid-cols-3 gap-4">
        {dice.map((value, index) => (
          <div
            key={index}
            className="flex h-22 w-22 items-center justify-center rounded-xl bg-white shadow-md dark:bg-zinc-800"
          >
            <div className="flex justify-center items-center w-10 h-10 text-5xl">
              {value}
            </div>
          </div>
        ))}
      </div>
      {isGameOver ? (
        <button
          onClick={resetGame}
          className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Restart Game !
        </button>
      ) : (
        <div className="flex flex-row gap-4">
          <button
            onClick={rollTheDice}
            disabled={!isRollValid(dice)}
            className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            Roll the Dice
          </button>
          <button
            onClick={cashOut}
            disabled={currentScore === 0}
            className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
          >
            Cash Out
          </button>
        </div>
      )}
    </div>
  );
}

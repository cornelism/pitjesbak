"use client";

import { useState } from "react";
import { Die } from "./components/die";
import { calculateScore, isRollValid, randomClass, roll } from "./utils";
import { DiceRoll } from "./utils/types";
import { DEFAULTS } from "./utils/constants";

export default function Home() {
  const { DICE_START, SCORE } = DEFAULTS;

  const [dice, setDice] = useState<DiceRoll>(DICE_START as DiceRoll);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(SCORE);
  const [currentScore, setCurrentScore] = useState<number>(SCORE);

  const rollTheDice = () => {
    const newRoll = roll();

    if (!isRollValid(newRoll)) {
      setIsGameOver(true);
      setCurrentScore(0);
    } else {
      setCurrentScore(currentScore + calculateScore(newRoll));
    }
    setDice(newRoll);
  };

  const cashOut = () => {
    setScore(score + currentScore);
    setCurrentScore(0);
    setDice(DICE_START);
  };

  const resetGame = () => {
    setDice(DICE_START);
    setIsGameOver(false);
    setCurrentScore(SCORE);
  };

  return (
    <main className="flex flex-col gap-6 min-h-screen items-center justify-center bg-(image:--carpet) bg-size-[300px] font-sans">
      <h1 className="text-8xl font-bold text-white text-shadow-lg text-shadow-2xl">
        {isGameOver ? <>Game Over!</> : <>Drieduust.</>}
      </h1>
      <div className="flex flex-row gap-8 text-lg mb-5 text-white text-shadow-2xl">
        <span className="bg-amber-800 rounded-4xl px-3 py-1">
          Score: {score}
        </span>
        <span className="bg-amber-500 rounded-4xl px-3 py-1">
          Current Score: {currentScore}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6 my-24">
        <div className={randomClass()}>
          <Die value={dice[0]} />
        </div>
        <div className={randomClass()}>
          <Die value={dice[1]} />
        </div>
        <div className={randomClass()}>
          <Die value={dice[2]} />
        </div>
      </div>
      {isGameOver ? (
        <button
          onClick={resetGame}
          className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Next Player
        </button>
      ) : (
        <div className="flex flex-row gap-4">
          <button
            onClick={rollTheDice}
            disabled={!isRollValid(dice)}
            className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Roll the Dice
          </button>
          <button
            onClick={cashOut}
            disabled={currentScore === 0}
            className="mt-8 rounded-full bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Take & Next Player
          </button>
        </div>
      )}
    </main>
  );
}

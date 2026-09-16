"use client";

import { DialogConfirmDoubleUp } from "./components/dialog-confirm-double-up";
import { Dice } from "./components/dice";
import { isRollValid } from "./scoring";
import { useGame } from "./use-game";

export default function GamePage() {
  const {
    dice, isGameOver, score, currentScore, pointsToConfirm, multiplier,
    decidingToMultiply, needsConfirmation, canTakePoints, setMultiplier,
    rollTheDice, cashOut, resetGame,
  } = useGame();

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
        <DialogConfirmDoubleUp
          open={decidingToMultiply}
          setMultiplier={setMultiplier}
          setOpen={() => {}}
        />
        <div className="flex flex-row gap-8 text-lg mb-5 text-white text-shadow-2xl">
          <span className="bg-amber-800 rounded-4xl px-3 py-1">
            Score: {score}
          </span>
          <span className="bg-amber-500 rounded-4xl px-3 py-1">
            Current Score: {currentScore}
          </span>
          <span className="bg-green-400 rounded-4xl px-3 py-1">
            Multiplier: x{multiplier}
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

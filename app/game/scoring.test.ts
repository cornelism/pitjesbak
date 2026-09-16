import { describe, expect, it, vi } from "vitest";
import { calculateScore, isRollValid, roll } from "./scoring";
import type { DiceRoll } from "./types";

describe("game scoring", () => {
  it.each<{ dice: DiceRoll; confirmed?: boolean; score: number }>([
    { dice: [1, 5, 2], score: 150 },
    { dice: [4, 3, 2], score: 200 },
    { dice: [3, 3, 3], score: 0 },
    { dice: [3, 3, 3], confirmed: true, score: 1000 },
    { dice: [1, 1, 1], confirmed: true, score: 1300 },
    { dice: [6, 4, 2], score: 0 },
  ])("scores $dice with confirmation=$confirmed as $score", ({ dice, confirmed, score }) => {
    expect(calculateScore(dice, confirmed)).toBe(score);
  });

  it.each<{ dice: DiceRoll; valid: boolean }>([
    { dice: [6, 4, 2], valid: true },
    { dice: [3, 3, 3], valid: true },
    { dice: [4, 3, 2], valid: true },
    { dice: [6, 2, 1], valid: true },
    { dice: [6, 3, 2], valid: false },
  ])("validates $dice as $valid", ({ dice, valid }) => {
    expect(isRollValid(dice)).toBe(valid);
  });

  it("rolls three six-sided dice in descending order", () => {
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0.999).mockReturnValueOnce(0.5);
    expect(roll()).toEqual([6, 4, 1]);
  });
});

import { expect, it } from "vitest";
import { unzoomDice } from "./frame-coordinates";

it("maps centered digital-crop bounds into the full camera field without mutating them", () => {
  const dice = [{ value: 4 as const, x: 100, y: 80, width: 40, height: 30 }];
  expect(unzoomDice(dice, 640, 360, 2)).toEqual([{ value: 4, x: 210, y: 130, width: 20, height: 15 }]);
  expect(unzoomDice(dice, 640, 360, 1)).toEqual(dice);
  expect(dice[0]).toEqual({ value: 4, x: 100, y: 80, width: 40, height: 30 });
});

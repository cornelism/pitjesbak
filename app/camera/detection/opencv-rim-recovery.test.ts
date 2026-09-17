// @vitest-environment node
import { beforeAll, beforeEach, expect, it, vi } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { loadTestOpenCv } from "./__test-helpers__/opencv";
import { detectDiceOpenCv } from "./opencv-dice";
import { readDiceMask } from "./read-dice-mask";
import { createDiceMasks } from "./dice-masks";

vi.mock("./read-dice-mask", () => ({ readDiceMask: vi.fn() }));
vi.mock("./dice-masks", () => ({ createDiceMasks: vi.fn() }));
let cv: typeof OpenCv;
beforeAll(async () => { ({ cv } = await loadTestOpenCv()); });
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createDiceMasks).mockImplementation((_cv, _frame, _angle, own) => ({
    binary: own(cv.Mat.zeros(100, 100, cv.CV_8UC1)), local: null,
  }));
});

it.each([
  { value: 5 as const, x: 20, expected: [5] },
  { value: 4 as const, x: 20, expected: [] },
  { value: 5 as const, x: 60, expected: [] },
])("accepts only a matching recovered top with enough pips: $value at x=$x", ({ value, x, expected }) => {
  const bounds = { x: 20, y: 20, width: 30, height: 20 };
  vi.mocked(readDiceMask).mockImplementation((_cv, _mask, _angle, onCandidate, detail) => {
    onCandidate?.(bounds, 5, true);
    return detail === "rim" ? [{ ...bounds, x, value }] : [];
  });
  const result = detectDiceOpenCv(cv, { width: 100, height: 100, data: new Uint8ClampedArray(40_000) }, 65);
  expect(result.map((die) => die.value)).toEqual(expected);
});

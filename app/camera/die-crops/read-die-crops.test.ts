import { beforeEach, expect, it, vi } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv } from "../detection/opencv-dice";
import { readDieCrops } from "./read-die-crops";
import type { DetectedDie } from "../dice-types";

vi.mock("../detection/opencv-dice", () => ({ detectDiceOpenCv: vi.fn() }));
const cv = {} as typeof OpenCv;
const die: DetectedDie = { value: 4, x: 200, y: 100, width: 40, height: 30 };
function options() {
  return {
    overviewSize: { width: 640, height: 360 }, sourceSize: { width: 1920, height: 1080 },
    zoom: 1, cameraTilt: 70, expectedCount: 3, dice: [die], candidates: [],
    readCrop: vi.fn(({ width, height }) => ({ width, height, data: new Uint8ClampedArray(width * height * 4), colorSpace: "srgb" as const })),
  };
}
beforeEach(() => { vi.mocked(detectDiceOpenCv).mockReset(); });

it("refines a count from native pixels while preserving marker geometry", () => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([{ value: 6, x: 120, y: 120, width: 120, height: 90 }]);
  const result = readDieCrops(cv, options());
  expect(result.dice).toEqual([{ ...die, value: 6 }]);
  expect(result.batch.crops[0]).toMatchObject({ overviewValue: 4, cropValue: 6, used: true, image: { width: 360, height: 330 } });
  expect(die.value).toBe(4);
});

it("recovers an unread candidate and translates its crop result to the overview", () => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([{ value: 6, x: 120, y: 120, width: 120, height: 90 }]);
  const result = readDieCrops(cv, { ...options(), dice: [], candidates: [{ ...die, pipCount: 3 }] });
  expect(result.dice).toEqual([{ ...die, value: 6 }]);
  expect(result.batch.crops[0].overviewValue).toBeNull();
});

it("does not substitute another die seen at the edge of a crop", () => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([{ value: 6, x: 0, y: 0, width: 60, height: 60 }]);
  expect(readDieCrops(cv, options()).dice).toEqual([die]);
});

it("keeps the overview reading when the crop has two competing faces", () => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([
    { value: 6, x: 120, y: 120, width: 80, height: 60 },
    { value: 2, x: 170, y: 120, width: 80, height: 60 },
  ]);
  expect(readDieCrops(cv, options()).dice).toEqual([die]);
});

it("deduplicates candidates and limits crops to the requested dice count", () => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([]);
  const input = options();
  const result = readDieCrops(cv, { ...input, expectedCount: 2, candidates: [
    { ...die, pipCount: 4 }, { ...die, x: 400, pipCount: 3 }, { ...die, x: 500, pipCount: 1 },
  ] });
  expect(input.readCrop).toHaveBeenCalledTimes(2);
  expect(result.batch.crops.map((crop) => crop.candidate.x)).toEqual([200, 400]);
});

it("saves crops without claiming extra detail when digital zoom uses the native resolution", () => {
  const input = { ...options(), zoom: 3 };
  const result = readDieCrops(cv, input);
  expect(detectDiceOpenCv).not.toHaveBeenCalled();
  expect(result.dice).toEqual([die]);
  expect(result.batch.crops).toHaveLength(1);
  expect(result.batch.crops[0].used).toBe(false);
});

it.each([
  [6, 3],
  [6, 4],
  [5, 4],
  [3, 1],
] as const)("preserves a validated %i when crop thresholding reports only %i pips", (overviewValue, cropValue) => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([{ value: cropValue, x: 120, y: 120, width: 120, height: 90 }]);
  const original = { ...die, value: overviewValue };
  const result = readDieCrops(cv, { ...options(), dice: [original] });
  expect(result.dice).toEqual([original]);
  expect(result.batch.crops[0]).toMatchObject({ overviewValue, cropValue, used: false });
});

it("accepts a crop that corroborates the overview reading", () => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([{ value: 4, x: 120, y: 120, width: 120, height: 90 }]);
  const result = readDieCrops(cv, options());
  expect(result.dice).toEqual([die]);
  expect(result.batch.crops[0]).toMatchObject({ overviewValue: 4, cropValue: 4, used: true });
});

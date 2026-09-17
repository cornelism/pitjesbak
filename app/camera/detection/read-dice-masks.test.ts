import { beforeEach, expect, it, vi } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { readDiceMask } from "./read-dice-mask";
import { readDiceMasks } from "./read-dice-masks";

vi.mock("./read-dice-mask", () => ({ readDiceMask: vi.fn() }));
const cv = {} as typeof OpenCv;
const binary = {} as OpenCv.Mat;
const local = {} as OpenCv.Mat;
beforeEach(() => { vi.mocked(readDiceMask).mockReset().mockReturnValue([]); });

it("defers each mask read until the previous results have been consumed", () => {
  const options = { cameraTilt: 70, detail: "rim" as const, pipIntensities: {} as OpenCv.Mat };
  const readings = readDiceMasks(cv, { binary, local }, options);
  expect(readDiceMask).not.toHaveBeenCalled();
  readings.next();
  expect(readDiceMask).toHaveBeenCalledTimes(1);
  expect(vi.mocked(readDiceMask).mock.calls[0][1]).toBe(binary);
  readings.next();
  expect(readDiceMask).toHaveBeenCalledTimes(2);
  expect(vi.mocked(readDiceMask).mock.calls[1][1]).toBe(local);
  expect(vi.mocked(readDiceMask).mock.calls[1][2]).toBe(options);
  expect(readings.next().done).toBe(true);
});

it("performs one pass when no local mask was needed", () => {
  expect([...readDiceMasks(cv, { binary, local: null }, { cameraTilt: 0 })]).toEqual([[]]);
  expect(readDiceMask).toHaveBeenCalledTimes(1);
});

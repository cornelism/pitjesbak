import { beforeEach, expect, it, vi } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv } from "../detection/opencv-dice";
import type { DetectedDie } from "../dice-types";
import { readNativeCrop } from "./read-native-crop";

vi.mock("../detection/opencv-dice", () => ({ detectDiceOpenCv: vi.fn() }));
const cv = {} as typeof OpenCv;
const face: DetectedDie = { value: 6, x: 20, y: 20, width: 30, height: 30 };
function options() {
  const data = new Uint8ClampedArray(80 * 80 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i + 1] = data[i + 2] = i < data.length / 2 ? 80 : 160;
    data[i + 3] = 255;
  }
  return {
    image: { data, width: 80, height: 80, colorSpace: "srgb" as const },
    candidate: face, source: { x: 0, y: 0, width: 80, height: 80 },
    sourceSize: { width: 80, height: 80 }, overviewSize: { width: 80, height: 80 },
    zoom: 1, cameraTilt: 70,
  };
}

beforeEach(() => { vi.mocked(detectDiceOpenCv).mockReset(); });

it("retries unread faces with contrast without changing the saved native pixels", () => {
  const input = options();
  const nativePixels = input.image.data.slice();
  vi.mocked(detectDiceOpenCv).mockReturnValueOnce([]).mockReturnValueOnce([face]);

  expect(readNativeCrop(cv, input)).toEqual({ match: face, preprocessing: "contrast" });
  const calls = vi.mocked(detectDiceOpenCv).mock.calls;
  expect(calls).toHaveLength(2);
  expect(calls[0][1]).toBe(input.image);
  expect(calls[1][1].data).not.toEqual(nativePixels);
  expect(input.image.data).toEqual(nativePixels);
});

it("leaves competing faces unresolved without a contrast retry", () => {
  vi.mocked(detectDiceOpenCv).mockReturnValue([face, { ...face, x: 25, value: 4 }]);

  expect(readNativeCrop(cv, options())).toEqual({ match: null, preprocessing: "raw" });
  expect(detectDiceOpenCv).toHaveBeenCalledTimes(1);
});

it("does not repeat detection when there is no useful contrast range", () => {
  const input = options();
  input.image.data.fill(80);
  vi.mocked(detectDiceOpenCv).mockReturnValue([]);

  expect(readNativeCrop(cv, input)).toEqual({ match: null, preprocessing: "raw" });
  expect(detectDiceOpenCv).toHaveBeenCalledTimes(1);
});

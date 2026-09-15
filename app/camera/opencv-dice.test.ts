// @vitest-environment node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv } from "./opencv-dice";

let cv: typeof OpenCv;
beforeAll(async () => {
  const runtime: typeof OpenCv & { onRuntimeInitialized: () => void } = createRequire(import.meta.url)("@techstark/opencv-js");
  // OpenCV 4.12 is a self-resolving thenable. Await a wrapper, never the runtime.
  if (!runtime.Mat) await new Promise<void>((resolve) => { runtime.onRuntimeInitialized = resolve; });
  cv = runtime;
});

const png = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice.png", import.meta.url)));
const capturedFrame = { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };

describe("OpenCV real-camera recognition", () => {
  it("reads only the top faces of the captured dice: 3, 5, 3", () => {
    const dice = detectDiceOpenCv(cv, capturedFrame, 45);
    expect(dice.map((die) => die.value)).toEqual([3, 5, 3]);
    expect(dice.map((die) => Math.round(die.x / 10))).toEqual([19, 30, 37]);
  });

  it.each([40, 50])("tolerates a nearby camera-angle setting of %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, capturedFrame, angle).map((die) => die.value)).toEqual([3, 5, 3]);
  });

  it("keeps working with moderate exposure changes", () => {
    for (const exposure of [0.8, 1.15]) {
      const data = capturedFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
      expect(detectDiceOpenCv(cv, { ...capturedFrame, data }, 45).map((die) => die.value)).toEqual([3, 5, 3]);
    }
  });
});

// @vitest-environment node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { PNG } from "pngjs";
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv } from "./opencv-dice";
import type { DieValue } from "./dice-types";

let cv: typeof OpenCv;
beforeAll(async () => {
  const runtime: typeof OpenCv & { onRuntimeInitialized: () => void } = createRequire(import.meta.url)("@techstark/opencv-js");
  // OpenCV 4.12 is a self-resolving thenable. Await a wrapper, never the runtime.
  if (!runtime.Mat) await new Promise<void>((resolve) => { runtime.onRuntimeInitialized = resolve; });
  cv = runtime;
});

const png = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice.png", import.meta.url)));
const capturedFrame = { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
const newRollPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice-6-1-5.png", import.meta.url)));
const newRollFrame = { width: newRollPng.width, height: newRollPng.height, data: new Uint8ClampedArray(newRollPng.data) };

function cropNewRoll(x: number, y: number, width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) {
    const start = ((y + row) * newRollFrame.width + x) * 4;
    data.set(newRollFrame.data.subarray(start, start + width * 4), row * width * 4);
  }
  return { width, height, data };
}

// Ray-cast an actual cube, including pips on two visible side faces. This fixture
// is independent of the detector's silhouette-based top-face calculation.
function renderCube(value: DieValue, yaw: number) {
  const width = 240, height = 200, half = 30;
  const data = new Uint8ClampedArray(width * height * 4);
  const layouts = [
    [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]],
    [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  ];
  const tilt = Math.PI / 4;
  const direction = [-Math.sin(tilt) * Math.sin(yaw), -Math.sin(tilt) * Math.cos(yaw), -Math.cos(tilt)];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x - width / 2, sy = y - height / 2;
      const worldY = sy * Math.cos(tilt) + 100 * Math.sin(tilt);
      const origin = [sx * Math.cos(yaw) + worldY * Math.sin(yaw), -sx * Math.sin(yaw) + worldY * Math.cos(yaw), -sy * Math.sin(tilt) + 100 * Math.cos(tilt)];
      let near = -Infinity, far = Infinity, face = -1;
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(direction[axis]) < 1e-6) {
          if (Math.abs(origin[axis]) > half) far = -Infinity;
          continue;
        }
        const a = (-half - origin[axis]) / direction[axis];
        const b = (half - origin[axis]) / direction[axis];
        if (Math.min(a, b) > near) { near = Math.min(a, b); face = axis; }
        far = Math.min(far, Math.max(a, b));
      }
      let color = 40;
      if (near <= far && face >= 0) {
        const point = origin.map((o, axis) => o + near * direction[axis]);
        const [u, v] = face === 2 ? [point[0], point[1]] : face === 1 ? [point[0], point[2]] : [point[1], point[2]];
        color = face === 2 ? 235 : face === 1 ? 170 : 150;
        const pips = layouts[face === 2 ? value - 1 : face === 1 ? 0 : 4];
        if (pips.some(([px, py]) => Math.hypot(u - px * 13.8, v - py * 13.8) < 4.5)) color = 20;
      }
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = color;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

describe("OpenCV real-camera recognition", () => {
  // Independently labeled from the raw camera image, not detector predictions.
  // Regression for small rim pips and foreshortened top faces.
  it("reads the new captured roll's top faces from left to right: 6, 1, 5", () => {
    expect(detectDiceOpenCv(cv, newRollFrame, 45).map((die) => die.value)).toEqual([6, 1, 5]);
  });

  it.each([
    { value: 6, x: 48, y: 145 },
    { value: 1, x: 272, y: 240 },
    { value: 5, x: 448, y: 48 },
  ] satisfies { value: DieValue; x: number; y: number }[])("reads top face $value in an isolated crop of the new roll", ({ value, x, y }) => {
    // Preserve camera pixel scale and include background around the whole cube.
    expect(detectDiceOpenCv(cv, cropNewRoll(x, y, 128, 128), 45).map((die) => die.value)).toEqual([value]);
  });

  it.each([0.8, 1.15])("reads the new roll at exposure multiplier %s", (exposure) => {
    const data = newRollFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...newRollFrame, data }, 45).map((die) => die.value)).toEqual([6, 1, 5]);
  });

  it.each([40, 50])("reads the new roll with the angle setting at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, newRollFrame, angle).map((die) => die.value)).toEqual([6, 1, 5]);
  });

  it.each<DieValue>([1, 2, 3, 4, 5, 6])("reads top value %i on rotated cubes with visible side pips", (value) => {
    for (const yaw of [0, 0.4, 0.8, 1.2]) {
      expect(detectDiceOpenCv(cv, renderCube(value, yaw), 45).map((die) => die.value), `yaw ${yaw}`).toEqual([value]);
    }
  });
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

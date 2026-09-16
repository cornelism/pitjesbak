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
const shadedRollPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice-2-4-1.png", import.meta.url)));
const shadedRollFrame = { width: shadedRollPng.width, height: shadedRollPng.height, data: new Uint8ClampedArray(shadedRollPng.data) };
const clusteredRollPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice-1-6-2.png", import.meta.url)));
const clusteredRollFrame = { width: clusteredRollPng.width, height: clusteredRollPng.height, data: new Uint8ClampedArray(clusteredRollPng.data) };
const misreadSixPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice-4-6-1.png", import.meta.url)));
const misreadSixFrame = { width: misreadSixPng.width, height: misreadSixPng.height, data: new Uint8ClampedArray(misreadSixPng.data) };

const sidePipsPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice-1-2-4.png", import.meta.url)));
const sidePipsFrame = { width: sidePipsPng.width, height: sidePipsPng.height, data: new Uint8ClampedArray(sidePipsPng.data) };

const closeRollPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice-3-3-4.png", import.meta.url)));
const closeRollFrame = { width: closeRollPng.width, height: closeRollPng.height, data: new Uint8ClampedArray(closeRollPng.data) };

const touchingRollPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/angled-dice-2-2-6.png", import.meta.url)));
const touchingRollFrame = { width: touchingRollPng.width, height: touchingRollPng.height, data: new Uint8ClampedArray(touchingRollPng.data) };

const brightRollPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/bright-dice-1-1-1.png", import.meta.url)));
const brightRollFrame = { width: brightRollPng.width, height: brightRollPng.height, data: new Uint8ClampedArray(brightRollPng.data) };

const touchingChainPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/touching-dice-1-4-2.png", import.meta.url)));
const touchingChainFrame = { width: touchingChainPng.width, height: touchingChainPng.height, data: new Uint8ClampedArray(touchingChainPng.data) };

const touchingLivePng = PNG.sync.read(readFileSync(new URL("./__fixtures__/touching-dice-1-4-2-live.png", import.meta.url)));
const touchingLiveFrame = { width: touchingLivePng.width, height: touchingLivePng.height, data: new Uint8ClampedArray(touchingLivePng.data) };

const touchingJitterPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/touching-dice-1-4-2-jitter.png", import.meta.url)));
const touchingJitterFrame = { width: touchingJitterPng.width, height: touchingJitterPng.height, data: new Uint8ClampedArray(touchingJitterPng.data) };

const shallowChainPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/touching-dice-1-1-3.png", import.meta.url)));
const shallowChainFrame = { width: shallowChainPng.width, height: shallowChainPng.height, data: new Uint8ClampedArray(shallowChainPng.data) };
const shallowChainLivePng = PNG.sync.read(readFileSync(new URL("./__fixtures__/touching-dice-1-1-3-live.png", import.meta.url)));
const shallowChainLiveFrame = { width: shallowChainLivePng.width, height: shallowChainLivePng.height, data: new Uint8ClampedArray(shallowChainLivePng.data) };

const nearPipChainPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/touching-dice-3-1-3.png", import.meta.url)));
const nearPipChainFrame = { width: nearPipChainPng.width, height: nearPipChainPng.height, data: new Uint8ClampedArray(nearPipChainPng.data) };

const rimPipPng = PNG.sync.read(readFileSync(new URL("./__fixtures__/rim-pip-dice-3-3-3.png", import.meta.url)));
const rimPipFrame = { width: rimPipPng.width, height: rimPipPng.height, data: new Uint8ClampedArray(rimPipPng.data) };

const distancePng = PNG.sync.read(readFileSync(new URL("./__fixtures__/shaded-distance-dice-3-3-3.png", import.meta.url)));
const distanceFrame = { width: distancePng.width, height: distancePng.height, data: new Uint8ClampedArray(distancePng.data) };
const distanceLivePng = PNG.sync.read(readFileSync(new URL("./__fixtures__/shaded-distance-dice-3-3-3-live.png", import.meta.url)));
const distanceLiveFrame = { width: distanceLivePng.width, height: distanceLivePng.height, data: new Uint8ClampedArray(distanceLivePng.data) };

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
function renderCube(value: DieValue, yaw: number, sideValues: readonly [DieValue, DieValue] = [1, 5]) {
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
        const pips = layouts[face === 2 ? value - 1 : sideValues[face === 1 ? 0 : 1] - 1];
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
  it("reads the distant dice in a later live frame without duplicate detections", () => {
    expect(detectDiceOpenCv(cv, distanceLiveFrame, 50).map((die) => die.value)).toEqual([3, 3, 3]);
  });

  it.each([45, 50, 55])("reads the dim distant dice in the captured 3, 3, 3 roll at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, distanceFrame, angle).map((die) => die.value)).toEqual([3, 3, 3]);
  });

  it.each([0.8, 1.15])("reads the distant-dice roll at exposure multiplier %s", (exposure) => {
    const data = distanceFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...distanceFrame, data }, 50).map((die) => die.value)).toEqual([3, 3, 3]);
  });

  it.each([45, 50, 55])("preserves the rim pip in the captured 3, 3, 3 roll at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, rimPipFrame, angle).map((die) => die.value)).toEqual([3, 3, 3]);
  });

  it.each([0.8, 1.15])("reads the rim-pip roll at exposure multiplier %s", (exposure) => {
    const data = rimPipFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...rimPipFrame, data }, 50).map((die) => die.value)).toEqual([3, 3, 3]);
  });

  it.each([45, 50])("reads the touching 3, 1, 3 chain without cutting a pip at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, nearPipChainFrame, angle).map((die) => die.value)).toEqual([3, 1, 3]);
  });

  it.each([0.8, 1.15])("preserves the 3, 1, 3 chain at exposure multiplier %s", (exposure) => {
    const data = nearPipChainFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...nearPipChainFrame, data }, 45).map((die) => die.value)).toEqual([3, 1, 3]);
  });

  it("reads the 1, 1, 3 chain in a later live camera frame", () => {
    expect(detectDiceOpenCv(cv, shallowChainLiveFrame, 45).map((die) => die.value)).toEqual([1, 1, 3]);
  });

  it.each([40, 45, 50])("separates the captured 1, 1, 3 chain with shallow contact notches at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, shallowChainFrame, angle).map((die) => die.value)).toEqual([1, 1, 3]);
  });

  it.each([0.8, 1.15])("reads the 1, 1, 3 chain at exposure multiplier %s", (exposure) => {
    const data = shallowChainFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...shallowChainFrame, data }, 45).map((die) => die.value)).toEqual([1, 1, 3]);
  });

  it("reads the touching 1, 4, 2 chain through contour jitter", () => {
    expect(detectDiceOpenCv(cv, touchingJitterFrame, 50).map((die) => die.value)).toEqual([1, 4, 2]);
  });

  it("reads the touching 1, 4, 2 chain in a later live frame", () => {
    expect(detectDiceOpenCv(cv, touchingLiveFrame, 50).map((die) => die.value)).toEqual([1, 4, 2]);
  });

  it("reads the captured chain of touching dice: 1, 4, 2", () => {
    expect(detectDiceOpenCv(cv, touchingChainFrame, 50).map((die) => die.value)).toEqual([1, 4, 2]);
  });

  it.each([0.8, 1.15])("reads the touching 1, 4, 2 chain at exposure multiplier %s", (exposure) => {
    const data = touchingChainFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...touchingChainFrame, data }, 50).map((die) => die.value)).toEqual([1, 4, 2]);
  });

  it("reads the brightly lit captured 1, 1, 1 roll at 50 degrees", () => {
    expect(detectDiceOpenCv(cv, brightRollFrame, 50).map((die) => die.value)).toEqual([1, 1, 1]);
  });

  it.each([0.8, 1.15])("reads the bright 1, 1, 1 roll at exposure multiplier %s", (exposure) => {
    const data = brightRollFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...brightRollFrame, data }, 50).map((die) => die.value)).toEqual([1, 1, 1]);
  });

  it.each([45, 55])("reads the bright 1, 1, 1 roll at nearby angle %i", (angle) => {
    expect(detectDiceOpenCv(cv, brightRollFrame, angle).map((die) => die.value)).toEqual([1, 1, 1]);
  });

  it.each([0, 80, 160, 255])("does not invent dice in a uniform frame of brightness %i", (brightness) => {
    const width = 160, height = 120;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) data.set([brightness, brightness, brightness, 255], i);
    expect(detectDiceOpenCv(cv, { width, height, data }, 50)).toEqual([]);
  });

  it.each([
    { name: "large centered one", pips: [[80, 80]], radius: 19, expected: [1] },
    { name: "oversized mark", pips: [[80, 80]], radius: 25, expected: [] },
    { name: "large off-center mark", pips: [[99, 80]], radius: 17, expected: [] },
    { name: "oversized pips on a two", pips: [[60, 60], [100, 100]], radius: 15, expected: [] },
  ])("validates $name without relaxing other pip checks", ({ pips, radius, expected }) => {
    const width = 160, height = 160;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const face = x >= 40 && x < 120 && y >= 40 && y < 120;
        const pip = pips.some(([px, py]) => Math.hypot(x - px, y - py) < radius);
        const shade = face && !pip ? 230 : 20;
        data.set([shade, shade, shade, 255], (y * width + x) * 4);
      }
    }
    expect(detectDiceOpenCv(cv, { width, height, data }, 0).map((die) => die.value)).toEqual(expected);
  });

  it("reads the captured touching dice with top faces 2, 2, 6", () => {
    expect(detectDiceOpenCv(cv, touchingRollFrame, 45).map((die) => die.value)).toEqual([2, 2, 6]);
  });

  it.each([0.8, 1.15])("separates the 2, 2, 6 roll at exposure multiplier %s", (exposure) => {
    const data = touchingRollFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...touchingRollFrame, data }, 45).map((die) => die.value)).toEqual([2, 2, 6]);
  });

  it.each([40, 50])("separates the 2, 2, 6 roll at nearby angle %i", (angle) => {
    expect(detectDiceOpenCv(cv, touchingRollFrame, angle).map((die) => die.value)).toEqual([2, 2, 6]);
  });

  it("reads the captured nearby dice with top faces 3, 3, 4", () => {
    expect(detectDiceOpenCv(cv, closeRollFrame, 45).map((die) => die.value)).toEqual([3, 3, 4]);
  });

  it.each([0.8, 1.15])("separates the 3, 3, 4 roll at exposure multiplier %s", (exposure) => {
    const data = closeRollFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...closeRollFrame, data }, 45).map((die) => die.value)).toEqual([3, 3, 4]);
  });

  it.each([40, 50])("separates the 3, 3, 4 roll at nearby angle %i", (angle) => {
    expect(detectDiceOpenCv(cv, closeRollFrame, angle).map((die) => die.value)).toEqual([3, 3, 4]);
  });

  it("reads the captured 1, 2, 4 roll with visible side pips at 45 degrees", () => {
    expect(detectDiceOpenCv(cv, sidePipsFrame, 45).map((die) => die.value)).toEqual([1, 2, 4]);
  });

  it.each([0.8, 1.15])("reads the 1, 2, 4 roll at exposure multiplier %s", (exposure) => {
    const data = sidePipsFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...sidePipsFrame, data }, 45).map((die) => die.value)).toEqual([1, 2, 4]);
  });

  it.each([40, 50])("reads the 1, 2, 4 roll at nearby angle %i", (angle) => {
    expect(detectDiceOpenCv(cv, sidePipsFrame, angle).map((die) => die.value)).toEqual([1, 2, 4]);
  });

  it("does not mistake the six for four in the captured 4, 6, 1 roll at 50 degrees", () => {
    expect(detectDiceOpenCv(cv, misreadSixFrame, 50).map((die) => die.value)).toEqual([4, 6, 1]);
  });

  it.each([0.8, 1.15])("counts all six top pips in the 4, 6, 1 roll at exposure multiplier %s", (exposure) => {
    const data = misreadSixFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...misreadSixFrame, data }, 50).map((die) => die.value)).toEqual([4, 6, 1]);
  });

  it.each<DieValue>([1, 2, 3, 4, 5, 6])("counts only top face %i when both visible sides have six pips", (value) => {
    for (const yaw of [0, 0.4, 0.8, 1.2]) {
      expect(detectDiceOpenCv(cv, renderCube(value, yaw, [6, 6]), 45).map((die) => die.value), `yaw ${yaw}`).toEqual([value]);
    }
  });

  it("reads the captured 1, 6, 2 roll at its 50-degree camera setting", () => {
    expect(detectDiceOpenCv(cv, clusteredRollFrame, 50).map((die) => die.value)).toEqual([1, 6, 2]);
  });

  it.each([0.8, 1.15])("preserves the six in the 1, 6, 2 roll at exposure multiplier %s", (exposure) => {
    const data = clusteredRollFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...clusteredRollFrame, data }, 50).map((die) => die.value)).toEqual([1, 6, 2]);
  });

  it("reads the browser's raw camera frame with shaded sides: 2, 4, 1", () => {
    expect(detectDiceOpenCv(cv, shadedRollFrame, 45).map((die) => die.value)).toEqual([2, 4, 1]);
  });

  it.each([0.8, 1.15])("reads the shaded roll at exposure multiplier %s", (exposure) => {
    const data = shadedRollFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...shadedRollFrame, data }, 45).map((die) => die.value)).toEqual([2, 4, 1]);
  });

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

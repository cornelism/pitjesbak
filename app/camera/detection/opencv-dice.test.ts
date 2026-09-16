// @vitest-environment node
import { readFileSync } from "node:fs";
import { loadTestOpenCv } from "./__test-helpers__/opencv";
import { PNG } from "pngjs";
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv } from "./opencv-dice";
import type { DieValue } from "../dice-types";

let cv: typeof OpenCv;
beforeAll(async () => {
  ({ cv } = await loadTestOpenCv());
});

function loadCameraFrame(name: string) {
  const png = PNG.sync.read(readFileSync(new URL(`../__fixtures__/${name}`, import.meta.url)));
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

const capturedFrame = loadCameraFrame("angled-dice.png");
const newRollFrame = loadCameraFrame("angled-dice-6-1-5.png");
const shadedRollFrame = loadCameraFrame("angled-dice-2-4-1.png");
const clusteredRollFrame = loadCameraFrame("angled-dice-1-6-2.png");
const misreadSixFrame = loadCameraFrame("angled-dice-4-6-1.png");

const sidePipsFrame = loadCameraFrame("angled-dice-1-2-4.png");

const closeRollFrame = loadCameraFrame("angled-dice-3-3-4.png");

const touchingRollFrame = loadCameraFrame("angled-dice-2-2-6.png");

const brightRollFrame = loadCameraFrame("bright-dice-1-1-1.png");

const touchingChainFrame = loadCameraFrame("touching-dice-1-4-2.png");

const touchingLiveFrame = loadCameraFrame("touching-dice-1-4-2-live.png");

const touchingJitterFrame = loadCameraFrame("touching-dice-1-4-2-jitter.png");

const shallowChainFrame = loadCameraFrame("touching-dice-1-1-3.png");
const shallowChainLiveFrame = loadCameraFrame("touching-dice-1-1-3-live.png");

const nearPipChainFrame = loadCameraFrame("touching-dice-3-1-3.png");

const rimPipFrame = loadCameraFrame("rim-pip-dice-3-3-3.png");

const distanceFrame = loadCameraFrame("shaded-distance-dice-3-3-3.png");
const distanceLiveFrame = loadCameraFrame("shaded-distance-dice-3-3-3-live.png");

const wideFrame = loadCameraFrame("wide-dice-1-2-1.png");

const wideSixFrame = loadCameraFrame("wide-dice-6-5-1.png");

const shadowFrame = loadCameraFrame("shadow-dice-2-4-1.png");

const distantRollFrame = loadCameraFrame("distant-dice-4-3-2.png");

const wideTableFrame = loadCameraFrame("wide-table-dice-3-6-4.png");

const dimThreeFrame = loadCameraFrame("dim-dice-3-4-4.png");

const distantSixFrame = loadCameraFrame("distant-six-dice-2-6-2.png");

const sideFaceFrame = loadCameraFrame("side-face-dice-4-6-2.png");

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
  it.each([45, 50])("reads the distant 4, 3, 2 roll at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, distantRollFrame, angle).map((die) => die.value)).toEqual([4, 3, 2]);
  });

  it.each([0.8, 1.15])("reads the distant 4, 3, 2 roll at exposure multiplier %s", (exposure) => {
    const data = distantRollFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...distantRollFrame, data }, 45).map((die) => die.value)).toEqual([4, 3, 2]);
  });

  it.each([45, 50])("does not infer the distant three when its middle pip is absent at %i degrees", (angle) => {
    const data = new Uint8ClampedArray(distantRollFrame.data);
    const color = data.slice((89 * distantRollFrame.width + 303) * 4, (89 * distantRollFrame.width + 303) * 4 + 4);
    for (let y = 86; y <= 90; y++) {
      for (let x = 297; x <= 300; x++) {
        if (Math.hypot(x - 298.5, y - 88.3) <= 1.8) {
          data.set(color, (y * distantRollFrame.width + x) * 4);
        }
      }
    }
    expect(detectDiceOpenCv(cv, { ...distantRollFrame, data }, angle).map((die) => die.value)).toEqual([4, 2, 2]);
  });

  it.each([45, 50])("reads the wide-table 3, 6, 4 roll at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, wideTableFrame, angle).map((die) => die.value)).toEqual([3, 6, 4]);
  });

  it.each([0.8, 1.15])("reads the wide-table roll at exposure multiplier %s", (exposure) => {
    const data = wideTableFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...wideTableFrame, data }, 45).map((die) => die.value)).toEqual([3, 6, 4]);
  });

  it.each([45, 50])("reads the dim 3, 4, 4 roll at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, dimThreeFrame, angle).map((die) => die.value)).toEqual([3, 4, 4]);
  });

  it.each([0.8, 1.15])("reads the dim 3, 4, 4 roll at exposure multiplier %s", (exposure) => {
    const data = dimThreeFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...dimThreeFrame, data }, 45).map((die) => die.value)).toEqual([3, 4, 4]);
  });

  it.each([45, 50])("does not invent the three's upper pip when it is absent at %i degrees", (angle) => {
    const data = new Uint8ClampedArray(dimThreeFrame.data);
    // Cover the upper pip with face-colored pixels. The two remaining pips
    // must not trigger an inferred third pip or a smaller, off-center face.
    for (let y = 29; y <= 37; y++) {
      for (let x = 154; x <= 163; x++) {
        if (Math.hypot(x - 158.5, y - 33) <= 4) {
          data.set([180, 140, 135, 255], (y * dimThreeFrame.width + x) * 4);
        }
      }
    }
    expect(detectDiceOpenCv(cv, { ...dimThreeFrame, data }, angle).map((die) => die.value)).toEqual([4, 4]);
  });

  it.each([45, 50])("reads the distant six in the 2, 6, 2 roll at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, distantSixFrame, angle).map((die) => die.value)).toEqual([2, 6, 2]);
  });

  it.each([0.8, 1.15])("reads the distant-six roll at exposure multiplier %s", (exposure) => {
    const data = distantSixFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...distantSixFrame, data }, 45).map((die) => die.value)).toEqual([2, 6, 2]);
  });

  it.each([45, 50])("does not infer six when the distant pip columns are actually joined at %i degrees", (angle) => {
    const data = new Uint8ClampedArray(distantSixFrame.data);
    // Replace the light gaps in the raw image with dark ink. A retry must
    // find six separate holes; elongated columns alone are insufficient.
    for (const left of [308, 318]) {
      for (let y = 5; y <= 18; y++) {
        for (let x = left; x < left + 6; x++) {
          data.set([20, 20, 20, 255], (y * distantSixFrame.width + x) * 4);
        }
      }
    }
    expect(detectDiceOpenCv(cv, { ...distantSixFrame, data }, angle).map((die) => die.value)).toEqual([2, 2]);
  });

  it.each([45, 50])("reads 4, 6, 2 without counting the four's right-side pips at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, sideFaceFrame, angle).map((die) => die.value)).toEqual([4, 6, 2]);
  });

  it.each([0.8, 1.15])("reads the side-face 4, 6, 2 roll at exposure multiplier %s", (exposure) => {
    const data = sideFaceFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...sideFaceFrame, data }, 45).map((die) => die.value)).toEqual([4, 6, 2]);
  });

  it.each([45, 50])("does not count a shadow as a fourth die at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, shadowFrame, angle).map((die) => die.value)).toEqual([2, 4, 1]);
  });

  it.each([45, 50])("reads the wide six with a merged side mark at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, wideSixFrame, angle).map((die) => die.value)).toEqual([6, 5, 1]);
  });

  it.each([0.8, 1.15])("reads the wide 6, 5, 1 roll at exposure multiplier %s", (exposure) => {
    const data = wideSixFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...wideSixFrame, data }, 45).map((die) => die.value)).toEqual([6, 5, 1]);
  });

  it.each([45, 50])("reads the outer dice without their side pips at %i degrees", (angle) => {
    expect(detectDiceOpenCv(cv, wideFrame, angle).map((die) => die.value)).toEqual([1, 2, 1]);
  });

  it.each([0.8, 1.15])("reads the wide 1, 2, 1 roll at exposure multiplier %s", (exposure) => {
    const data = wideFrame.data.map((channel, i) => i % 4 === 3 ? channel : channel * exposure);
    expect(detectDiceOpenCv(cv, { ...wideFrame, data }, 45).map((die) => die.value)).toEqual([1, 2, 1]);
  });

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

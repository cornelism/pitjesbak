// @vitest-environment node
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import type { DieValue } from "./dice-types";
import { detectDiceOpenCv } from "./opencv-dice";

let cv: typeof OpenCv;
beforeAll(async () => {
  const runtime: typeof OpenCv & { onRuntimeInitialized: () => void } = createRequire(import.meta.url)("@techstark/opencv-js");
  if (!runtime.Mat) await new Promise<void>((resolve) => { runtime.onRuntimeInitialized = resolve; });
  cv = runtime;
});
const detectDice = (frame: Pick<ImageData, "data" | "width" | "height">) => detectDiceOpenCv(cv, frame, 0);

// Independent raster fixtures exercise the full pixel-to-value pipeline.
const pipLayouts = [
  [[0, 0]],
  [[-1, -1], [1, 1]],
  [[-1, -1], [0, 0], [1, 1]],
  [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
];

interface FixtureDie {
  value: DieValue;
  cx: number;
  cy: number;
  side?: number;
  angle?: number;
  face?: number;
  pips?: number[][];
  tilt?: number;
  cameraRoll?: number;
  cornerRadius?: number;
}

function makeFrame(dice: FixtureDie[], noise = 0) {
  const width = 400;
  const height = 300;
  const data = new Uint8ClampedArray(width * height * 4);
  let random = 12345;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let brightness = 45;
      for (const die of dice) {
        const side = die.side ?? 64;
        const angle = die.angle ?? 0;
        // Inverse pinhole projection of a table tilted away from the camera.
        // This includes depth-dependent scale, not just a flattened rectangle.
        const tilt = (die.tilt ?? 0) * Math.PI / 180;
        const cameraRoll = die.cameraRoll ?? 0;
        const sx = (x - die.cx) * Math.cos(cameraRoll) + (y - die.cy) * Math.sin(cameraRoll);
        const sy = -(x - die.cx) * Math.sin(cameraRoll) + (y - die.cy) * Math.cos(cameraRoll);
        const distance = 220;
        const tableY = sy * distance / (distance * Math.cos(tilt) - sy * Math.sin(tilt));
        const tableX = sx * (distance + tableY * Math.sin(tilt)) / distance;
        const dx = tableX * Math.cos(angle) + tableY * Math.sin(angle);
        const dy = -tableX * Math.sin(angle) + tableY * Math.cos(angle);
        if (Math.abs(dx) >= side / 2 || Math.abs(dy) >= side / 2) continue;
        const radius = die.cornerRadius ?? 0;
        if (radius && Math.hypot(
          Math.max(0, Math.abs(dx) - side / 2 + radius),
          Math.max(0, Math.abs(dy) - side / 2 + radius),
        ) > radius) continue;
        brightness = die.face ?? 230;
        const pips = die.pips ?? pipLayouts[die.value - 1];
        if (pips.some(([px, py]) => Math.hypot(dx - px * side * 0.23, dy - py * side * 0.23) < side * 0.075)) {
          brightness = 20;
        }
      }
      random = (random * 1664525 + 1013904223) >>> 0;
      brightness += ((random / 0xffffffff) * 2 - 1) * noise;
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = brightness;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("detectDice", () => {
  it.each<DieValue>([1, 2, 3, 4, 5, 6])("reads face %i from pixels", (value) => {
    expect(detectDice(makeFrame([{ value, cx: 100, cy: 100 }])).map((die) => die.value)).toEqual([value]);
  });

  it.each([0.2, Math.PI / 4, 1.2, Math.PI / 2])("reads rotated dice at %f radians", (angle) => {
    const dice: FixtureDie[] = [
      { value: 2, cx: 65, cy: 90, side: 45, angle },
      { value: 5, cx: 170, cy: 140, side: 70, angle },
      { value: 6, cx: 290, cy: 160, side: 82, angle },
    ];
    expect(detectDice(makeFrame(dice)).map((die) => die.value)).toEqual([2, 5, 6]);
  });

  it("handles dimmer faces and image noise", () => {
    expect(detectDice(makeFrame([
      { value: 3, cx: 90, cy: 100, face: 155 },
      { value: 4, cx: 200, cy: 130, face: 210 },
    ], 15)).map((die) => die.value)).toEqual([3, 4]);
  });

  describe.each([-45, 30, 45])("table tilted %i degrees from overhead", (tilt) => {
    it.each<DieValue>([1, 2, 3, 4, 5, 6])("reads face %i at different rotations", (value) => {
      for (const angle of [0, 0.35, Math.PI / 4, 1.2, Math.PI / 2]) {
        const frame = makeFrame([{ value, cx: 160, cy: 140, side: 75, angle, tilt }]);
        expect(detectDice(frame).map((die) => die.value), `rotation ${angle}`).toEqual([value]);
      }
    });
  });

  it.each([0.4, Math.PI / 2])("handles a 45-degree table tilt along image axis %f", (cameraRoll) => {
    expect(detectDice(makeFrame([
      { value: 2, cx: 70, cy: 120, side: 55, angle: 0.6, tilt: 45, cameraRoll },
      { value: 4, cx: 180, cy: 120, side: 75, angle: 0.2, tilt: 45, cameraRoll },
      { value: 6, cx: 300, cy: 150, side: 80, angle: 1.1, tilt: 45, cameraRoll },
    ], 10)).map((die) => die.value)).toEqual([2, 4, 6]);
  });

  it.each<DieValue>([1, 2, 3, 4, 5, 6])("reads rounded face %i at 45 degrees", (value) => {
    for (const side of [45, 65, 85]) {
      expect(detectDice(makeFrame([
        { value, cx: 150, cy: 140, side, angle: 0.7, tilt: 45, cornerRadius: side * 0.1 },
      ], 10)).map((die) => die.value), `side ${side}`).toEqual([value]);
    }
  });

  it("still rejects invalid layouts and clipped faces at 45 degrees", () => {
    expect(detectDice(makeFrame([
      { value: 3, cx: 100, cy: 100, tilt: 45, pips: [[-1, -1], [1, -1], [0, 1]] },
    ]))).toEqual([]);
    expect(detectDice(makeFrame([
      { value: 1, cx: 100, cy: 100, tilt: 45, pips: [[1, 1]] },
    ]))).toEqual([]);
    expect(detectDice(makeFrame([{ value: 6, cx: 5, cy: 100, tilt: 45 }]))).toEqual([]);
  });

  it("ignores an empty scene and faces without pips", () => {
    expect(detectDice(makeFrame([]))).toEqual([]);
    expect(detectDice(makeFrame([{ value: 1, cx: 100, cy: 100, pips: [] }]))).toEqual([]);
  });

  it("rejects nonstandard pip layouts and off-center marks", () => {
    expect(detectDice(makeFrame([{ value: 3, cx: 100, cy: 100, pips: [[-1, -1], [1, -1], [0, 1]] }]))).toEqual([]);
    expect(detectDice(makeFrame([{ value: 1, cx: 100, cy: 100, pips: [[1, 1]] }]))).toEqual([]);
  });

  it("rejects dice cut off by the frame edge", () => {
    expect(detectDice(makeFrame([{ value: 6, cx: 5, cy: 100 }]))).toEqual([]);
  });

  it("rejects touching faces instead of merging them into a roll", () => {
    expect(detectDice(makeFrame([
      { value: 2, cx: 100, cy: 100 },
      { value: 3, cx: 162, cy: 100 },
    ]))).toEqual([]);
  });

  it.each<DieValue>([4, 5, 6])("reads an isolated top face %i when dark sides are absent in angled mode", (value) => {
    for (const angle of [0, 0.4, 0.8, 1.2]) {
      const frame = makeFrame([{ value, cx: 150, cy: 140, side: 75, angle, tilt: 45, cornerRadius: 5 }]);
      expect(detectDiceOpenCv(cv, frame, 50).map((die) => die.value), `rotation ${angle}`).toEqual([value]);
    }
  });

  it("rejects six nonstandard marks on an isolated face in angled mode", () => {
    const frame = makeFrame([{
      value: 6, cx: 150, cy: 140, side: 75, tilt: 45,
      pips: [[-1, -1], [0, -1], [1, -1], [-1, 1], [0.4, 0.4], [1, 1]],
    }]);
    expect(detectDiceOpenCv(cv, frame, 50)).toEqual([]);
  });
});

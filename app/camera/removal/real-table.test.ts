// @vitest-environment node
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { loadTestOpenCv } from "../detection/__test-helpers__/opencv";
import { detectDiceOpenCv } from "../detection/opencv-dice";
import type { DetectedDie } from "../dice-types";
import { captureTable } from "./clear-table";
import { createDiceRemovalTracker } from "./dice-removal";
import type { PlayArea } from "../play-area/play-area";

const png = PNG.sync.read(readFileSync(new URL("../__fixtures__/rim-dice-3-4-4.png", import.meta.url)));
const original = { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
let cv: typeof OpenCv;
let dice: DetectedDie[];
beforeAll(async () => {
  ({ cv } = await loadTestOpenCv());
  dice = detectDiceOpenCv(cv, original, 70);
  expect(dice.map((die) => die.value)).toEqual([3, 4, 4]);
});

/** Derived test scene, not a captured empty table: replace dice and nearby
 * shadows with adjacent felt texture, preserving the real tray and background.
 */
function clearedTray() {
  const data = new Uint8ClampedArray(original.data);
  for (const die of dice) {
    for (let y = die.y - 6; y < die.y + die.height + 30; y++) {
      for (let x = die.x - 15; x < die.x + die.width + 15; x++) {
        const source = (y * original.width + x - 80) * 4;
        data.set(original.data.subarray(source, source + 4), (y * original.width + x) * 4);
      }
    }
  }
  return { ...original, data };
}

describe("removal on the captured tray", () => {
  it("outlines the felt without spilling onto the gray rim or cutting holes around dice", () => {
    const areas: (PlayArea | null)[] = [];
    captureTable(original, dice, (area) => areas.push(area));
    const area = areas[0];
    expect(area).toBeTruthy();
    if (!area) throw new Error("No playing surface found");
    // Independently labelled interior/rim pixels in the raw 640×360 fixture.
    // Read the SVG's scanline rectangles to check the region actually shown.
    const rectangles = [...area.fill.matchAll(/M([\d.]+) ([\d.]+)H([\d.]+)V([\d.]+)H[\d.]+Z/g)]
      .map((match) => match.slice(1).map(Number));
    const contains = (x: number, y: number) => rectangles.some(([left, top, right, bottom]) => x >= left && x < right && y >= top && y < bottom);
    for (const [x, y] of [[320, 220], [150, 200], [400, 200]]) expect(contains(x, y), `felt at ${x},${y}`).toBe(true);
    for (const [x, y] of [[320, 340], [600, 300], [20, 300], [200, 50]]) expect(contains(x, y), `rim/background at ${x},${y}`).toBe(false);
    for (const die of dice) expect(contains(die.x + die.width / 2, die.y + die.height / 2)).toBe(true);
    expect(area.outline.match(/M/g)).toHaveLength(1);
    expect(area.outline.endsWith("Z")).toBe(true);
  });

  it("confirms a cleared tray despite a changed background above the rim", () => {
    const empty = clearedTray();
    for (let y = 2; y < 40; y++) {
      for (let x = 30; x < 200; x++) empty.data.set([175, 125, 100, 255], (y * empty.width + x) * 4);
    }
    expect(captureTable(original, dice)(empty)).toBe(true);
    expect(detectDiceOpenCv(cv, empty, 70)).toEqual([]);
    const removal = createDiceRemovalTracker();
    removal.capture(original, dice);
    for (let now = 0; now < 2000; now += 250) expect(removal.update(empty, 0, now)).toBe(false);
    expect(removal.update(empty, 0, 2000)).toBe(true);
  });

  it("still rejects a hand over another part of the playing surface", () => {
    const hand = clearedTray();
    for (let y = 200; y < 260; y++) {
      for (let x = 200; x < 320; x++) hand.data.set([175, 125, 100, 255], (y * hand.width + x) * 4);
    }
    expect(captureTable(original, dice)(hand)).toBe(false);
  });

  it("still rejects partial removal when the remaining die has no pip reading", () => {
    const partial = clearedTray();
    const die = dice[1];
    for (let y = die.y; y < die.y + 30; y++) {
      for (let x = die.x; x < die.x + die.width; x++) {
        const i = (y * partial.width + x) * 4;
        partial.data.set(original.data.subarray(i, i + 4), i);
      }
    }
    expect(captureTable(original, dice)(partial)).toBe(false);
  });
});

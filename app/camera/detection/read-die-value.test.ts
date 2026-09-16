import { describe, expect, it } from "vitest";
import { readDieValue } from "./read-die-value";
import type { TopFace } from "./top-face";
import type { EllipticalPip, Point } from "./types";

describe("small-face validation", () => {
  const bounds = { x: 0, y: 0, width: 29, height: 17 };
  const tilt = Math.PI / 4;
  // Independently measured centers from the brightened camera frame.
  const points: Point[] = [[16, 7.5], [14.5, 4.28], [12.5, 1]];
  const pips: EllipticalPip[] = points.map((point) => ({ point, area: 10, axisRatio: 0.65, angle: 90 }));
  const face: TopFace = {
    mask: new Uint32Array(29 * 17).fill(1),
    rectify: ([x, y]) => [x / 28, y / (28 * Math.cos(tilt))],
    completeFace: true,
    visibleSides: false,
  };

  it("reads all three pips using pixel-cell bounds in the detail pass", () => {
    expect(readDieValue(pips, face, bounds, 259, tilt)).toBeNull();
    expect(readDieValue(pips, face, bounds, 259, tilt, true)).toBe(3);
  });

  it.each([
    { completeFace: false, visibleSides: false },
    { completeFace: true, visibleSides: true },
  ])("keeps strict validation when the top is not isolated: %j", (geometry) => {
    expect(readDieValue(pips, { ...face, ...geometry }, bounds, 259, tilt, true)).toBeNull();
  });

  it.each([65, 70])("reads a strictly valid top pair above visible sides at %i degrees", (angle) => {
    const radians = angle * Math.PI / 180;
    const bounds = { x: 369, y: 93, width: 26, height: 16 };
    const face: TopFace = {
      mask: new Uint32Array(26 * 16).fill(1), completeFace: true, visibleSides: true,
      rectify: ([x, y]) => [x / 25, y / (25 * Math.cos(radians))],
    };
    const pips: EllipticalPip[] = [[15, 6], [10.5, 2]].map(([x, y]) => ({
      point: [x, y], area: 8, axisRatio: 0.5, angle: 90,
    }));
    expect(readDieValue(pips, face, bounds, 217, radians)).toBe(2);
    expect(readDieValue(pips, face, bounds, 217, radians, true)).toBe(2);
  });

  it("separates the five's upper pattern from a larger side pip during a detail retry", () => {
    const radians = 70 * Math.PI / 180;
    const bounds = { x: 345, y: 107, width: 25, height: 17 };
    const face: TopFace = {
      mask: new Uint32Array(25 * 17).fill(1), completeFace: true, visibleSides: true,
      rectify: ([x, y]) => [x / 24, y / (24 * Math.cos(radians))],
    };
    const pips: EllipticalPip[] = [[9, 6.5], [18.5, 5.5], [12, 4], [6, 2.5], [15.2, 1.4]]
      .map(([x, y]) => ({ point: [x, y], area: 10, axisRatio: 0.6, angle: 90 }));
    pips.push({ point: [17, 14], area: 40, axisRatio: 0.9, angle: 0 });
    expect(readDieValue(pips, face, bounds, 246, radians, true)).toBe(5);
  });

  it("rejects an additional mark instead of selecting the matching three", () => {
    const extra: EllipticalPip = { point: [5, 12], area: 10, axisRatio: 0.8, angle: 90 };
    expect(readDieValue([...pips, extra], face, bounds, 259, tilt, true)).toBeNull();
  });
});

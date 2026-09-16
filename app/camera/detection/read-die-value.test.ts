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
  ])("rejects extra detail when the top is not isolated: %j", (geometry) => {
    expect(readDieValue(pips, { ...face, ...geometry }, bounds, 259, tilt, true)).toBeNull();
  });

  it("rejects an additional mark instead of selecting the matching three", () => {
    const extra: EllipticalPip = { point: [5, 12], area: 10, axisRatio: 0.8, angle: 90 };
    expect(readDieValue([...pips, extra], face, bounds, 259, tilt, true)).toBeNull();
  });
});

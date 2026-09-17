import { describe, expect, it } from "vitest";
import { readDieValue } from "./read-die-value";
import { projectTopFace, type TopFace } from "./top-face";
import type { EllipticalPip, Point } from "./types";

describe("small-face validation", () => {
  it.each([1, 1 / 3])("preserves a complete six above a rounded side boundary at scale %s", (scale) => {
    const width = Math.round(63 * scale), height = Math.round(68 * scale);
    const bounds = { x: 0, y: 0, width, height };
    const tilt = 35 * Math.PI / 180;
    const silhouette = { cols: width, data: new Uint8Array(width * height) };
    // The rounded lower corners rise toward the two outer pip columns.
    for (let x = 0; x < width; x++) {
      const bottom = height - 1 - Math.round(Math.abs(x - (width - 1) / 2) * 1.25);
      for (let y = 0; y <= bottom; y++) silhouette.data[y * width + x] = 255;
    }
    const face = projectTopFace(silhouette, bounds, tilt)!;
    const pips: EllipticalPip[] = [[22.3, 11.5], [41.6, 12.4], [21, 25.9], [40.3, 27.1], [19.7, 40.6], [39.1, 41.8]]
      .map(([x, y]) => ({ point: [x * scale, y * scale], area: 115 * scale * scale, axisRatio: 0.95, angle: 90 }));
    expect(readDieValue(pips, face, bounds, 3326 * scale * scale, tilt)).toBe(6);
  });

  it.each([35, 40])("reads six on a nearly square outline at %i degrees without taking a four-pip subset", (angle) => {
    const bounds = { x: 0, y: 0, width: 23, height: 24 };
    const tilt = angle * Math.PI / 180;
    const silhouette = { cols: 23, data: new Uint8Array(23 * 24).fill(255) };
    const face = projectTopFace(silhouette, bounds, tilt)!;
    // Rounded measurements from frame 55: every pip belongs to the six's top.
    const pips: EllipticalPip[] = [[8, 4.5], [14.5, 5], [7.85, 9.15], [14, 9.67], [7.15, 14.15], [13.86, 14.69]]
      .map(([x, y]) => ({ point: [x, y], area: 12, axisRatio: 0.85, angle: 90 }));
    expect(readDieValue(pips, face, bounds, 390.5, tilt)).toBe(6);
  });

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

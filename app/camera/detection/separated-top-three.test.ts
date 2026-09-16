import { describe, expect, it } from "vitest";
import { readSeparatedTopThree } from "./separated-top-three";
import type { EllipticalPip } from "./types";

// Rounded measurements from the left die; its one side pip remains attached
// to the top contour while the darker front face disappears from the mask.
const top: EllipticalPip[] = [[13, 4], [18.5, 7.7], [23.7, 11.2]].map(([x, y]) => ({
  point: [x, y], area: 24, axisRatio: 0.62, angle: 75,
}));
const side: EllipticalPip = { point: [39, 19.5], area: 86, axisRatio: 0.53, angle: 176 };

describe("readSeparatedTopThree", () => {
  it.each([false, true])("reads a top three beside a distinct side plane (mirrored: %s)", (mirrored) => {
    const pips = [...top, side].reverse().map((pip): EllipticalPip => ({
      ...pip,
      point: [mirrored ? 46 - pip.point[0] : pip.point[0], pip.point[1]],
      angle: mirrored ? 180 - pip.angle : pip.angle,
    }));
    expect(readSeparatedTopThree(pips, 46, 35, 90)).toBe(3);
  });

  it("requires a separate side plane, rather than selecting three out of four top pips", () => {
    expect(readSeparatedTopThree(top, 46, 35, 90)).toBeNull();
    expect(readSeparatedTopThree([...top, { ...side, angle: 75, axisRatio: 0.62 }], 46, 35, 90)).toBeNull();
  });

  it("requires the lower pip to be at the side edge", () => {
    expect(readSeparatedTopThree([...top, { ...side, point: [23, 19.5] }], 46, 35, 90)).toBeNull();
  });

  it("rejects overlapping top and side pips", () => {
    expect(readSeparatedTopThree([...top, { ...side, point: [39, 13] }], 46, 35, 90)).toBeNull();
  });

  it("rejects a triangle and an extra mark on the top", () => {
    const bent = top.map((pip, i): EllipticalPip => i === 1 ? { ...pip, point: [23, 6] } : pip);
    expect(readSeparatedTopThree([...bent, side], 46, 35, 90)).toBeNull();
    expect(readSeparatedTopThree([...top, { ...top[0], point: [30, 8] }, side], 46, 35, 90)).toBeNull();
  });

  it("requires consistent, appropriately sized top pips", () => {
    expect(readSeparatedTopThree([...top, side], 46, 35, 20)).toBeNull();
    expect(readSeparatedTopThree([{ ...top[0], area: 80 }, ...top.slice(1), side], 46, 35, 90)).toBeNull();
    expect(readSeparatedTopThree([{ ...top[0], axisRatio: 0.4 }, ...top.slice(1), side], 46, 35, 90)).toBeNull();
  });
});

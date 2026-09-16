import { describe, expect, it } from "vitest";
import { readIsolatedTopOne } from "./isolated-top-pip";
import type { EllipticalPip } from "./types";

const top: EllipticalPip = { point: [45, 20], area: 80, axisRatio: 0.6, angle: 90 };
const sides: EllipticalPip[] = [
  { point: [35, 48], area: 45, axisRatio: 0.85, angle: 20 },
  { point: [60, 70], area: 45, axisRatio: 0.8, angle: 155 },
];

describe("readIsolatedTopOne", () => {
  it("reads a foreshortened top one above pips on differently oriented sides", () => {
    expect(readIsolatedTopOne([...sides, top], 100, 95)).toBe(1);
  });

  it("preserves the result when the die is scaled", () => {
    const pips = [...sides, top].map((pip): EllipticalPip => ({
      ...pip, point: [pip.point[0] * 2, pip.point[1] * 2], area: pip.area * 4,
    }));
    expect(readIsolatedTopOne(pips, 200, 190)).toBe(1);
  });

  it("does not take one pip from an incomplete face with coplanar marks", () => {
    const sameFace = sides.map((pip) => ({ ...pip, axisRatio: top.axisRatio, angle: top.angle }));
    expect(readIsolatedTopOne([top, ...sameFace], 100, 95)).toBeNull();
  });

  it.each([
    { name: "no side evidence", pips: [top] },
    { name: "only one side pip", pips: [top, sides[0]] },
    { name: "another upper pip", pips: [top, { ...top, point: [60, 25] as const }, ...sides] },
    { name: "off-center top", pips: [{ ...top, point: [15, 20] as const }, ...sides] },
    { name: "low top mark", pips: [{ ...top, point: [45, 35] as const }, ...sides] },
    { name: "upright side ellipse", pips: [{ ...top, angle: 0 }, ...sides] },
    { name: "round mark without plane evidence", pips: [{ ...top, axisRatio: 0.95 }, ...sides] },
    { name: "invalid coordinate", pips: [{ ...top, point: [NaN, 20] as const }, ...sides] },
    { name: "mark outside the die", pips: [top, ...sides, { ...sides[0], point: [120, 80] as const }] },
    { name: "zero-area pip", pips: [{ ...top, area: 0 }, ...sides] },
  ])("rejects $name", ({ pips }) => {
    expect(readIsolatedTopOne(pips, 100, 95)).toBeNull();
  });
});

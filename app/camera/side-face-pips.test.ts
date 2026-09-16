import { describe, expect, it } from "vitest";
import type { EllipticalPip } from "./isolated-top-pip";
import { readTopBesideSide } from "./side-face-pips";

const top: EllipticalPip[] = [[25, 25], [55, 25], [25, 65], [55, 65]].map(([x, y]) => ({
  point: [x, y], area: 50, axisRatio: 0.85, angle: 80,
}));
const side: EllipticalPip[] = [30, 65].map((y) => ({
  point: [90, y], area: 15, axisRatio: 0.45, angle: 175,
}));

describe("readTopBesideSide", () => {
  it.each([false, true])("reads a four beside a foreshortened side (mirrored: %s)", (mirror) => {
    const pips = [...top, ...side].map((pip): EllipticalPip => ({
      ...pip, point: [mirror ? 100 - pip.point[0] : pip.point[0], pip.point[1]],
    }));
    expect(readTopBesideSide(pips, 100, 90, 60)).toBe(4);
  });

  it("does not remove coplanar pips from an incomplete pattern", () => {
    expect(readTopBesideSide([...top, ...side.map((pip) => ({ ...pip, axisRatio: 0.85, angle: 80 }))], 100, 90, 60)).toBeNull();
  });

  it("keeps an extra mark on the top instead of selecting four", () => {
    expect(readTopBesideSide([...top, { ...top[0], point: [45, 35] }, ...side], 100, 90, 60)).toBeNull();
  });

  it("requires at least two side pips to identify the side plane", () => {
    expect(readTopBesideSide([...top, side[0]], 100, 90, 60)).toBeNull();
  });

  it("rejects oversized top pips", () => {
    expect(readTopBesideSide([...top, ...side], 100, 90, 40)).toBeNull();
  });

  it("rejects side marks scattered across both edges", () => {
    expect(readTopBesideSide([...top, side[0], { ...side[1], point: [10, 65] }], 100, 90, 60)).toBeNull();
  });

  it("rejects a side group overlapping the top", () => {
    const crowded = top.map((pip): EllipticalPip => ({ ...pip, point: [pip.point[0] + 32, pip.point[1]] }));
    expect(readTopBesideSide([...crowded, ...side], 100, 90, 60)).toBeNull();
  });
});

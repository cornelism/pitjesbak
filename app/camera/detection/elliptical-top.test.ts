import { describe, expect, it } from "vitest";
import { readEllipticalTop } from "./elliptical-top";
import type { EllipticalPip } from "./types";

const pair: EllipticalPip[] = [[10.5, 10.3], [23.4, 6.4]].map(([x, y]) => ({
  point: [x, y], area: 30, axisRatio: 0.73, angle: 90,
}));
const three: EllipticalPip[] = [[15.5, 17.6], [19.7, 10.6], [23.9, 3.9]].map(([x, y]) => ({
  point: [x, y], area: 40, axisRatio: 0.8, angle: 90,
}));

describe("readEllipticalTop", () => {
  it.each([
    { width: 36, height: 25, point: [16.7, 8.75] as const, area: 58.5, axisRatio: 0.64, angle: 93 },
    { width: 53, height: 36, point: [29.2, 15.5] as const, area: 160.5, axisRatio: 0.66, angle: 116 },
  ])("reads a centered one whose ellipse agrees with its $width × $height outline", ({ width, height, ...pip }) => {
    expect(readEllipticalTop([pip], width, height, width * height * 0.2)).toBe(1);
  });

  it("rejects a single mark when its ellipse and face outline disagree", () => {
    const pip: EllipticalPip = { point: [20, 10], area: 40, axisRatio: 0.5, angle: 90 };
    expect(readEllipticalTop([pip], 40, 20, 80)).toBe(1);
    expect(readEllipticalTop([pip], 40, 35, 80)).toBeNull();
    expect(readEllipticalTop([pip], 40, 10, 80)).toBeNull();
  });

  it("still requires a centered single pip, without relaxing the centering tolerance", () => {
    const pip: EllipticalPip = { point: [20, 4], area: 40, axisRatio: 0.5, angle: 90 };
    expect(readEllipticalTop([pip], 40, 20, 80)).toBeNull();
  });

  it("reads a pair from its measured pip ellipses", () => {
    expect(readEllipticalTop(pair, 36, 22, 45)).toBe(2);
  });

  it("reads a collinear three regardless of contour order", () => {
    expect(readEllipticalTop([...three].reverse(), 40, 27, 60)).toBe(3);
  });

  it("does not select a subset when another pip is present", () => {
    expect(readEllipticalTop([...three, { ...three[0], point: [30, 20] }], 40, 27, 60)).toBeNull();
  });

  it("rejects a bent three-pip pattern", () => {
    expect(readEllipticalTop([three[0], { ...three[1], point: [24, 12] }, three[2]], 40, 27, 60)).toBeNull();
  });

  it("rejects side-plane ellipses and inconsistent foreshortening", () => {
    expect(readEllipticalTop(pair.map((pip) => ({ ...pip, angle: 0 })), 36, 22, 45)).toBeNull();
    expect(readEllipticalTop([{ ...pair[0], axisRatio: 0.4 }, pair[1]], 36, 22, 45)).toBeNull();
  });

  it("requires similar, appropriately sized pips", () => {
    expect(readEllipticalTop(pair, 36, 22, 20)).toBeNull();
    expect(readEllipticalTop([{ ...pair[0], area: 5 }, pair[1]], 36, 22, 45)).toBeNull();
  });

  it("rejects marks confined to an off-center patch", () => {
    const shifted = pair.map((pip): EllipticalPip => ({ ...pip, point: [pip.point[0], pip.point[1] - 5] }));
    expect(readEllipticalTop(shifted, 36, 22, 45)).toBeNull();
  });

  it.each([0, NaN, Infinity])("rejects invalid face width %s", (width) => {
    expect(readEllipticalTop(pair, width, 22, 45)).toBeNull();
  });
});

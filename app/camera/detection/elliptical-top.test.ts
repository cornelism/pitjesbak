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

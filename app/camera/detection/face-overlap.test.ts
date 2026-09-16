import { describe, expect, it } from "vitest";
import { overlapsDie, sameFace } from "./face-overlap";
import type { FaceBounds } from "./top-face";

describe("face overlap", () => {
  const face = { x: 10, y: 10, width: 20, height: 20 };
  it.each([
    { name: "same face", other: face, overlap: true, same: true },
    { name: "shifted outline", other: { ...face, x: 11, y: 11 }, overlap: true, same: true },
    { name: "partial face", other: { ...face, x: 20 }, overlap: true, same: false },
    { name: "contained fragment", other: { x: 14, y: 14, width: 6, height: 6 }, overlap: true, same: false },
    { name: "corner contact", other: { ...face, x: 28, y: 28 }, overlap: false, same: false },
    { name: "narrow shared strip", other: { ...face, x: 27 }, overlap: false, same: false },
    { name: "touching edge", other: { ...face, x: 30 }, overlap: false, same: false },
    { name: "separate die", other: { ...face, x: 40 }, overlap: false, same: false },
    { name: "empty bounds", other: { ...face, width: 0 }, overlap: false, same: false },
  ])("handles $name symmetrically at different image resolutions", ({ other, overlap, same }) => {
    for (const scale of [0.5, 1, 2]) {
      const scaled = ({ x, y, width, height }: FaceBounds) => ({ x: x * scale, y: y * scale, width: width * scale, height: height * scale });
      const a = scaled(face), b = scaled(other);
      expect(overlapsDie(a, b)).toBe(overlap);
      expect(overlapsDie(b, a)).toBe(overlap);
      expect(sameFace(a, b)).toBe(same);
      expect(sameFace(b, a)).toBe(same);
    }
  });

  it("preserves the two nearby dice whose camera bounds share a 1 × 2 corner", () => {
    const five = { x: 345, y: 107, width: 25, height: 17 };
    const two = { x: 369, y: 93, width: 26, height: 16 };
    expect(overlapsDie(five, two)).toBe(false);
  });
});

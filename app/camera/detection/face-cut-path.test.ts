import { describe, expect, it } from "vitest";
import type { Point } from "./types";
import { routeFaceCut } from "./face-cut-path";

function mask() {
  return { rows: 12, cols: 12, data: new Uint8Array(144) };
}

describe("contact cut routing", () => {
  it.each([
    { start: [1, 2], end: [10, 8] },
    { start: [10, 8], end: [1, 2] },
  ] satisfies { start: Point; end: Point }[])("creates a continuous cut from $start to $end", ({ start, end }) => {
    const path = routeFaceCut(start, end, mask(), 2)!;
    expect(path[0]).toEqual(start);
    expect(path.at(-1)).toEqual(end);
    for (let i = 1; i < path.length; i++) {
      expect(Math.abs(path[i][0] - path[i - 1][0]) + Math.abs(path[i][1] - path[i - 1][1])).toBe(1);
    }
  });

  it("detours around protected pip pixels without modifying the mask", () => {
    const blocked = mask();
    blocked.data[5 * 12 + 6] = 255;
    const before = blocked.data.slice();
    const path = routeFaceCut([1, 5], [10, 5], blocked, 2)!;
    expect(path).not.toBeNull();
    expect(path.some(([, y]) => y !== 5)).toBe(true);
    for (const [x, y] of path) {
      expect(blocked.data[y * 12 + x]).toBe(0);
      expect(Math.abs(y - 5)).toBeLessThanOrEqual(2);
    }
    expect(blocked.data).toEqual(before);
  });

  it("rejects a cut when protecting the pip would require a wide detour", () => {
    const blocked = mask();
    for (let y = 2; y <= 8; y++) blocked.data[y * 12 + 6] = 255;
    expect(routeFaceCut([1, 5], [10, 5], blocked, 2)).toBeNull();
  });

  it("rejects protected endpoints and zero-length cuts", () => {
    const blocked = mask();
    blocked.data[5 * 12 + 1] = 255;
    expect(routeFaceCut([1, 5], [10, 5], blocked, 2)).toBeNull();
    expect(routeFaceCut([2, 5], [2, 5], blocked, 2)).toBeNull();
  });
});

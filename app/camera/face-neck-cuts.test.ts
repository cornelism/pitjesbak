// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Point } from "./face-perspective";
import { findFaceNeckCuts } from "./face-neck-cuts";

const chain: readonly Point[] = [
  [0, 0], [40, 0], [50, 15], [60, 0], [100, 0], [110, 15], [120, 0], [160, 0],
  [160, 50], [120, 50], [110, 35], [100, 50], [60, 50], [50, 35], [40, 50], [0, 50],
];
const expected: readonly (readonly [Point, Point])[] = [[[50, 15], [50, 35]], [[110, 15], [110, 35]]];

function canonical(cuts: readonly (readonly [Point, Point])[]) {
  return cuts.map((cut) => cut.map((point) => point.map((coordinate) => coordinate.toFixed(5)).join(",")).sort().join("/")).sort();
}

describe("findFaceNeckCuts", () => {
  it.each([0, 0.4, Math.PI / 2, 2.1])("pairs only opposite notches after rotation %s", (angle) => {
    const transform = ([x, y]: Point): Point => [
      23 + 1.5 * (x * Math.cos(angle) - y * Math.sin(angle)),
      51 + 1.5 * (x * Math.sin(angle) + y * Math.cos(angle)),
    ];
    for (const polygon of [chain, [...chain].reverse()]) {
      expect(canonical(findFaceNeckCuts(polygon.map(transform), 45)))
        .toEqual(canonical(expected.map(([a, b]) => [transform(a), transform(b)])));
    }
  });

  it("prefers contact corners over closer rounded-edge dents", () => {
    const outline: Point[] = [[144, 20], [137, 9], [125, 1], [104, 1], [88, 13],
      [80, 28], [66, 29], [53, 37], [42, 56], [27, 57], [15, 63], [5, 73],
      [0, 87], [25, 108], [31, 110], [52, 92], [68, 85], [69, 80], [75, 79],
      [96, 60], [107, 56], [109, 51], [124, 37], [144, 27]];
    expect(canonical(findFaceNeckCuts(outline, 46)))
      .toEqual(canonical([[[42, 56], [69, 80]], [[80, 28], [109, 51]]]));
  });

  it("rejects contacts wider than the estimated face diameter", () => {
    expect(findFaceNeckCuts(chain, 19)).toEqual([]);
  });

  it("leaves a convex face intact", () => {
    expect(findFaceNeckCuts([[0, 0], [100, 0], [100, 50], [0, 50]], 100)).toEqual([]);
  });

  it("does not pair indentations on the same side", () => {
    expect(findFaceNeckCuts([...chain.slice(0, 9), [0, 50]], 200)).toEqual([]);
  });

  it("ignores shallow contour dents", () => {
    expect(findFaceNeckCuts([[0, 0], [40, 0], [50, 2], [60, 0], [100, 0],
      [100, 50], [60, 50], [50, 48], [40, 50], [0, 50]], 100)).toEqual([]);
  });

  it.each([0, -1, NaN, Infinity])("rejects invalid face diameter %s", (diameter) => {
    expect(findFaceNeckCuts(chain, diameter)).toEqual([]);
  });

  it("rejects invalid polygons", () => {
    for (const polygon of [[], [[0, 0]], [[0, 0], [1, 0], [2, 0], [3, 0]], [...chain, [NaN, 0]]] as Point[][]) {
      expect(findFaceNeckCuts(polygon, 100)).toEqual([]);
    }
  });
});

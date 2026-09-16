// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { DieValue } from "./dice-types";
import type { Point } from "./face-perspective";
import { hasConsistentPipSizes, readPipPattern, readSeparatedTop, readWholeFacePattern, type Pip } from "./pip-pattern";

// Independent face coordinates; neither production templates nor descriptors
// are imported, so these tests check the recognition contract.
const layouts: Record<DieValue, readonly Point[]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
};

function normalizedFace(value: DieValue, angle = 0): Point[] {
  return layouts[value].map(([x, y]) => [
    0.5 + 0.24 * (x * Math.cos(angle) - y * Math.sin(angle)),
    0.5 + 0.24 * (x * Math.sin(angle) + y * Math.cos(angle)),
  ]);
}

function projectedFace(value: DieValue): Pip[] {
  // Foreshorten and shear the top face, in pixels within a 100 × 100 cube.
  return layouts[value].map(([x, y]) => ({ point: [50 + 22 * x + 6 * y, 22 + 3 * x + 10 * y], area: 9 }));
}

describe("readPipPattern", () => {
  it("reads a compact two-pip face regardless of rotation", () => {
    for (const angle of [0, 0.4, Math.PI / 4, 1.2]) {
      const points = normalizedFace(2, angle).map(([x, y]): Point => [
        0.5 + (x - 0.5) * 0.55, 0.5 + (y - 0.5) * 0.55,
      ]);
      expect(readPipPattern(points), `angle ${angle}`).toBe(2);
    }
  });

  it.each<DieValue>([1, 2, 3, 4, 5, 6])("reads face %i regardless of rotation and contour order", (value) => {
    for (const angle of [0, 0.4, Math.PI / 4, 1.2]) {
      expect(readPipPattern(normalizedFace(value, angle).reverse()), `angle ${angle}`).toBe(value);
    }
  });

  it.each<{ name: string; points: readonly Point[] }>([
    { name: "empty face", points: [] },
    { name: "seven marks", points: [...normalizedFace(6), [0.5, 0.5]] },
    { name: "off-center pip", points: [[0.8, 0.8]] },
    { name: "triangle instead of three in a line", points: [[0.2, 0.3], [0.8, 0.3], [0.5, 0.8]] },
    { name: "coincident pips", points: [[0.5, 0.5], [0.5, 0.5]] },
    { name: "off-center pair", points: [[0.15, 0.15], [0.42, 0.42]] },
    { name: "compact three-pip cluster", points: [[0.37, 0.37], [0.5, 0.5], [0.63, 0.63]] },
    { name: "pips too close together", points: [[0.4, 0.4], [0.6, 0.6]] },
    { name: "pips spread beyond a face", points: [[0.05, 0.05], [0.95, 0.95]] },
    { name: "pip on the boundary", points: [[0, 0.5], [1, 0.5]] },
    { name: "pip outside the face", points: [[-0.1, 0.5], [1.1, 0.5]] },
    { name: "NaN coordinate", points: [[NaN, 0.5]] },
    { name: "infinite coordinate", points: [[0.5, Infinity]] },
  ])("rejects $name", ({ points }) => {
    expect(readPipPattern(points)).toBeNull();
  });
});

describe("readSeparatedTop", () => {
  it.each<DieValue>([4, 5, 6])("reads a skewed top face %i while excluding lower side pips", (value) => {
    const pips: Pip[] = [
      ...projectedFace(value),
      { point: [30, 70], area: 12 },
      { point: [50, 80], area: 12 },
      { point: [70, 70], area: 12 },
    ];
    pips.reverse();
    const original = structuredClone(pips);
    expect(readSeparatedTop(pips, 100, 100)).toBe(value);
    expect(pips).toEqual(original);
  });

  it("reads a top face when no side pips are visible", () => {
    expect(readSeparatedTop(projectedFace(5), 100, 100)).toBe(5);
  });

  it("preserves the reading when the entire cube is scaled", () => {
    const scaled = projectedFace(6).map(({ point: [x, y], area }): Pip => ({
      point: [x * 2, y * 2], area: area * 4,
    }));
    expect(readSeparatedTop(scaled, 200, 200)).toBe(6);
  });

  it.each<DieValue>([1, 2, 3])("leaves face %i to calibrated recognition because it cannot establish a plane", (value) => {
    expect(readSeparatedTop(projectedFace(value), 100, 100)).toBeNull();
  });

  it("rejects overlapping top and side clusters", () => {
    const pips: Pip[] = [...projectedFace(4), { point: [50, 36], area: 9 }];
    expect(readSeparatedTop(pips, 100, 100)).toBeNull();
  });

  it("keeps a large side mark when checking the gap below the top", () => {
    const pips: Pip[] = [...projectedFace(6), { point: [50, 36], area: 80 }];
    expect(readSeparatedTop(pips, 100, 100, 12)).toBeNull();
  });

  it("reads six above a distinctly separated large side mark", () => {
    const pips: Pip[] = [...projectedFace(6), { point: [50, 65], area: 80 }];
    expect(readSeparatedTop(pips, 100, 100, 12)).toBe(6);
  });

  it("rejects uniformly oversized top pips", () => {
    expect(readSeparatedTop(projectedFace(6), 100, 100, 8)).toBeNull();
  });

  it("rejects an upper cluster with an oversized mark", () => {
    const pips = projectedFace(4);
    pips[0].area = 90;
    expect(readSeparatedTop(pips, 100, 100)).toBeNull();
  });

  it.each([
    { name: "too low on the cube", dx: 0, dy: 50, scaleX: 1 },
    { name: "too far to one side", dx: 35, dy: 0, scaleX: 1 },
    { name: "too narrow to fill the face", dx: 0, dy: 0, scaleX: 0.2 },
  ])("rejects a cluster $name", ({ dx, dy, scaleX }) => {
    const pips = projectedFace(4).map(({ point: [x, y], area }): Pip => ({
      point: [50 + (x - 50) * scaleX + dx, y + dy], area,
    }));
    expect(readSeparatedTop(pips, 100, 100)).toBeNull();
  });

  it.each<{ name: string; points: readonly Point[] }>([
    { name: "collinear marks", points: [[20, 20], [40, 20], [60, 20], [80, 20]] },
    { name: "nonstandard trapezoid", points: [[20, 10], [80, 10], [40, 35], [60, 35]] },
  ])("rejects $name rather than counting the marks", ({ points }) => {
    expect(readSeparatedTop(points.map((point) => ({ point, area: 9 })), 100, 100)).toBeNull();
  });

  it("rejects an empty cluster", () => {
    expect(readSeparatedTop([], 100, 100)).toBeNull();
  });
});

describe("readWholeFacePattern", () => {
  function face(value: DieValue, angle = 0): Pip[] {
    return layouts[value].map(([x, y]) => {
      const rx = x * Math.cos(angle) - y * Math.sin(angle);
      const ry = x * Math.sin(angle) + y * Math.cos(angle);
      return { point: [50 + 22 * rx + 6 * ry, 50 + 14 * ry], area: 12 };
    });
  }

  it.each<DieValue>([4, 5, 6])("matches the entire face %i under rotation, shear, and foreshortening", (value) => {
    for (const angle of [0, 0.4, 0.8, 1.2]) {
      expect(readWholeFacePattern(face(value, angle).reverse(), 100, 100), `rotation ${angle}`).toBe(value);
    }
  });

  it("recognizes the six's measured pip centers despite its rounded outline", () => {
    const points: Point[] = [[28.57, 33], [44.2, 26.7], [22.63, 23.25], [38.22, 17.11], [16.82, 13.56], [32.18, 7.48]];
    expect(readWholeFacePattern(points.map((point) => ({ point, area: 83 })), 63, 51)).toBe(6);
  });

  it("rejects an incomplete six instead of guessing its missing pip", () => {
    expect(readWholeFacePattern(face(6).slice(1), 100, 100)).toBeNull();
  });

  it("rejects an extra pip instead of selecting the matching six", () => {
    expect(readWholeFacePattern([...face(6), { point: [50, 70], area: 12 }], 100, 100)).toBeNull();
  });

  it("rejects six marks that do not form a grid", () => {
    const pips = face(6);
    pips[2].point = [50, 45];
    expect(readWholeFacePattern(pips, 100, 100)).toBeNull();
  });

  it("rejects a cluster confined to the upper part of a cube", () => {
    expect(readWholeFacePattern(projectedFace(6), 100, 100)).toBeNull();
  });

  it("rejects inconsistent pip sizes", () => {
    const pips = face(6);
    pips[0].area = 100;
    expect(readWholeFacePattern(pips, 100, 100)).toBeNull();
  });

  it.each<Point>([[NaN, 50], [50, Infinity], [0, 50], [101, 50]])("rejects an invalid pip coordinate (%s, %s)", (x, y) => {
    const pips = face(6);
    pips[0].point = [x, y];
    expect(readWholeFacePattern(pips, 100, 100)).toBeNull();
  });
});

describe("hasConsistentPipSizes", () => {
  it.each([
    { name: "no pips", areas: [], expected: false },
    { name: "single pip", areas: [12], expected: true },
    { name: "equal pips", areas: [12, 12, 12], expected: true },
    { name: "moderate variation", areas: [10, 16, 22], expected: true },
    { name: "maximum allowed ratio", areas: [10, 25], expected: true },
    { name: "ratio just above the limit", areas: [10, 25.1], expected: false },
    { name: "one outlier among similar pips", areas: [12, 13, 12, 50], expected: false },
  ])("checks $name", ({ areas, expected }) => {
    const pips: Pip[] = areas.map((area) => ({ point: [0, 0], area }));
    expect(hasConsistentPipSizes(pips)).toBe(expected);
  });
});

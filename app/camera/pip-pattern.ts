import type { DieValue } from "./dice-types";
import type { Point } from "./face-perspective";

const patterns: readonly (readonly Point[])[] = [
  [[1, 1]], [[0, 0], [2, 2]], [[0, 0], [1, 1], [2, 2]],
  [[0, 0], [2, 0], [0, 2], [2, 2]],
  [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
];

function signature(points: readonly Point[]) {
  const distances = points.flatMap((point, i) => points.slice(i + 1).map(
    (other) => Math.hypot(point[0] - other[0], point[1] - other[1]),
  )).sort((a, b) => a - b);
  const span = distances.at(-1) || 1;
  return { distances: distances.map((distance) => distance / span), span };
}

export function readPipPattern(points: readonly Point[]): DieValue | null {
  const count = points.length;
  if (count !== 1 && count !== 2 && count !== 3 && count !== 4 && count !== 5 && count !== 6) return null;
  if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || x >= 1 || y <= 0 || y >= 1)) return null;
  const cx = points.reduce((sum, point) => sum + point[0], 0) / count;
  const cy = points.reduce((sum, point) => sum + point[1], 0) / count;
  if (Math.hypot(cx - 0.5, cy - 0.5) > 0.18) return null;
  if (count > 1) {
    const actual = signature(points);
    const expected = patternSignatures[count - 1];
    if (actual.span < 0.4 || actual.span > 1.1) return null;
    if (actual.distances.some((distance, i) => Math.abs(distance - expected.distances[i]) > 0.12)) return null;
  }
  return count;
}

export type Pip = { point: Point; area: number };

// Normalize both axes and shear using the cloud's covariance. Pair distances
// then describe the pip layout independently of its affine camera projection.
// Only non-collinear layouts (4–6) contain enough information for this check.
function affineSignature(points: readonly Point[]): number[] | null {
  const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
  const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const centered = points.map(([x, y]): Point => [x - cx, y - cy]);
  const xx = centered.reduce((sum, [x]) => sum + x * x, 0);
  const xy = centered.reduce((sum, [x, y]) => sum + x * y, 0);
  const yy = centered.reduce((sum, [, y]) => sum + y * y, 0);
  const determinant = xx * yy - xy * xy;
  if (determinant <= 0.025 * (xx + yy) ** 2) return null;
  const sx = Math.sqrt(xx), sy = Math.sqrt(determinant / xx);
  return signature(centered.map(([x, y]): Point => [x / sx, (y - xy / xx * x) / sy])).distances;
}

export function readSeparatedTop(pips: readonly Pip[], width: number, height: number): DieValue | null {
  const ordered = [...pips].sort((a, b) => a.point[1] - b.point[1]);
  for (const count of [6, 5, 4] as const) {
    if (ordered.length < count) continue;
    const face = ordered.slice(0, count);
    const lowest = face[count - 1].point[1];
    const largestArea = Math.max(...face.map((pip) => pip.area));
    if (!hasConsistentPipSizes(face)) continue;
    // Require a distinct upper cluster, separated from side pips by at least
    // a pip radius. Never pick an arbitrary subset from overlapping faces.
    if (ordered[count] && ordered[count].point[1] - lowest < 1.5 * Math.sqrt(largestArea / Math.PI)) continue;
    const points = face.map((pip) => pip.point);
    const xs = points.map(([x]) => x);
    const cy = points.reduce((sum, [, y]) => sum + y, 0) / count;
    const cx = xs.reduce((sum, x) => sum + x, 0) / count;
    if (lowest > height * 0.6 || cy > height * 0.4 || Math.abs(cx / width - 0.5) > 0.18) continue;
    if (Math.max(...xs) - Math.min(...xs) < width * 0.3) continue;
    const actual = affineSignature(points);
    const expected = affinePatternSignatures[count - 1];
    if (actual && expected && actual.every((distance, i) => Math.abs(distance - expected[i]) <= 0.09)) return count;
  }
  return null;
}

// Templates do not change between frames; compute their descriptors once.
const patternSignatures = patterns.map(signature);
const affinePatternSignatures = patterns.map(affineSignature);

export function hasConsistentPipSizes(pips: readonly Pip[]): boolean {
  if (!pips.length) return false;
  const areas = pips.map((pip) => pip.area);
  return Math.max(...areas) / Math.min(...areas) <= 2.5;
}

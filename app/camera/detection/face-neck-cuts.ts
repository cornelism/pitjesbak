import type { Point } from "./types";

/** Pair opposing concave corners across a contact between rounded faces.
 * Each corner is used once; shallow dents and same-side corners are excluded.
 */
export function findFaceNeckCuts(polygon: readonly Point[], maxWidth: number): readonly (readonly [Point, Point])[] {
  if (polygon.length < 4 || polygon.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))
    || !Number.isFinite(maxWidth) || maxWidth <= 0) return [];
  const orientation = Math.sign(polygon.reduce((area, a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return area + a[0] * b[1] - a[1] * b[0];
  }, 0));
  const notches = polygon.flatMap((point, i) => {
    const before = polygon[(i + polygon.length - 1) % polygon.length];
    const after = polygon[(i + 1) % polygon.length];
    const ax = point[0] - before[0], ay = point[1] - before[1];
    const bx = after[0] - point[0], by = after[1] - point[1];
    const a = Math.hypot(ax, ay), b = Math.hypot(bx, by);
    if (!a || !b || (ax * by - ay * bx) * orientation >= 0) return [];
    // Ignore shallow dents caused by rounded corners and pixel stair steps.
    const strength = 1 - (ax * bx + ay * by) / (a * b);
    if (strength < 0.08) return [];
    const nx = ax / a - bx / b, ny = ay / a - by / b;
    const length = Math.hypot(nx, ny);
    return [{ point, strength, normal: [nx / length, ny / length] as Point }];
  });
  const candidates = notches.flatMap((a, i) => notches.slice(i + 1).flatMap((b, j) => {
    const dx = b.point[0] - a.point[0], dy = b.point[1] - a.point[1];
    const length = Math.hypot(dx, dy);
    if (!length || length > maxWidth) return [];
    // Both indentation directions must face each other across the neck.
    if ((dx * a.normal[0] + dy * a.normal[1]) / length < 0.8
      || (-dx * b.normal[0] - dy * b.normal[1]) / length < 0.8) return [];
    return [{ a: i, b: i + j + 1, length, strength: Math.min(a.strength, b.strength) }];
  // A rounded rim can supply a closer but weaker dent than the contact.
  })).sort((a, b) => b.strength - a.strength || a.length - b.length);
  const used = new Set<number>();
  return candidates.flatMap(({ a, b }) => {
    if (used.has(a) || used.has(b)) return [];
    used.add(a); used.add(b);
    return [[notches[a].point, notches[b].point] as const];
  });
}

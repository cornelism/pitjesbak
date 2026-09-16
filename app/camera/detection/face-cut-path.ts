import type { Point } from "./types";

/** Find a four-connected cut close to the contact line, avoiding protected pips. */
export function routeFaceCut(
  start: Point,
  end: Point,
  blocked: { data: Uint8Array; cols: number; rows: number },
  maxDeviation: number,
): Point[] | null {
  const { cols: width, rows: height, data } = blocked;
  const [sx, sy] = start;
  const [ex, ey] = end;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared || !Number.isFinite(maxDeviation) || maxDeviation < 0) return null;

  function deviation(x: number, y: number): number {
    const along = Math.max(0, Math.min(1, ((x - sx) * dx + (y - sy) * dy) / lengthSquared));
    return Math.hypot(x - sx - along * dx, y - sy - along * dy);
  }

  function allowed(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < width && y < height
      && !data[y * width + x] && deviation(x, y) <= maxDeviation;
  }

  if (!allowed(sx, sy) || !allowed(ex, ey)) return null;
  const first = sy * width + sx;
  const last = ey * width + ex;
  const previous = new Int32Array(width * height).fill(-1);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 1;
  queue[0] = first;
  previous[first] = first;

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (index === last) {
      const path: Point[] = [];
      for (let step = last; ; step = previous[step]) {
        path.push([step % width, Math.floor(step / width)]);
        if (step === first) return path.reverse();
      }
    }
    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    neighbors.sort((a, b) => deviation(a[0], a[1]) - deviation(b[0], b[1]));
    for (const [nx, ny] of neighbors) {
      const next = ny * width + nx;
      if (!allowed(nx, ny) || previous[next] !== -1) continue;
      previous[next] = index;
      queue[tail++] = next;
    }
  }
  return null;
}

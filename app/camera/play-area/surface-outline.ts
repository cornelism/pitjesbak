type Point = readonly [number, number];

function simplify(points: readonly Point[], tolerance: number): Point[] {
  const first = points[0], last = points[points.length - 1];
  const dx = last[0] - first[0], dy = last[1] - first[1];
  const length = dx * dx + dy * dy;
  let furthest = 0, distance = tolerance;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const t = length ? Math.max(0, Math.min(1, ((x - first[0]) * dx + (y - first[1]) * dy) / length)) : 0;
    const offset = Math.hypot(x - first[0] - t * dx, y - first[1] - t * dy);
    if (offset > distance) { distance = offset; furthest = i; }
  }
  return furthest ? [...simplify(points.slice(0, furthest + 1), tolerance).slice(0, -1), ...simplify(points.slice(furthest), tolerance)] : [first, last];
}

/** Join exposed cell edges into closed contours, then remove sampling stairs
 * within one cell diagonal. Internal cell borders are never drawn.
 */
export function surfaceOutline(samples: readonly { x: number; y: number }[], width: number, height: number, step: number): string {
  const cells = new Set(samples.map(({ x, y }) => `${x},${y}`));
  const edges = new Map<string, Point[]>();
  function edge(from: Point, to: Point) {
    const key = from.join(",");
    edges.set(key, [...(edges.get(key) ?? []), to]);
  }
  for (const { x, y } of samples) {
    const l = Math.max(0, x - step / 2), r = Math.min(width, x + step / 2);
    const t = Math.max(0, y - step / 2), b = Math.min(height, y + step / 2);
    if (!cells.has(`${x},${y - step}`)) edge([l, t], [r, t]);
    if (!cells.has(`${x + step},${y}`)) edge([r, t], [r, b]);
    if (!cells.has(`${x},${y + step}`)) edge([r, b], [l, b]);
    if (!cells.has(`${x - step},${y}`)) edge([l, b], [l, t]);
  }
  const paths: string[] = [];
  while (edges.size) {
    const start = [...edges.keys()].sort((a, b) => {
      const [ax, ay] = a.split(",").map(Number), [bx, by] = b.split(",").map(Number);
      return ay - by || ax - bx;
    })[0];
    const [x, y] = start.split(",").map(Number);
    const points: Point[] = [[x, y]];
    let key = start;
    do {
      const targets = edges.get(key);
      const next = targets?.shift();
      if (!targets?.length) edges.delete(key);
      if (!next) break;
      points.push(next);
      key = next.join(",");
    } while (key !== start);
    if (points.length < 4 || key !== start) continue;
    // Split the closed contour at its most distant vertex to avoid the
    // zero-length baseline of simplifying a closed ring in one pass.
    let opposite = 1;
    for (let i = 2; i < points.length - 1; i++) {
      if (Math.hypot(points[i][0] - x, points[i][1] - y) > Math.hypot(points[opposite][0] - x, points[opposite][1] - y)) opposite = i;
    }
    const tolerance = step * Math.SQRT2;
    const reduced = [...simplify(points.slice(0, opposite + 1), tolerance).slice(0, -1), ...simplify(points.slice(opposite), tolerance)].slice(0, -1);
    const vertices = reduced.length >= 3 ? reduced : points.slice(0, -1);
    const polygon = vertices.filter(([px, py], i) => {
      const before = vertices[(i + vertices.length - 1) % vertices.length], after = vertices[(i + 1) % vertices.length];
      return (px - before[0]) * (after[1] - py) !== (py - before[1]) * (after[0] - px);
    });
    paths.push(`M${polygon.map(([px, py]) => `${px} ${py}`).join("L")}Z`);
  }
  return paths.join("");
}

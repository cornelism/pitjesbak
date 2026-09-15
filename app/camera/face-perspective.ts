export type Point = readonly [number, number];

interface FaceBounds {
  id: number;
  x: number;
  y: number;
  right: number;
  bottom: number;
}

function cross(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function convexHull(points: Point[]): Point[] {
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lower: Point[] = [];
  const upper: Point[] = [];
  for (const point of points) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function polygonArea(points: readonly Point[]): number {
  return Math.abs(points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length];
    return sum + point[0] * next[1] - point[1] * next[0];
  }, 0)) / 2;
}

/** Finds the four face corners and maps camera coordinates into a unit square.
 * A homography corrects both foreshortening and depth-dependent scale, unlike
 * stretching the bounding box. No camera angle or calibration is required.
 */
export function faceRectifier(labels: Uint32Array, width: number, face: FaceBounds): ((point: Point) => Point) | null {
  const boundary: Point[] = [];
  // Row endpoints contain the full convex silhouette, without retaining every pixel.
  for (let y = face.y; y <= face.bottom; y++) {
    let left = face.x;
    let right = face.right;
    while (left <= right && labels[y * width + left] !== face.id) left++;
    while (right > left && labels[y * width + right] !== face.id) right--;
    if (left <= right) {
      boundary.push([left, y]);
      if (right !== left) boundary.push([right, y]);
    }
  }
  const hull = convexHull(boundary);
  const hullArea = polygonArea(hull);
  if (hull.length < 4 || hullArea < 100) return null;

  // Find the maximum-area quadrilateral. For each diagonal, independently pick
  // the largest triangle on either side. This retains sharp face corners even
  // when small rotated dice have conspicuous raster stair steps along the edges.
  let corners: readonly [Point, Point, Point, Point] | null = null;
  let bestArea = 0;
  for (let i = 0; i < hull.length - 3; i++) {
    for (let k = i + 2; k < hull.length - 1; k++) {
      let j = i + 1;
      let l = k + 1;
      for (let candidate = j + 1; candidate < k; candidate++) {
        if (cross(hull[i], hull[candidate], hull[k]) > cross(hull[i], hull[j], hull[k])) j = candidate;
      }
      for (let candidate = l + 1; candidate < hull.length; candidate++) {
        if (cross(hull[i], hull[k], hull[candidate]) > cross(hull[i], hull[k], hull[l])) l = candidate;
      }
      const area = (cross(hull[i], hull[j], hull[k]) + cross(hull[i], hull[k], hull[l])) / 2;
      if (area > bestArea) {
        bestArea = area;
        corners = [hull[i], hull[j], hull[k], hull[l]];
      }
    }
  }
  // Allow rounded die corners plus pixel quantization, but reject silhouettes
  // that lose more than 15% of their area when represented by four corners.
  if (!corners || bestArea / hullArea < 0.85) return null;
  const lengths = corners.map((point, i) => {
    const next = corners[(i + 1) % 4];
    return Math.hypot(point[0] - next[0], point[1] - next[1]);
  });
  if (Math.min(...lengths) / Math.max(...lengths) < 0.5) return null;

  const [p0, p1, p2, p3] = corners;
  const dx1 = p1[0] - p2[0];
  const dx2 = p3[0] - p2[0];
  const dx3 = p0[0] - p1[0] + p2[0] - p3[0];
  const dy1 = p1[1] - p2[1];
  const dy2 = p3[1] - p2[1];
  const dy3 = p0[1] - p1[1] + p2[1] - p3[1];
  const determinant = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(determinant) < 1e-6) return null;

  // Unit square -> image: x=(a*u+b*v+c)/(g*u+h*v+1), likewise for y.
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  const a = p1[0] - p0[0] + g * p1[0];
  const b = p3[0] - p0[0] + h * p3[0];
  const c = p0[0];
  const d = p1[1] - p0[1] + g * p1[1];
  const e = p3[1] - p0[1] + h * p3[1];
  const f = p0[1];

  return ([x, y]) => {
    const ax = a - x * g;
    const bx = b - x * h;
    const ay = d - y * g;
    const by = e - y * h;
    const divisor = ax * by - bx * ay;
    if (Math.abs(divisor) < 1e-6) return [NaN, NaN];
    return [((x - c) * by - bx * (y - f)) / divisor, (ax * (y - f) - (x - c) * ay) / divisor];
  };
}

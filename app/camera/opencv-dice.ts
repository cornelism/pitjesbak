import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie, DieValue } from "./dice-types";
import { faceRectifier, type Point } from "./face-perspective";

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

function readPattern(points: readonly Point[]): DieValue | null {
  const count = points.length;
  if (count !== 1 && count !== 2 && count !== 3 && count !== 4 && count !== 5 && count !== 6) return null;
  if (points.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || x >= 1 || y <= 0 || y >= 1)) return null;
  const cx = points.reduce((sum, point) => sum + point[0], 0) / count;
  const cy = points.reduce((sum, point) => sum + point[1], 0) / count;
  if (Math.hypot(cx - 0.5, cy - 0.5) > 0.18) return null;
  if (count > 1) {
    const actual = signature(points);
    const expected = signature(patterns[count - 1]);
    if (actual.span < 0.4 || actual.span > 1.1) return null;
    if (actual.distances.some((distance, i) => Math.abs(distance - expected.distances[i]) > 0.12)) return null;
  }
  return count;
}

/** OpenCV finds whole cubes and enclosed pips. An upright camera's viewing angle
 * determines which part of each cube is its top face, before pattern validation.
 * cameraTilt is degrees away from overhead; zero preserves the entire face.
 */
export function detectDiceOpenCv(
  cv: typeof OpenCv,
  frame: Pick<ImageData, "data" | "width" | "height">,
  cameraTilt: number,
): DetectedDie[] {
  const { width, height, data } = frame;
  if (!width || !height || data.length !== width * height * 4 || !Number.isFinite(cameraTilt)) return [];
  const owned: { delete(): void }[] = [];
  function own<T extends { delete(): void }>(object: T): T { owned.push(object); return object; }
  try {
    const source = own(cv.matFromArray(height, width, cv.CV_8UC4, data));
    const gray = own(new cv.Mat());
    const binary = own(new cv.Mat());
    const contours = own(new cv.MatVector());
    const hierarchy = own(new cv.Mat());
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
    cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    cv.findContours(binary, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE);
    const detected: DetectedDie[] = [];
    const tilt = Math.max(0, Math.min(60, cameraTilt)) * Math.PI / 180;

    for (let i = 0; i < contours.size(); i++) {
      if (hierarchy.data32S[i * 4 + 3] !== -1) continue;
      const contour = contours.get(i);
      try {
        const bounds = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        const { x, y, width: w, height: h } = bounds;
        if (area < 225 || area > width * height * 0.3 || w / h < 0.45 || w / h > 1.8 || area / (w * h) < 0.38) continue;
        if (x === 0 || y === 0 || x + w >= width || y + h >= height) continue;

        const silhouette = cv.Mat.zeros(height, width, cv.CV_8UC1);
        try {
          cv.drawContours(silhouette, contours, i, new cv.Scalar(255), cv.FILLED);
          // A square rotated on the table has equal X/Y extents. Its projected
          // top depth is width*cos(tilt); the remaining height is the side face.
          // Subtract that vertical extrusion from EACH column's lower boundary.
          const sideHeight = tilt === 0 ? 0 : Math.max(0, h - w * Math.cos(tilt));
          const top = new Uint32Array(w * h);
          let left = w, right = 0, bottom = 0, firstY = h;
          for (let xx = 0; xx < w; xx++) {
            let lower = y + h - 1;
            while (lower >= y && !silhouette.data[lower * width + x + xx]) lower--;
            const boundary = lower - sideHeight;
            for (let yy = 0; yy < h; yy++) {
              if (y + yy > boundary || !silhouette.data[(y + yy) * width + x + xx]) continue;
              top[yy * w + xx] = 1;
              left = Math.min(left, xx); right = Math.max(right, xx);
              firstY = Math.min(firstY, yy); bottom = Math.max(bottom, yy);
            }
          }
          // For a whole cube, use the calibrated table projection. Its rounded
          // silhouette is not a planar quadrilateral suitable for a homography.
          const rectify = tilt > 0
            ? ([px, py]: Point): Point => [px / (w - 1), py / ((w - 1) * Math.cos(tilt))]
            : faceRectifier(top, w, { id: 1, x: left, y: firstY, right, bottom });
          if (!rectify) continue;
          const pips: { point: Point; area: number }[] = [];
          for (let child = hierarchy.data32S[i * 4 + 2]; child !== -1; child = hierarchy.data32S[child * 4]) {
            const pip = contours.get(child);
            try {
              const pipArea = cv.contourArea(pip);
              if (pipArea < 4 || pipArea / area < 0.003 || pipArea / area > 0.085 || pip.rows < 5) continue;
              const ellipse = cv.fitEllipse(pip);
              const axes = [ellipse.size.width, ellipse.size.height];
              if (Math.min(...axes) / Math.max(...axes) < 0.35) continue;
              const m = cv.moments(pip);
              const px = m.m10 / m.m00 - x;
              const py = m.m01 / m.m00 - y;
              if (!top[Math.round(py) * w + Math.round(px)]) continue;
              pips.push({ point: rectify([px, py]), area: pipArea });
            } finally { pip.delete(); }
          }
          if (!pips.length || Math.max(...pips.map((pip) => pip.area)) / Math.min(...pips.map((pip) => pip.area)) > 2.5) continue;
          const value = readPattern(pips.map((pip) => pip.point));
          if (value) detected.push({ value, x, y, width: w, height: h });
        } finally { silhouette.delete(); }
      } finally { contour.delete(); }
    }
    return detected.sort((a, b) => a.x - b.x || a.y - b.y);
  } finally {
    // OpenCV allocates WASM memory outside the JS garbage collector.
    for (const object of owned.reverse()) object.delete();
  }
}

import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "./dice-types";
import { faceRectifier, type Point } from "./face-perspective";
import { hasConsistentPipSizes, readPipPattern, readSeparatedTop, type Pip } from "./pip-pattern";

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
  function own<T extends { delete(): void }>(object: T): T {
    owned.push(object);
    return object;
  }

  try {
    const source = own(cv.matFromArray(height, width, cv.CV_8UC4, data));
    const gray = own(new cv.Mat());
    const binary = own(new cv.Mat());
    const contours = own(new cv.MatVector());
    const hierarchy = own(new cv.Mat());
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
    const threshold = cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    // Preserve narrow light rims around small, foreshortened pips. At the
    // unadjusted Otsu threshold those holes can merge with the background.
    if (cameraTilt > 0) cv.threshold(gray, binary, threshold * 0.75, 255, cv.THRESH_BINARY);
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
          let left = w;
          let right = 0;
          let bottom = 0;
          let firstY = h;
          for (let xx = 0; xx < w; xx++) {
            let lower = y + h - 1;
            while (lower >= y && !silhouette.data[lower * width + x + xx]) lower--;
            const boundary = lower - sideHeight;
            for (let yy = 0; yy < h; yy++) {
              if (y + yy > boundary || !silhouette.data[(y + yy) * width + x + xx]) continue;
              top[yy * w + xx] = 1;
              left = Math.min(left, xx);
              right = Math.max(right, xx);
              firstY = Math.min(firstY, yy);
              bottom = Math.max(bottom, yy);
            }
          }
          // For a whole cube, use the calibrated table projection. Its rounded
          // silhouette is not a planar quadrilateral suitable for a homography.
          const rectify = tilt > 0
            ? ([px, py]: Point): Point => [px / (w - 1), py / ((w - 1) * Math.cos(tilt))]
            : faceRectifier(top, w, { id: 1, x: left, y: firstY, right, bottom });
          if (!rectify) continue;
          const pips: Pip[] = [];
          const allPips: Pip[] = [];
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
              allPips.push({ point: [px, py], area: pipArea });
              if (!top[Math.round(py) * w + Math.round(px)]) continue;
              pips.push({ point: rectify([px, py]), area: pipArea });
            } finally {
              pip.delete();
            }
          }
          const consistentPips = hasConsistentPipSizes(pips);
          const value = (consistentPips ? readPipPattern(pips.map((pip) => pip.point)) : null)
            ?? (tilt > 0 ? readSeparatedTop(allPips, w, h) : null);
          if (value) detected.push({ value, x, y, width: w, height: h });
        } finally {
          silhouette.delete();
        }
      } finally {
        contour.delete();
      }
    }
    return detected.sort((a, b) => a.x - b.x || a.y - b.y);
  } finally {
    // OpenCV allocates WASM memory outside the JS garbage collector.
    for (const object of owned.reverse()) object.delete();
  }
}

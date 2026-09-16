import type * as OpenCv from "@techstark/opencv-js";
import { withCvResources } from "./cv-resources";
import { hasConsistentPipSizes, readPipPattern, readSeparatedTop } from "./pip-pattern";
import type { FaceBounds } from "./top-face";
import type { Pip, Point } from "./types";

/** A three needs the calibrated top plane: an affine fit cannot constrain a line. */
export function readRimThree(pips: readonly Pip[], width: number, height: number, tilt: number, maxPipArea: number) {
  if (width <= 1 || height <= 0 || !Number.isFinite(tilt) || tilt <= 0 || tilt >= Math.PI / 2) return null;
  const ordered = [...pips].sort((a, b) => a.point[1] - b.point[1]);
  if (ordered.length < 3) return null;
  const face = ordered.slice(0, 3);
  const lowest = face[2].point[1];
  const largestArea = Math.max(...face.map((pip) => pip.area));
  if (!hasConsistentPipSizes(face, 1) || largestArea > maxPipArea || lowest > height * 0.6) return null;
  if (ordered[3] && ordered[3].point[1] - lowest < 1.5 * Math.sqrt(largestArea / Math.PI)) return null;
  const pixelSize: Point = [1 / width, 1 / (width * Math.cos(tilt))];
  const points = face.map(({ point: [x, y] }): Point => [(x + 0.5) * pixelSize[0], (y + 0.5) * pixelSize[1]]);
  return readPipPattern(points, pixelSize, true) === 3 ? 3 : null;
}

/** Recover measured dark marks at a small die's rim, including open notches.
 * A convex envelope closes the outline, not the gaps between pip components.
 */
export function readRimTop(
  cv: typeof OpenCv, binary: OpenCv.Mat, contour: OpenCv.Mat,
  bounds: FaceBounds, enclosedPips: number, tilt = 0,
  gray?: OpenCv.Mat,
) {
  if (enclosedPips < 2 || bounds.width > 40 || bounds.height > 40) return null;
  return withCvResources((own) => {
    const { x, y, width, height } = bounds;
    const localContour = own(contour.clone());
    for (let i = 0; i < localContour.data32S.length; i += 2) {
      localContour.data32S[i] -= x;
      localContour.data32S[i + 1] -= y;
    }
    const hull = own(new cv.Mat());
    const hulls = own(new cv.MatVector());
    cv.convexHull(localContour, hull);
    hulls.push_back(hull);
    const marks = own(cv.Mat.zeros(height, width, cv.CV_8UC1));
    cv.drawContours(marks, hulls, 0, new cv.Scalar(255), cv.FILLED);
    const interior = own(new cv.Mat());
    const kernel = own(cv.Mat.ones(3, 3, cv.CV_8UC1));
    cv.erode(marks, interior, kernel, new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, new cv.Scalar(0));
    const region = own(binary.roi(new cv.Rect(x, y, width, height)));
    const dark = own(new cv.Mat());
    if (gray) {
      // Keep the located face silhouette while separating only the darkest
      // pip centers. A weak gray bridge must not merge two measured pips.
      const intensities = own(gray.roi(new cv.Rect(x, y, width, height)));
      const threshold = cv.threshold(intensities, dark, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);
      cv.threshold(intensities, dark, threshold * 0.5, 255, cv.THRESH_BINARY_INV);
    } else cv.bitwise_not(region, dark);
    cv.bitwise_and(marks, dark, marks);

    const labels = own(new cv.Mat()), stats = own(new cv.Mat()), centers = own(new cv.Mat());
    // Match the holes of an eight-connected bright contour: diagonally adjacent
    // dark pixels still belong to separate pips (four-connected background).
    const count = cv.connectedComponentsWithStats(marks, labels, stats, centers, 4, cv.CV_32S);
    // Convex closure also fills tiny gaps along a rounded silhouette. A pip
    // must reach inside the hull, not consist solely of its outermost pixels.
    const interiorComponents = new Set<number>();
    for (let i = 0; i < interior.data.length; i++) {
      if (interior.data[i]) interiorComponents.add(labels.data32S[i]);
    }
    const pips: Pip[] = [];
    for (let i = 1; i < count; i++) {
      const area = stats.data32S[i * stats.cols + cv.CC_STAT_AREA];
      const markWidth = stats.data32S[i * stats.cols + cv.CC_STAT_WIDTH];
      const markHeight = stats.data32S[i * stats.cols + cv.CC_STAT_HEIGHT];
      // Pixel area remains meaningful for a one-pixel-high pip, unlike polygon area.
      // A vertical one-pixel outline sliver cannot be a foreshortened top pip.
      if (area < 3 || !interiorComponents.has(i) || (markWidth === 1 && markHeight >= 3)) continue;
      pips.push({ point: [centers.data64F[i * 2], centers.data64F[i * 2 + 1]], area });
    }
    const maxPipArea = cv.contourArea(hull) * 0.085;
    const value = enclosedPips === 2
      ? readRimThree(pips, width, height, tilt, maxPipArea)
      : readSeparatedTop(pips, width, height, maxPipArea, 1);
    return value && value > enclosedPips ? value : null;
  });
}

/** The rim pass may retain sides that were absent from the original top mask. */
export function sameRimTop(top: FaceBounds, cube: FaceBounds): boolean {
  return top.width >= cube.width * 0.7 && top.width <= cube.width * 1.3
    && Math.abs(top.x + top.width / 2 - cube.x - cube.width / 2) <= cube.width * 0.2
    && top.y >= cube.y - 2 && top.y <= cube.y + cube.width * 0.25
    && top.y + top.height <= cube.y + cube.height + 2;
}

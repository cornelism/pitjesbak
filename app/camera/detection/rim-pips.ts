import type * as OpenCv from "@techstark/opencv-js";
import { withCvResources } from "./cv-resources";
import { readSeparatedTop } from "./pip-pattern";
import type { FaceBounds } from "./top-face";
import type { Pip } from "./types";

/** Recover measured dark marks at a small die's rim, including open notches.
 * A convex envelope closes the outline, not the gaps between pip components.
 */
export function readRimTop(
  cv: typeof OpenCv, binary: OpenCv.Mat, contour: OpenCv.Mat,
  bounds: FaceBounds, enclosedPips: number,
) {
  if (enclosedPips < 3 || bounds.width > 40 || bounds.height > 40) return null;
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
    const region = own(binary.roi(new cv.Rect(x, y, width, height)));
    const dark = own(new cv.Mat());
    cv.bitwise_not(region, dark);
    cv.bitwise_and(marks, dark, marks);

    const labels = own(new cv.Mat()), stats = own(new cv.Mat()), centers = own(new cv.Mat());
    // Match the holes of an eight-connected bright contour: diagonally adjacent
    // dark pixels still belong to separate pips (four-connected background).
    const count = cv.connectedComponentsWithStats(marks, labels, stats, centers, 4, cv.CV_32S);
    const pips: Pip[] = [];
    for (let i = 1; i < count; i++) {
      const area = stats.data32S[i * stats.cols + cv.CC_STAT_AREA];
      // Pixel area remains meaningful for a one-pixel-high pip, unlike polygon area.
      if (area < 3) continue;
      pips.push({ point: [centers.data64F[i * 2], centers.data64F[i * 2 + 1]], area });
    }
    const value = readSeparatedTop(pips, width, height, cv.contourArea(hull) * 0.085, 1);
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

import type * as OpenCv from "@techstark/opencv-js";
import { findFaceNeckCuts } from "./face-neck-cuts";
import type { Point } from "./face-perspective";

/** Split joined dice using their filled silhouettes, preserving pip holes.
 * Open narrow contacts first; for tight chains, try opposing indentations.
 * Only retain splits with multiple substantial pieces and most of the area.
 */
export function separateDice(cv: typeof OpenCv, binary: OpenCv.Mat): void {
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < contours.size(); i++) {
      const owned: { delete(): void }[] = [];
      function own<T extends { delete(): void }>(object: T): T {
        owned.push(object);
        return object;
      }
      try {
        const contour = own(contours.get(i));
        const area = cv.contourArea(contour);
        if (area < 450 || area > binary.rows * binary.cols * 0.3) continue;
        const hull = own(new cv.Mat());
        cv.convexHull(contour, hull);
        // Leave room for raster rounding on wider contacts at different scales.
        if (area / cv.contourArea(hull) > 0.92) continue;

        const bounds = cv.boundingRect(contour);
        const { x, y, width, height } = bounds;
        const silhouette = own(cv.Mat.zeros(height, width, cv.CV_8UC1));
        cv.drawContours(silhouette, contours, i, new cv.Scalar(255), cv.FILLED,
          cv.LINE_8, hierarchy, 0, new cv.Point(-x, -y));
        const originalPixels = cv.countNonZero(silhouette);
        const opened = own(new cv.Mat());
        const pieces = own(new cv.MatVector());
        const pieceHierarchy = own(new cv.Mat());
        const region = own(binary.roi(bounds));
        const removed = own(new cv.Mat());

        function applySplit(protectPips = false): boolean {
          if (cv.countNonZero(opened) < originalPixels * 0.85) return false;
          cv.findContours(opened, pieces, pieceHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          if (pieces.size() < 2) return false;
          for (let j = 0; j < pieces.size(); j++) {
            const piece = own(pieces.get(j));
            if (cv.contourArea(piece) < 225) return false;
          }
          cv.subtract(silhouette, opened, removed);
          if (protectPips) {
            // A cut must leave a light rim around every existing pip hole.
            const holes = own(new cv.Mat());
            cv.subtract(silhouette, region, holes);
            const margin = own(new cv.Mat());
            const kernel = own(cv.Mat.ones(3, 3, cv.CV_8UC1));
            cv.dilate(removed, margin, kernel);
            cv.bitwise_and(margin, holes, margin);
            if (cv.countNonZero(margin)) return false;
          }
          // Remove only pixels belonging to this contour, preserving neighbors
          // that happen to share its rectangular region.
          region.setTo(new cv.Scalar(0), removed);
          return true;
        }

        let separated = false;
        for (const divisor of [8, 4]) {
          const size = Math.max(3, 2 * Math.floor(Math.min(width, height) / divisor) + 1);
          const kernel = own(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(size, size)));
          cv.morphologyEx(silhouette, opened, cv.MORPH_OPEN, kernel,
            new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, new cv.Scalar(0));
          if (cv.countNonZero(opened) < originalPixels * 0.85) break;
          if (applySplit()) { separated = true; break; }
        }
        if (separated) continue;

        // Opening can erase tightly packed faces before their contacts split.
        // Join inward-facing notches instead, without selecting or moving pips.
        const distance = own(new cv.Mat());
        cv.distanceTransform(silhouette, distance, cv.DIST_L2, cv.DIST_MASK_5);
        const radius = cv.minMaxLoc(distance, silhouette).maxVal;
        const polygon = own(new cv.Mat());
        cv.approxPolyDP(contour, polygon, Math.max(1, radius * 0.08), true);
        const points = Array.from({ length: polygon.rows }, (_, j): Point => [
          polygon.data32S[j * 2] - x, polygon.data32S[j * 2 + 1] - y,
        ]);
        const cuts = findFaceNeckCuts(points, radius * 2);
        if (!cuts.length) continue;
        silhouette.copyTo(opened);
        for (const [a, b] of cuts) {
          cv.line(opened, new cv.Point(...a), new cv.Point(...b), new cv.Scalar(0), Math.max(1, Math.round(radius * 0.08)));
        }
        applySplit(true);
      } finally {
        for (const object of owned.reverse()) object.delete();
      }
    }
  } finally {
    hierarchy.delete();
    contours.delete();
  }
}

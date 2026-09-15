import type * as OpenCv from "@techstark/opencv-js";

/** Remove narrow connections between otherwise separate dice in a binary mask.
 * Work on filled silhouettes so erosion never enlarges or merges pip holes.
 * Only apply a split when it leaves multiple substantial pieces and retains
 * most of the silhouette; convex single dice remain untouched.
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
        // Try a gentle opening first, then a larger one for wider contacts.
        // Always start from the original silhouette, and keep the same minimum
        // retained area and piece size at both strengths.
        for (const divisor of [8, 4]) {
          const size = Math.max(3, 2 * Math.floor(Math.min(width, height) / divisor) + 1);
          const kernel = own(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(size, size)));
          cv.morphologyEx(silhouette, opened, cv.MORPH_OPEN, kernel,
            new cv.Point(-1, -1), 1, cv.BORDER_CONSTANT, new cv.Scalar(0));
          if (cv.countNonZero(opened) < originalPixels * 0.85) break;

          cv.findContours(opened, pieces, pieceHierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          if (pieces.size() < 2) continue;
          let substantialPieces = true;
          for (let j = 0; j < pieces.size(); j++) {
            const piece = own(pieces.get(j));
            if (cv.contourArea(piece) < 225) substantialPieces = false;
          }
          if (!substantialPieces) continue;
          const removed = own(new cv.Mat());
          cv.subtract(silhouette, opened, removed);
          const region = own(binary.roi(bounds));
          region.setTo(new cv.Scalar(0), removed);
          break;
        }
      } finally {
        for (const object of owned.reverse()) object.delete();
      }
    }
  } finally {
    hierarchy.delete();
    contours.delete();
  }
}

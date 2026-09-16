import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "../dice-types";
import { separateDice } from "./separate-dice";
import { projectTopFace } from "./top-face";
import { measurePips } from "./pip-contours";
import { readDieValue } from "./read-die-value";

export function readDiceMask(cv: typeof OpenCv, binary: OpenCv.Mat, cameraTilt: number): DetectedDie[] {
  const width = binary.cols, height = binary.rows;
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    separateDice(cv, binary);
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
        // An upright cube projects to at most sqrt(2) times its width in
        // height. Allow rounded/noisy edges, but reject long shadow fragments.
        if (h > w * 1.6) continue;
        if (x === 0 || y === 0 || x + w >= width || y + h >= height) continue;

        const silhouette = cv.Mat.zeros(height, width, cv.CV_8UC1);
        try {
          cv.drawContours(silhouette, contours, i, new cv.Scalar(255), cv.FILLED);
          const face = projectTopFace(silhouette, bounds, tilt);
          if (!face) continue;
          const pips = measurePips(cv, contours, hierarchy, hierarchy.data32S[i * 4 + 2], bounds, area);
          const value = readDieValue(pips, face, bounds, area, tilt);
          if (value) detected.push({ value, x, y, width: w, height: h });
        } finally {
          silhouette.delete();
        }
      } finally {
        contour.delete();
      }
    }
    return detected;
  } finally {
    hierarchy.delete();
    contours.delete();
  }
}

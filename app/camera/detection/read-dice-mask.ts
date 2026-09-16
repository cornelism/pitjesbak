import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "../dice-types";
import { separateDice } from "./separate-dice";
import { projectTopFace, type FaceBounds } from "./top-face";
import { MAX_SINGLE_PIP_RATIO, measurePips } from "./pip-contours";
import { readDieValue } from "./read-die-value";
import { readRimTop } from "./rim-pips";
import { readEllipticalTop } from "./elliptical-top";
import { MAX_CAMERA_ANGLE } from "../camera-angle";

const MIN_PROJECTED_DEPTH = Math.cos(MAX_CAMERA_ANGLE * Math.PI / 180);

export function readDiceMask(
  cv: typeof OpenCv, binary: OpenCv.Mat, cameraTilt: number,
  onCandidate?: (bounds: FaceBounds, pipCount: number, small?: boolean) => void,
  detail: "standard" | "small" | "rim" | "ellipse" = "standard",
  pipIntensities?: OpenCv.Mat,
): DetectedDie[] {
  const width = binary.cols, height = binary.rows;
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    separateDice(cv, binary);
    cv.findContours(binary, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE);
    const detected: DetectedDie[] = [];
    const tilt = Math.max(0, Math.min(MAX_CAMERA_ANGLE, cameraTilt)) * Math.PI / 180;
    // Admit candidates throughout the supported 0–70° range. Thresholding can
    // shorten a tiny top further; reading still requires a validated detail pass.
    const minimumArea = tilt > 0 ? 225 * MIN_PROJECTED_DEPTH : 225;

    for (let i = 0; i < contours.size(); i++) {
      if (hierarchy.data32S[i * 4 + 3] !== -1) continue;
      const contour = contours.get(i);
      try {
        const bounds = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        const { x, y, width: w, height: h } = bounds;
        const maximumAspectRatio = area < 225 ? 1 / MIN_PROJECTED_DEPTH : Math.max(1.8, 1 / Math.cos(tilt));
        if (area < minimumArea || area > width * height * 0.3 || w / h < 0.45 || w / h > maximumAspectRatio || area / (w * h) < 0.38) continue;
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
          const smallTop = tilt > 0 && face.completeFace && w <= 40 && h <= 40 && area / (w * h) >= 0.45;
          // Tiny contours need the detail pass: smoothing can hide half a
          // four or merge a three into a plausible single pip.
          if (area < 225 && detail === "standard") {
            // Smoothing can open every hole onto the rim. Keep compact,
            // filled top candidates for retries even with no enclosed pips;
            // a later pass must still measure and validate the full pattern.
            if (pips.length || smallTop) onCandidate?.(bounds, pips.length, true);
            continue;
          }
          const value = detail === "ellipse"
            ? (tilt > 0 && face.completeFace ? readEllipticalTop(pips, w, h, area * (pips.length === 1 ? MAX_SINGLE_PIP_RATIO : 0.085)) : null)
            : detail === "rim"
            ? readRimTop(cv, binary, contour, bounds, pips.length, tilt, pipIntensities)
            : readDieValue(pips, face, bounds, area, tilt, detail === "small");
          if (value) detected.push({ value, x, y, width: w, height: h });
          // At low resolution even a valid count may have merged or missing
          // pips. Retain unread complete single-pip faces for ellipse validation.
          if (detail === "standard" && w <= 40 && h <= 40 && (pips.length || smallTop)) {
            onCandidate?.(bounds, pips.length, true);
          } else if (!value && (pips.length >= 2 || (pips.length === 1 && face.completeFace))) {
            onCandidate?.(bounds, pips.length);
          }
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

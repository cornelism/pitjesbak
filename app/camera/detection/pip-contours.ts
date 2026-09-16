import type * as OpenCv from "@techstark/opencv-js";
import type { EllipticalPip } from "./types";
import type { FaceBounds } from "./top-face";

export const MAX_SINGLE_PIP_RATIO = 0.2;

/** Measure the enclosed dark contours before deciding which face they belong to. */
export function measurePips(
  cv: typeof OpenCv,
  contours: OpenCv.MatVector,
  hierarchy: OpenCv.Mat,
  firstChild: number,
  bounds: FaceBounds,
  area: number,
): EllipticalPip[] {
  const { x, y } = bounds;
  const allPips: EllipticalPip[] = [];
  for (let child = firstChild; child !== -1; child = hierarchy.data32S[child * 4]) {
    const pip = contours.get(child);
    try {
      const pipArea = cv.contourArea(pip);
      if (pipArea < 4 || pipArea / area < 0.003 || pipArea / area > MAX_SINGLE_PIP_RATIO || pip.rows < 5) continue;
      const ellipse = cv.fitEllipse(pip);
      const axes = [ellipse.size.width, ellipse.size.height];
      if (Math.min(...axes) / Math.max(...axes) < 0.35) continue;
      const m = cv.moments(pip);
      const px = m.m10 / m.m00 - x;
      const py = m.m01 / m.m00 - y;
      allPips.push({ point: [px, py], area: pipArea,
        axisRatio: Math.min(...axes) / Math.max(...axes), angle: ellipse.angle });
    } finally {
      pip.delete();
    }
  }
  return allPips;
}

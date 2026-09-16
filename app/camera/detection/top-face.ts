import { faceRectifier } from "./face-perspective";
import type { Point } from "./types";

export interface FaceBounds { x: number; y: number; width: number; height: number }

export interface TopFace {
  mask: Uint32Array;
  rectify: (point: Point) => Point;
  completeFace: boolean;
  visibleSides: boolean;
}

/** Project a cube's filled silhouette onto its estimated top face. Tilt is radians. */
export function projectTopFace(
  silhouette: { data: Uint8Array; cols: number },
  bounds: FaceBounds,
  tilt: number,
): TopFace | null {
  const { x, y, width: w, height: h } = bounds;
  const width = silhouette.cols;
  // A projected square top is no taller than it is wide for an upright
  // camera. A full cube in our 0–70° range has additional vertical sides.
  // If thresholding already removed those sides, keep the complete face
  // instead of cutting another strip off its bottom (six would become four).
  const completeFace = tilt === 0 || h <= w;
  // A wide cube can still expose sides. Require extra height beyond
  // the projected top before allowing a separated-cluster fallback.
  const visibleSides = tilt > 0 && h > w * Math.cos(tilt) + Math.max(2, w * 0.1);
  // A square rotated on the table has equal X/Y extents. Its projected
  // top depth is width*cos(tilt); the remaining height is the side face.
  // Subtract that vertical extrusion from EACH column's lower boundary.
  const sideHeight = completeFace ? 0 : Math.max(0, h - w * Math.cos(tilt));
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
  return rectify ? { mask: top, rectify, completeFace, visibleSides } : null;
}

import type { DieValue } from "../dice-types";
import { hasConsistentPipSizes, readPipPattern, readSeparatedTop, readWholeFacePattern } from "./pip-pattern";
import { readIsolatedTopOne } from "./isolated-top-pip";
import { readTopBesideSide } from "./side-face-pips";
import { readSeparatedTopThree } from "./separated-top-three";
import { MAX_SINGLE_PIP_RATIO } from "./pip-contours";
import type { EllipticalPip, Point } from "./types";
import type { TopFace, FaceBounds } from "./top-face";

export function readDieValue(
  allPips: readonly EllipticalPip[],
  face: TopFace,
  bounds: FaceBounds,
  area: number,
  tilt: number,
  smallFace = false,
): DieValue | null {
  const { width: w, height: h } = bounds;
  const { mask, rectify, completeFace, visibleSides } = face;
  // Relax pixel-scale centering only for isolated complete tops. If sides are
  // visible, retain the normal strict projection and separated-top validation.
  const useDetailTolerance = smallFace && completeFace && !visibleSides;
  const facePips = allPips.filter(({ point: [px, py] }) => mask[Math.round(py) * w + Math.round(px)]);
  // A large central dot can fill up to 20% of a thresholded face,
  // especially when bright-light segmentation tightens the outline.
  // Other faces keep the stricter limit; all readings need a valid layout.
  const count = facePips.length;
  const maxPipRatio = count === 1 ? MAX_SINGLE_PIP_RATIO : 0.085;
  const consistentPips = hasConsistentPipSizes(facePips)
    && facePips.every((pip) => pip.area / area <= maxPipRatio);
  // The calibrated projection is linear, so one image pixel has these
  // normalized extents. Overhead homography validation keeps its strict path.
  const projectedWidth = useDetailTolerance ? w : w - 1;
  const pixelSize: Point = tilt > 0 ? [1 / projectedWidth, 1 / (projectedWidth * Math.cos(tilt))] : [0, 0];
  // At small sizes, include each boundary pixel's half-cell extent rather
  // than treating its center as the outer edge of the face.
  const normalize = useDetailTolerance && tilt > 0
    ? ([x, y]: Point): Point => [(x + 0.5) * pixelSize[0], (y + 0.5) * pixelSize[1]]
    : rectify;
  const validatedCount = consistentPips
    ? readPipPattern(facePips.map((pip) => normalize(pip.point)), pixelSize, useDetailTolerance)
      ?? (tilt > 0 && completeFace ? readWholeFacePattern(facePips, w, h, useDetailTolerance ? 2 : 0) : null)
    : null;
  if (useDetailTolerance) return validatedCount;
  // For cubes, a separated upper cluster can refine the estimated mask.
  // The one-pip fallback additionally requires ellipse evidence that
  // the lower marks belong to different planes, not one complete face.
  return validatedCount
    ?? (visibleSides
      ? readSeparatedTop(allPips, w, h, area * 0.085) : null)
    ?? (tilt > 0 ? readIsolatedTopOne(allPips, w, h) : null)
    ?? (tilt > 0 ? readSeparatedTopThree(allPips, w, h, area * 0.085) : null)
    ?? (tilt > 0 ? readTopBesideSide(allPips, w, h, area * 0.085) : null);
}

import type { DieValue } from "../dice-types";
import { hasConsistentPipSizes, readPipPattern, readSeparatedTop, readWholeFacePattern } from "./pip-pattern";
import { readIsolatedTopOne } from "./isolated-top-pip";
import { readTopBesideSide } from "./side-face-pips";
import { MAX_SINGLE_PIP_RATIO } from "./pip-contours";
import type { EllipticalPip } from "./types";
import type { TopFace, FaceBounds } from "./top-face";

export function readDieValue(
  allPips: readonly EllipticalPip[],
  face: TopFace,
  bounds: FaceBounds,
  area: number,
  tilt: number,
): DieValue | null {
  const { width: w, height: h } = bounds;
  const { mask, rectify, completeFace, visibleSides } = face;
  const facePips = allPips.filter(({ point: [px, py] }) => mask[Math.round(py) * w + Math.round(px)]);
  // A large central dot can fill up to 20% of a thresholded face,
  // especially when bright-light segmentation tightens the outline.
  // Other faces keep the stricter limit; all readings need a valid layout.
  const count = facePips.length;
  const maxPipRatio = count === 1 ? MAX_SINGLE_PIP_RATIO : 0.085;
  const consistentPips = hasConsistentPipSizes(facePips)
    && facePips.every((pip) => pip.area / area <= maxPipRatio);
  const validatedCount = consistentPips
    ? readPipPattern(facePips.map((pip) => rectify(pip.point)))
      ?? (tilt > 0 && completeFace ? readWholeFacePattern(facePips, w, h) : null)
    : null;
  // For cubes, a separated upper cluster can refine the estimated mask.
  // The one-pip fallback additionally requires ellipse evidence that
  // the lower marks belong to different planes, not one complete face.
  return validatedCount
    ?? (visibleSides
      ? readSeparatedTop(allPips, w, h, area * 0.085) : null)
    ?? (tilt > 0 ? readIsolatedTopOne(allPips, w, h) : null)
    ?? (tilt > 0 ? readTopBesideSide(allPips, w, h, area * 0.085) : null);
}

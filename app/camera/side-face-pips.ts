import type { EllipticalPip } from "./isolated-top-pip";
import { readWholeFacePattern } from "./pip-pattern";

/** A narrow side can remain attached to a nearly overhead top face.
 * Identify it from multiple vertical ellipses at one edge, never pip count alone.
 */
export function readTopBesideSide(
  pips: readonly EllipticalPip[], width: number, height: number, maxPipArea: number,
) {
  const side = pips.filter((pip) => pip.axisRatio <= 0.6
    && Math.min(pip.angle, 180 - pip.angle) <= 30
    && (pip.point[0] < width * 0.2 || pip.point[0] > width * 0.8));
  if (side.length < 2) return null;
  const onLeft = side.every((pip) => pip.point[0] < width * 0.2);
  const onRight = side.every((pip) => pip.point[0] > width * 0.8);
  if (!onLeft && !onRight) return null;
  const top = pips.filter((pip) => !side.includes(pip));
  if (top.length < 4 || top.length > 6 || top.some((pip) => pip.area > maxPipArea)) return null;
  // Top pips must be visibly rounder than the edge-on side, with no shared rim.
  if (Math.min(...top.map((pip) => pip.axisRatio)) < Math.max(...side.map((pip) => pip.axisRatio)) + 0.2) return null;
  const topXs = top.map((pip) => pip.point[0]), sideXs = side.map((pip) => pip.point[0]);
  const gap = onLeft ? Math.min(...topXs) - Math.max(...sideXs) : Math.min(...sideXs) - Math.max(...topXs);
  if (gap < Math.sqrt(Math.max(...top.map((pip) => pip.area)) / Math.PI)) return null;
  return readWholeFacePattern(top, width, height);
}

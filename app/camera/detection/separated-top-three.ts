import { hasConsistentPipSizes, readPipPattern } from "./pip-pattern";
import type { EllipticalPip, Point } from "./types";

/** Circular pips become matching ellipses on one plane. Use that measured
 * foreshortening only when lower, upright ellipses establish a distinct side.
 */
export function readSeparatedTopThree(pips: readonly EllipticalPip[], width: number, height: number, maxPipArea: number): 3 | null {
  if (pips.length < 4 || width <= 1 || height <= 0) return null;
  const ordered = [...pips].sort((a, b) => a.point[1] - b.point[1]);
  const top = ordered.slice(0, 3), sides = ordered.slice(3);
  if (!hasConsistentPipSizes(top) || top.some((pip) => pip.area > maxPipArea
    || pip.axisRatio < 0.35 || pip.axisRatio > 0.8 || Math.abs(pip.angle - 90) > 30)) return null;
  if (sides.some((pip) => pip.axisRatio > 0.65 || Math.min(pip.angle, 180 - pip.angle) > 30)) return null;
  if (!sides.every((pip) => pip.point[0] < width * 0.2)
    && !sides.every((pip) => pip.point[0] > width * 0.8)) return null;
  const lowest = top[2].point[1];
  const radius = Math.sqrt(Math.max(...top.map((pip) => pip.area)) / Math.PI);
  if (lowest > height * 0.6 || sides[0].point[1] - lowest < 1.5 * radius) return null;
  const ratios = top.map((pip) => pip.axisRatio);
  if (Math.max(...ratios) - Math.min(...ratios) > 0.15) return null;
  const depth = width * ratios.reduce((sum, ratio) => sum + ratio, 0) / 3;
  const pixelSize: Point = [1 / width, 1 / depth];
  const points = top.map(({ point: [x, y] }): Point => [(x + 0.5) / width, (y + 0.5) / depth]);
  return readPipPattern(points, pixelSize, true) === 3 ? 3 : null;
}

import { hasConsistentPipSizes, readPipPattern } from "./pip-pattern";
import type { EllipticalPip, Point } from "./types";

/** One to three pips cannot establish a plane from their centers.
 * Ellipse shape supplies an independent depth estimate for a complete top.
 */
export function readEllipticalTop(pips: readonly EllipticalPip[], width: number, height: number, maxPipArea: number): 1 | 2 | 3 | null {
  if ((pips.length !== 1 && pips.length !== 2 && pips.length !== 3) || !Number.isFinite(width)
    || !Number.isFinite(height) || width <= 1 || height <= 0 || height > width) return null;
  if (!hasConsistentPipSizes(pips) || pips.some((pip) => pip.area > maxPipArea || !Number.isFinite(pip.axisRatio)
    || !Number.isFinite(pip.angle) || pip.axisRatio < 0.35 || pip.axisRatio > 0.9
    || Math.abs(pip.angle - 90) > 30)) return null;
  const ratios = pips.map((pip) => pip.axisRatio);
  if (Math.max(...ratios) - Math.min(...ratios) > 0.15) return null;
  const depth = width * ratios.reduce((sum, ratio) => sum + ratio, 0) / pips.length;
  // A single mark has no other pips to corroborate its plane. Require the
  // complete outline's depth to agree with its ellipse before centering it.
  if (pips.length === 1 && Math.abs(height - depth) > Math.max(3, depth * 0.2)) return null;
  const pixelSize: Point = [1 / width, 1 / depth];
  const points = pips.map(({ point: [x, y] }): Point => [(x + 0.5) / width, (y + 0.5) / depth]);
  const value = readPipPattern(points, pixelSize);
  return value === 1 || value === 2 || value === 3 ? value : null;
}

import type { EllipticalPip } from "./types";

/** Scale-independent ellipse shape; round pips have no preferred direction. */
function ellipseShape(pip: EllipticalPip): readonly [number, number] {
  const flattening = (1 - pip.axisRatio ** 2) / (1 + pip.axisRatio ** 2);
  const angle = (pip.angle + 90) * Math.PI / 180;
  return [flattening * Math.cos(2 * angle), flattening * Math.sin(2 * angle)];
}

/** Recognize an isolated top one when a wide cube was mistaken for one face.
 * Lower marks must provide evidence of a different plane, not a missing pattern.
 */
export function readIsolatedTopOne(pips: readonly EllipticalPip[], width: number, height: number): 1 | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0
    || pips.length < 3 || height < width * 0.8 || height > width * 1.5) return null;
  if (pips.some(({ point: [x, y], area, axisRatio, angle }) =>
    ![x, y, area, axisRatio, angle].every(Number.isFinite)
    || x <= 0 || x >= width || y <= 0 || y >= height || area <= 0
    || axisRatio <= 0 || axisRatio > 1 || angle < 0 || angle > 180)) return null;
  const [top, ...sides] = [...pips].sort((a, b) => a.point[1] - b.point[1]);
  const [x, y] = top.point;
  if (Math.abs(x / width - 0.5) > 0.18 || y / height < 0.08 || y / height > 0.3) return null;
  if (top.axisRatio < 0.35 || top.axisRatio > 0.75 || Math.abs(top.angle - 90) > 30) return null;
  if (sides[0].point[1] - y < 1.5 * Math.sqrt(top.area / Math.PI)) return null;
  const [xx, xy] = ellipseShape(top);
  return sides.every((pip) => {
    const [sx, sy] = ellipseShape(pip);
    return Math.hypot(xx - sx, xy - sy) > 0.22;
  }) ? 1 : null;
}

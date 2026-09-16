import { surfaceOutline } from "./surface-outline";

export interface PlayArea {
  width: number;
  height: number;
  fill: string;
  outline: string;
}

/** Render the actual sampled surface; row runs keep the SVG small. Coordinates
 * stay in the full camera frame so digital zoom can use the preview's transform.
 */
export function createPlayArea(samples: readonly { x: number; y: number }[], width: number, height: number, step = 4): PlayArea | null {
  if (!samples.length) return null;
  const rows = new Map<number, number[]>();
  for (const { x, y } of samples) {
    const row = rows.get(y) ?? [];
    row.push(x);
    rows.set(y, row);
  }
  const fill: string[] = [];
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b);
    for (let i = 0; i < xs.length; i++) {
      const left = Math.max(0, xs[i] - step / 2);
      while (i + 1 < xs.length && xs[i + 1] === xs[i] + step) i++;
      const right = Math.min(width, xs[i] + step / 2);
      const top = Math.max(0, y - step / 2), bottom = Math.min(height, y + step / 2);
      fill.push(`M${left} ${top}H${right}V${bottom}H${left}Z`);
    }
  }
  return { width, height, fill: fill.join(""), outline: surfaceOutline(samples, width, height, step) };
}

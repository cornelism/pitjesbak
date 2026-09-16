export interface SurfaceSample { x: number; y: number; color: readonly [number, number, number] }
interface Region {
  table: SurfaceSample["color"] | null;
  bounds: { x: number; y: number; width: number; height: number };
}

function sameSurface(color: SurfaceSample["color"], reference: SurfaceSample["color"]) {
  const total = color[0] + color[1] + color[2];
  const referenceTotal = reference[0] + reference[1] + reference[2];
  if (!total || !referenceTotal) return false;
  const dominant = reference.indexOf(Math.max(...reference));
  const strength = reference[dominant] / referenceTotal - 1 / 3;
  // Neutral surfaces have no reliable hue. Colored felt must retain its
  // dominant channel, so similarly bright gray/blue rails cannot join it.
  if (strength < 0.025) return color.every((value, i) => Math.abs(value - reference[i]) <= 32);
  return total >= referenceTotal * 0.4 && total <= referenceTotal * 2.25
    && color[dominant] / total - 1 / 3 >= strength * 0.55
    && Math.hypot(...color.map((value, i) => value / total - reference[i] / referenceTotal)) <= 0.12;
}

function neighbors(index: number, columns: number, rows: number): number[] {
  const x = index % columns, y = Math.floor(index / columns);
  return [x > 0 ? index - 1 : -1, x + 1 < columns ? index + 1 : -1,
    y > 0 ? index - columns : -1, y + 1 < rows ? index + columns : -1].filter((i) => i >= 0);
}

/** Locate one connected playing surface, close interior dice/shadow holes,
 * and break thin color bridges onto the rail before selecting its boundary.
 */
export function detectSurface(samples: readonly SurfaceSample[], regions: readonly Region[], width: number, height: number) {
  const step = 4, columns = Math.ceil(width / step), rows = Math.ceil(height / step);
  const eligible = new Uint8Array(columns * rows);
  const seeds = new Set<number>();
  // A die beside the rail can sample more rail than felt. Use the largest
  // agreement group of local colors, rather than admitting every local color.
  const references = regions.flatMap(({ table }) => table ? [table] : []);
  const groups = references.map((reference) => references.filter((other) =>
    sameSurface(other, reference) && sameSurface(reference, other),
  ));
  const consensus = groups.reduce<SurfaceSample["color"][]>((largest, group) => group.length > largest.length ? group : largest, []);
  for (const sample of samples) {
    const index = Math.floor(sample.y / step) * columns + Math.floor(sample.x / step);
    if (!consensus.some((table) => sameSurface(sample.color, table))) continue;
    eligible[index] = 1;
    if (regions.some(({ bounds: b }) => sample.x >= b.x - b.width * 0.6 && sample.x <= b.x + b.width * 1.6
      && sample.y >= b.y - b.height * 0.6 && sample.y <= b.y + b.height * 1.6)) seeds.add(index);
  }
  // Opening removes narrow bridges and isolated noise. Clip dilation to the
  // original mask so it cannot expand the playing surface onto a rail.
  const eroded = eligible.map((value, index) => {
    if (!value) return 0;
    const x = index % columns, y = Math.floor(index / columns);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (x + dx >= 0 && x + dx < columns && y + dy >= 0 && y + dy < rows
        && !eligible[(y + dy) * columns + x + dx]) return 0;
    }
    return 1;
  });
  const opened = new Uint8Array(eligible.length);
  eroded.forEach((value, index) => {
    if (!value) return;
    const x = index % columns, y = Math.floor(index / columns);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (x + dx >= 0 && x + dx < columns && y + dy >= 0 && y + dy < rows) {
        const next = (y + dy) * columns + x + dx;
        opened[next] = eligible[next];
      }
    }
  });
  let largest: number[] = [];
  for (const seed of seeds) {
    if (!opened[seed]) continue;
    const component = [seed];
    opened[seed] = 0;
    for (let i = 0; i < component.length; i++) {
      for (const next of neighbors(component[i], columns, rows)) {
        if (opened[next]) { opened[next] = 0; component.push(next); }
      }
    }
    if (component.length > largest.length) largest = component;
  }
  if (largest.length < 64) return [];
  const mask = new Uint8Array(eligible.length);
  largest.forEach((index) => { mask[index] = 1; });
  const outside: number[] = [];
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index] && (index < columns || index >= mask.length - columns || index % columns === 0 || index % columns === columns - 1)) {
      mask[index] = 2;
      outside.push(index);
    }
  }
  for (let i = 0; i < outside.length; i++) {
    for (const next of neighbors(outside[i], columns, rows)) {
      if (!mask[next]) { mask[next] = 2; outside.push(next); }
    }
  }
  return Array.from(mask).flatMap((value, index) => value === 2 ? [] : [{ x: index % columns * step + 2, y: Math.floor(index / columns) * step + 2 }]);
}

import type { DetectedDie } from "../dice-types";

export type CameraFrame = Pick<ImageData, "data" | "width" | "height">;
type Color = readonly [number, number, number];
interface Sample { x: number; y: number; color: Color }
interface TableRegion { table: Color | null; bounds: DetectedDie }

function colorAt(frame: CameraFrame, x: number, y: number): Color {
  const i = (y * frame.width + x) * 4;
  return [frame.data[i], frame.data[i + 1], frame.data[i + 2]];
}

function median(values: number[]) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function medianColor(colors: readonly Color[]): Color {
  return [median(colors.map((color) => color[0])), median(colors.map((color) => color[1])), median(colors.map((color) => color[2]))];
}

function inside(x: number, y: number, die: DetectedDie) {
  return x >= die.x && x < die.x + die.width && y >= die.y && y < die.y + die.height;
}

function matches(actual: Color, expected: Color, shift: Color) {
  return actual.every((value, channel) => Math.abs(value - expected[channel] - shift[channel]) <= 32);
}

/** Follow felt-colored samples from the dice; a dark rim separates the desk.
 * Color alone would also include similarly colored objects beyond the tray.
 */
function connectedTable(background: readonly Sample[], regions: readonly TableRegion[], width: number): Sample[] {
  const eligible = new Map(background.filter(({ color }) => regions.some(({ table }) =>
    table && matches(color, table, [0, 0, 0]),
  )).map((sample) => [sample.y * width + sample.x, sample]));
  const queue: Sample[] = [];
  function add(key: number) {
    const sample = eligible.get(key);
    if (sample) { queue.push(sample); eligible.delete(key); }
  }
  for (const sample of background) {
    if (regions.some(({ bounds }) => sample.x >= bounds.x - bounds.width * 0.6
      && sample.x <= bounds.x + bounds.width * 1.6 && sample.y >= bounds.y - bounds.height * 0.6
      && sample.y <= bounds.y + bounds.height * 1.6)) add(sample.y * width + sample.x);
  }
  for (let i = 0; i < queue.length; i++) {
    const { x, y } = queue[i];
    const key = y * width + x;
    if (x >= 4) add(key - 4);
    if (x + 4 < width) add(key + 4);
    add(key - 4 * width);
    add(key + 4 * width);
  }
  return queue;
}

/** Learn the visible table around confirmed dice, independently of pip reading.
 * Changed background patches veto a hand or an unread die moved elsewhere.
 */
export function captureTable(frame: CameraFrame, dice: readonly DetectedDie[]) {
  const { width, height } = frame;
  const background: Sample[] = [];
  for (let y = 2; y < frame.height; y += 4) {
    for (let x = 2; x < frame.width; x += 4) {
      if (!dice.some((die) => inside(x, y, die))) background.push({ x, y, color: colorAt(frame, x, y) });
    }
  }
  const regions = dice.map((die) => {
    const neighbors = background.filter(({ x, y }) => x >= die.x - die.width * 0.6
      && x <= die.x + die.width * 1.6 && y >= die.y - die.height * 0.6 && y <= die.y + die.height * 1.6);
    const table = neighbors.length >= 12 ? medianColor(neighbors.map(({ color }) => color)) : null;
    const pixels: { x: number; y: number }[] = [];
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        pixels.push({
          x: Math.max(0, Math.min(frame.width - 1, Math.floor(die.x + die.width * (0.15 + col * 0.07)))),
          y: Math.max(0, Math.min(frame.height - 1, Math.floor(die.y + die.height * (0.15 + row * 0.07)))),
        });
      }
    }
    return { table, pixels, bounds: { ...die } };
  });
  const surface = connectedTable(background, regions, width);
  const exposureSamples = surface.filter((_, i) => i % Math.max(1, Math.floor(surface.length / 256)) === 0);

  return (current: CameraFrame): boolean => {
    if (!regions.length || surface.length < 64 || current.width !== width || current.height !== height) return false;
    const colors = exposureSamples.map(({ x, y }) => colorAt(current, x, y));
    const shift = medianColor(colors.map((color, i): Color => [
      color[0] - exposureSamples[i].color[0], color[1] - exposureSamples[i].color[1], color[2] - exposureSamples[i].color[2],
    ]));
    // A covered lens or large lighting change cannot establish a clear table.
    if (shift.some((value) => Math.abs(value) > 45) || Math.max(...medianColor(colors)) < 15) return false;
    if (regions.some(({ table, pixels }) => !table || pixels.filter(({ x, y }) =>
      matches(colorAt(current, x, y), table, shift),
    ).length < pixels.length * 0.9)) return false;

    const tiles = new Map<number, { total: number; changed: number }>();
    const columns = Math.ceil(width / 16);
    for (const { x, y, color } of surface) {
      const key = Math.floor(y / 16) * columns + Math.floor(x / 16);
      const tile = tiles.get(key) ?? { total: 0, changed: 0 };
      tile.total++;
      const actual = colorAt(current, x, y);
      if (!matches(actual, color, shift)) {
        // A removed die takes its shadow with it. Accept nearby pixels only
        // when they now match the learned table, never an arbitrary new object.
        const clearedShadow = regions.some(({ table, bounds }) => table
          && x >= bounds.x - 2 * bounds.width && x <= bounds.x + 3 * bounds.width
          && y >= bounds.y - 2 * bounds.height && y <= bounds.y + 3 * bounds.height
          && matches(actual, table, shift));
        if (!clearedShadow) tile.changed++;
      }
      tiles.set(key, tile);
    }
    return ![...tiles.values()].some(({ total, changed }) => changed >= 3 && changed / total > 0.25);
  };
}

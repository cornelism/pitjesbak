import { expect, it } from "vitest";
import { detectSurface } from "./surface-mask";

it("separates similarly bright gray rails from felt, and fills dice and shadow holes", () => {
  const samples = [];
  for (let y = 2; y < 120; y += 4) {
    for (let x = 2; x < 160; x += 4) {
      const felt = x >= 20 && x < 140 && y >= 20 && y < 100;
      const hole = x >= 60 && x < 80 && y >= 40 && y < 60;
      const shadow = x >= 80 && x < 100 && y >= 50 && y < 70;
      samples.push({ x, y, color: hole ? [220, 210, 200] as const : shadow ? [24, 32, 25] as const
        : felt ? [60, 80, 62] as const : [70, 75, 80] as const });
    }
  }
  const area = detectSurface(samples, [{ table: [60, 80, 62], bounds: { x: 60, y: 40, width: 20, height: 20 } }], 160, 120);
  const contains = (x: number, y: number) => area.some((sample) => sample.x === x && sample.y === y);
  expect(contains(70, 50)).toBe(true);
  expect(contains(90, 62)).toBe(true);
  expect(contains(30, 30)).toBe(true);
  expect(contains(150, 62)).toBe(false);
  expect(contains(70, 110)).toBe(false);
});

it("rejects a disconnected area with matching color", () => {
  const samples = [];
  for (let y = 2; y < 120; y += 4) {
    for (let x = 2; x < 160; x += 4) {
      samples.push({ x, y, color: y >= 32 && y < 48 ? [0, 0, 0] as const : [60, 80, 62] as const });
    }
  }
  const area = detectSurface(samples, [{ table: [60, 80, 62], bounds: { x: 60, y: 64, width: 20, height: 20 } }], 160, 120);
  expect(area.some(({ y }) => y < 32)).toBe(false);
  expect(area.some(({ y }) => y > 64)).toBe(true);
});

it("breaks a thin bridge to a matching patch beyond the playing surface", () => {
  const samples = [];
  for (let y = 2; y < 120; y += 4) for (let x = 2; x < 180; x += 4) {
    const main = x >= 20 && x < 100 && y >= 20 && y < 100;
    const patch = x >= 132 && x < 164 && y >= 44 && y < 84;
    const bridge = x >= 100 && x < 132 && y === 62;
    samples.push({ x, y, color: main || patch || bridge ? [60, 80, 62] as const : [0, 0, 0] as const });
  }
  const area = detectSurface(samples, [{ table: [60, 80, 62], bounds: { x: 50, y: 50, width: 20, height: 20 } }], 180, 120);
  expect(area.some(({ x, y }) => x === 62 && y === 62)).toBe(true);
  expect(area.some(({ x }) => x >= 132)).toBe(false);
});

it.each([false, true])("ignores a rail-colored sample beside an edge die (reversed: %s)", (reverse) => {
  const samples = [];
  for (let y = 2; y < 120; y += 4) for (let x = 2; x < 160; x += 4) {
    const felt = x >= 20 && x < 140 && y >= 20 && y < 100;
    samples.push({ x, y, color: felt ? [60, 80, 62] as const : [70, 75, 80] as const });
  }
  const regions = [
    { table: [60, 80, 62] as const, bounds: { x: 40, y: 40, width: 20, height: 20 } },
    { table: [55, 74, 57] as const, bounds: { x: 90, y: 40, width: 20, height: 20 } },
    { table: [70, 75, 80] as const, bounds: { x: 125, y: 80, width: 20, height: 20 } },
  ];
  const area = detectSurface(samples, reverse ? regions.reverse() : regions, 160, 120);
  expect(area.some(({ x, y }) => x === 70 && y === 50)).toBe(true);
  expect(area.some(({ x, y }) => x === 130 && y === 90)).toBe(true);
  expect(area.some(({ x, y }) => x < 20 || x >= 140 || y < 20 || y >= 100)).toBe(false);
});

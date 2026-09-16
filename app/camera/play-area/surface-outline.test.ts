import { expect, it } from "vitest";
import { surfaceOutline } from "./surface-outline";

it("smooths a sampled diagonal into a closed boundary with a few corners", () => {
  const samples = [];
  for (let y = 2; y < 80; y += 4) for (let x = 2; x <= y; x += 4) samples.push({ x, y });
  const path = surfaceOutline(samples, 80, 80, 4);
  expect(path.match(/M/g)).toHaveLength(1);
  expect(path.endsWith("Z")).toBe(true);
  expect(path.match(/L/g)!.length).toBeLessThan(7);
});

it("keeps separate components separate and preserves a cell at the image edge", () => {
  expect(surfaceOutline([{ x: 2, y: 2 }, { x: 10, y: 2 }], 11, 4, 4)).toBe("M0 0L4 0L4 4L0 4ZM8 0L11 0L11 4L8 4Z");
});

it("removes sampling stairs along shallow and steep tray edges", () => {
  const samples = [];
  for (let y = 2; y < 160; y += 4) for (let x = 2; x < 160; x += 4) {
    if (x >= y / 3 && x < 160 - y / 2) samples.push({ x, y });
  }
  expect(surfaceOutline(samples, 160, 160, 4).match(/L/g)!.length).toBeLessThan(8);
});

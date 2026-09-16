import { expect, it } from "vitest";
import { createPlayArea } from "./play-area";

it("joins adjacent sampled cells without drawing their internal borders", () => {
  const samples = [{ x: 6, y: 2 }, { x: 2, y: 2 }];
  const area = createPlayArea(samples, 12, 8)!;
  expect(area.fill).toBe("M0 0H8V4H0Z");
  expect(area.outline).toBe("M0 0L8 0L8 4L0 4Z");
  expect(samples).toEqual([{ x: 6, y: 2 }, { x: 2, y: 2 }]);
});

it("leaves excluded areas unfilled instead of bridging separate parts of the surface", () => {
  const area = createPlayArea([{ x: 2, y: 2 }, { x: 10, y: 2 }], 12, 4)!;
  expect(area.fill).toBe("M0 0H4V4H0ZM8 0H12V4H8Z");
});

it("clips partial cells to the camera frame", () => {
  const area = createPlayArea([{ x: 6, y: 6 }], 7, 7)!;
  expect(area).toMatchObject({ width: 7, height: 7, fill: "M4 4H7V7H4Z" });
});

it("does not invent a play area without surface samples", () => {
  expect(createPlayArea([], 640, 360)).toBeNull();
});

import { expect, it } from "vitest";
import { cropToOverview, dieCropBounds } from "./crop-geometry";

it("maps a digitally zoomed overview into native pixels and back", () => {
  const overview = { width: 640, height: 360 }, source = { width: 1920, height: 1080 };
  const die = { x: 200, y: 100, width: 40, height: 30 };
  const crop = dieCropBounds(die, overview, source, 2);
  expect(crop).toEqual({ x: 720, y: 360, width: 180, height: 165 });
  expect(cropToOverview({ x: 60, y: 60, width: 60, height: 45 }, crop!, overview, source, 2)).toEqual(die);
});

it("clips the crop to the camera frame without shifting its coordinates", () => {
  expect(dieCropBounds({ x: 0, y: 330, width: 40, height: 30 }, { width: 640, height: 360 }, { width: 1280, height: 720 }, 1))
    .toEqual({ x: 0, y: 580, width: 160, height: 140 });
});

it.each([0, NaN, Infinity, -1])("rejects unusable zoom %s", (zoom) => {
  expect(dieCropBounds({ x: 10, y: 10, width: 20, height: 20 }, { width: 640, height: 360 }, { width: 1280, height: 720 }, zoom)).toBeNull();
});

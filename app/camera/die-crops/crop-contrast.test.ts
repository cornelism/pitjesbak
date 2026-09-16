import { expect, it } from "vitest";
import { cropContrast } from "./crop-contrast";

it("stretches local contrast without modifying the native crop saved for replay", () => {
  const data = new Uint8ClampedArray(100 * 4);
  for (let i = 0; i < 100; i++) data.set([i < 80 ? 50 : 200, i < 80 ? 50 : 200, i < 80 ? 50 : 200, 255], i * 4);
  const image: ImageData = { width: 10, height: 10, data, colorSpace: "srgb" };
  const result = cropContrast(image);
  expect(result.data[0]).toBe(0);
  expect(result.data[99 * 4]).toBe(255);
  expect(image.data[0]).toBe(50);
  expect(image.data[99 * 4]).toBe(200);
});

it("does not amplify an almost uniform patch into artificial detail", () => {
  const image: ImageData = { width: 5, height: 5, data: new Uint8ClampedArray(100).fill(100), colorSpace: "srgb" };
  expect(cropContrast(image)).toBe(image);
});

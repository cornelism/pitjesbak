// @vitest-environment node
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { expect, it } from "vitest";
import { dieCropBounds } from "./crop-geometry";

it("keeps the three real-camera example crops pixel-identical to their source regions", () => {
  const directory = new URL("../../../docs/dice-crops/examples/frame-51/", import.meta.url);
  const metadata = JSON.parse(readFileSync(new URL("capture.json", directory), "utf8")) as {
    crops: { file: string; source: { x: number; y: number; width: number; height: number }; candidate: { x: number; y: number; width: number; height: number }; expectedValue: number }[];
  };
  const original = PNG.sync.read(readFileSync(new URL("../__fixtures__/small-six-dice-3-5-6.png", import.meta.url)));
  expect(metadata.crops.map((crop) => crop.expectedValue)).toEqual([3, 5, 6]);
  for (const crop of metadata.crops) {
    const image = PNG.sync.read(readFileSync(new URL(crop.file, directory)));
    expect(crop.source).toEqual(dieCropBounds(crop.candidate, original, original, 1));
    expect([image.width, image.height]).toEqual([crop.source.width, crop.source.height]);
    for (let row = 0; row < image.height; row++) {
      const sourceStart = ((crop.source.y + row) * original.width + crop.source.x) * 4;
      expect(image.data.subarray(row * image.width * 4, (row + 1) * image.width * 4))
        .toEqual(original.data.subarray(sourceStart, sourceStart + image.width * 4));
    }
  }
});

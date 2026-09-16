// @vitest-environment node
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { expect, it } from "vitest";
import { dieCropBounds } from "./crop-geometry";
import { parseCropUpload, storeCrops } from "./store-crops";

it("saves real-camera crops pixel-identical to their source without local capture dependencies", async () => {
  const original = PNG.sync.read(await readFile(new URL("../__fixtures__/small-six-dice-3-5-6.png", import.meta.url)));
  const size = { width: original.width, height: original.height };
  const candidates = [
    { x: 56, y: 269, width: 56, height: 34, value: 3 },
    { x: 210, y: 106, width: 30, height: 17, value: 5 },
    { x: 299, y: 111, width: 29, height: 21, value: 6 },
  ];
  const crops = candidates.map(({ value, ...candidate }) => {
    const source = dieCropBounds(candidate, size, size, 1);
    if (!source) throw new Error("Expected a valid crop");
    const image = new PNG({ width: source.width, height: source.height });
    PNG.bitblt(original, image, source.x, source.y, source.width, source.height, 0, 0);
    return {
      source, candidate, overviewValue: value, cropValue: null, used: false,
      png: `data:image/png;base64,${PNG.sync.write(image).toString("base64")}`,
    };
  });
  const batch = parseCropUpload({
    capturedAt: "2026-09-16T12:00:00.000Z", sourceSize: size, overviewSize: size,
    zoom: 1, cameraTilt: 70, crops,
  });
  const root = await mkdtemp(path.join(os.tmpdir(), "real-die-crops-test-"));
  try {
    const directory = path.join(root, await storeCrops(batch, root));
    for (const crop of batch.crops) {
      const image = PNG.sync.read(await readFile(path.join(directory, crop.file)));
      expect([image.width, image.height]).toEqual([crop.source.width, crop.source.height]);
      for (let row = 0; row < image.height; row++) {
        const sourceStart = ((crop.source.y + row) * original.width + crop.source.x) * 4;
        expect(image.data.subarray(row * image.width * 4, (row + 1) * image.width * 4))
          .toEqual(original.data.subarray(sourceStart, sourceStart + image.width * 4));
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

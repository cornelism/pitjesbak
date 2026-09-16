// @vitest-environment node
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PNG } from "pngjs";
import { expect, it } from "vitest";
import { parseCropUpload, storeCrops } from "./store-crops";

export function upload() {
  const png = new PNG({ width: 4, height: 3 });
  png.data.fill(123);
  return {
    capturedAt: "2026-09-16T12:00:00.000Z", sourceSize: { width: 1920, height: 1080 },
    overviewSize: { width: 640, height: 360 }, zoom: 1, cameraTilt: 70,
    crops: [{ source: { x: 20, y: 30, width: 4, height: 3 }, candidate: { x: 10, y: 10, width: 4, height: 3 },
      overviewValue: 4, cropValue: 6, used: true, png: `data:image/png;base64,${PNG.sync.write(png).toString("base64")}` }],
  };
}

it("persists separate unchanged PNGs plus replayable metadata without overwriting captures", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "die-crops-test-"));
  try {
    const batch = parseCropUpload(upload());
    const first = await storeCrops(batch, root), second = await storeCrops(batch, root);
    expect(first).not.toBe(second);
    expect(await readdir(path.join(root, first))).toEqual(["capture.json", "die-01.png"]);
    expect(await readFile(path.join(root, first, "die-01.png"))).toEqual(batch.crops[0].buffer);
    const metadata = JSON.parse(await readFile(path.join(root, first, "capture.json"), "utf8"));
    expect(metadata.crops[0]).toMatchObject({ file: "die-01.png", overviewValue: 4, cropValue: 6, used: true });
    expect(metadata.crops[0]).not.toHaveProperty("buffer");
  } finally { await rm(root, { recursive: true, force: true }); }
});

it("rejects non-PNG data, mismatched dimensions, and out-of-frame crops", () => {
  const batch = upload();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], png: "../../anything" }] })).toThrow();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], source: { ...batch.crops[0].source, width: 5 } }] })).toThrow();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], source: { ...batch.crops[0].source, x: 1920 } }] })).toThrow();
});

it("rejects too many crops and invalid readings", () => {
  const batch = upload();
  expect(() => parseCropUpload({ ...batch, crops: Array(7).fill(batch.crops[0]) })).toThrow();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], cropValue: 8 }] })).toThrow();
});

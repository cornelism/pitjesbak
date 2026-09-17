// @vitest-environment node
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { storeCrops } from "./store-crops";
import { parseCropUpload } from "./parse-crop-upload";
import { upload } from "./__test-helpers__/crop-upload";

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

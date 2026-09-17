import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParsedCropUpload } from "./parse-crop-upload";

export async function storeCrops(batch: ParsedCropUpload, root = path.join(process.cwd(), "docs/dice-crops/captures")) {
  await mkdir(root, { recursive: true });
  const directory = await mkdtemp(path.join(root, "capture-"));
  try {
    for (const crop of batch.crops) await writeFile(path.join(directory, crop.file), crop.buffer);
    const metadata = { ...batch, crops: batch.crops.map(({ file, source, candidate, overviewValue, cropValue, used, preprocessing }) =>
      ({ file, source, candidate, overviewValue, cropValue, used, preprocessing })) };
    await writeFile(path.join(directory, "capture.json"), JSON.stringify(metadata, null, 2) + "\n");
    return path.basename(directory);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";
import type { CropBounds } from "./types";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object");
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Invalid number");
  return value;
}
function size(value: unknown) {
  const object = record(value);
  return { width: number(object.width, 1, 8192), height: number(object.height, 1, 8192) };
}
function bounds(value: unknown, frame: { width: number; height: number }): CropBounds {
  const object = record(value);
  const box = { x: number(object.x, 0, frame.width), y: number(object.y, 0, frame.height),
    width: number(object.width, 1, frame.width), height: number(object.height, 1, frame.height) };
  if (box.x + box.width > frame.width || box.y + box.height > frame.height) throw new Error("Crop outside frame");
  return box;
}
function reading(value: unknown) {
  if (value === null) return null;
  const result = number(value, 1, 6);
  if (!Number.isInteger(result)) throw new Error("Invalid die value");
  return result;
}

/** Validate before touching disk. Filenames and directories are server-owned. */
export function parseCropUpload(value: unknown) {
  const batch = record(value);
  const sourceSize = size(batch.sourceSize), overviewSize = size(batch.overviewSize);
  if (typeof batch.capturedAt !== "string" || !Number.isFinite(Date.parse(batch.capturedAt))) throw new Error("Invalid capture time");
  if (!Array.isArray(batch.crops) || batch.crops.length < 1 || batch.crops.length > 6) throw new Error("Invalid crop count");
  return {
    capturedAt: batch.capturedAt, sourceSize, overviewSize,
    zoom: number(batch.zoom, 1, 20), cameraTilt: number(batch.cameraTilt, 0, 70),
    crops: batch.crops.map((value, index) => {
      const crop = record(value);
      const source = bounds(crop.source, sourceSize), candidate = bounds(crop.candidate, overviewSize);
      if (source.width > 768 || source.height > 768 || !Object.values(source).every(Number.isInteger)) throw new Error("Invalid crop dimensions");
      if (typeof crop.png !== "string" || crop.png.length > 4_000_000) throw new Error("Invalid PNG");
      const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(crop.png);
      if (!match) throw new Error("Invalid PNG encoding");
      const buffer = Buffer.from(match[1], "base64");
      // Inspect dimensions before decoding so a tiny payload cannot request a huge image.
      if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
        || buffer.readUInt32BE(16) !== source.width || buffer.readUInt32BE(20) !== source.height) throw new Error("PNG dimensions do not match the crop");
      PNG.sync.read(buffer, { checkCRC: true });
      const overviewValue = reading(crop.overviewValue), cropValue = reading(crop.cropValue);
      const preprocessing = crop.preprocessing ?? "raw";
      if (preprocessing !== "raw" && preprocessing !== "contrast") throw new Error("Invalid preprocessing");
      if (typeof crop.used !== "boolean" || (crop.used && cropValue === null)) throw new Error("Invalid reading result");
      return { file: `die-${String(index + 1).padStart(2, "0")}.png`, buffer, source, candidate, overviewValue, cropValue, used: crop.used, preprocessing };
    }),
  };
}

export async function storeCrops(batch: ReturnType<typeof parseCropUpload>, root = path.join(process.cwd(), "docs/dice-crops/captures")) {
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

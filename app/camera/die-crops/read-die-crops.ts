import type * as OpenCv from "@techstark/opencv-js";
import type { DiceCandidate } from "../detection/opencv-dice";
import { overlapsDie } from "../detection/face-overlap";
import type { DetectedDie } from "../dice-types";
import { cropTransform, dieCropBounds } from "./crop-geometry";
import { readNativeCrop } from "./read-native-crop";
import { MAX_CROP_DIMENSION, MAX_DICE_PER_CAPTURE, MIN_NATIVE_SCALE } from "./limits";
import type { CropBounds, DieCrop, DieCropBatch, ImageSize } from "./types";

interface CropReading {
  capturedAt?: string;
  sourceSize: ImageSize;
  overviewSize: ImageSize;
  zoom: number;
  cameraTilt: number;
  expectedCount: number;
  dice: readonly DetectedDie[];
  candidates: readonly DiceCandidate[];
  readCrop: (bounds: CropBounds) => ImageData;
}

/** Read native pixels for located faces, with at most one crop per expected die. */
export function readDieCrops(cv: typeof OpenCv, options: CropReading): { dice: DetectedDie[]; batch: DieCropBatch } {
  const { sourceSize, overviewSize, zoom, cameraTilt, dice, candidates, readCrop } = options;
  const boxes: CropBounds[] = [...dice];
  const limit = Math.max(1, Math.min(MAX_DICE_PER_CAPTURE, options.expectedCount));
  for (const candidate of [...candidates].sort((a, b) => b.pipCount - a.pipCount || b.width * b.height - a.width * a.height)) {
    if (boxes.length >= limit) break;
    if (!boxes.some((box) => overlapsDie(box, candidate))) boxes.push(candidate);
  }
  const batch: DieCropBatch = { capturedAt: options.capturedAt ?? new Date().toISOString(), sourceSize, overviewSize, zoom, cameraTilt, crops: [] };
  const refined = [...dice];
  const transform = cropTransform(overviewSize, sourceSize, zoom);
  for (const candidate of boxes.slice(0, limit)) {
    const source = dieCropBounds(candidate, overviewSize, sourceSize, zoom);
    // Bound per-frame readback and detection work even with a 4K camera.
    if (!source || source.width > MAX_CROP_DIMENSION || source.height > MAX_CROP_DIMENSION) continue;
    const image = readCrop(source);
    const existing = dice.find((die) => overlapsDie(die, candidate));
    const crop: DieCrop = { candidate, source, image, overviewValue: existing?.value ?? null, cropValue: null, used: false, preprocessing: "raw" };
    batch.crops.push(crop);
    // No additional detail exists when digital zoom has used up native pixels.
    if (Math.min(transform.scaleX, transform.scaleY) < MIN_NATIVE_SCALE) continue;
    const { match, preprocessing } = readNativeCrop(cv, {
      image, candidate, source, sourceSize, overviewSize, zoom, cameraTilt,
    });
    crop.preprocessing = preprocessing;
    if (!match) continue;
    if (refined.some((die) => die !== existing && overlapsDie(die, match))) continue;
    // Crop thresholding can open rim pips onto the background and leave a
    // plausible subset (one row of a six looks like three). Fewer enclosed
    // pips do not invalidate an already validated overview pattern. Retain
    // the conflicting count for diagnostics without applying it to the roll.
    crop.cropValue = match.value;
    crop.used = !existing || match.value >= existing.value;
    if (!crop.used) continue;
    if (existing) refined[refined.indexOf(existing)] = { ...existing, value: match.value };
    else refined.push(match);
  }
  return { dice: refined.sort((a, b) => a.x - b.x || a.y - b.y), batch };
}

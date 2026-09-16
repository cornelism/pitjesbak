import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv, type DiceCandidate } from "../detection/opencv-dice";
import { overlapsDie } from "../detection/face-overlap";
import type { DetectedDie } from "../dice-types";
import { cropToOverview, cropTransform, dieCropBounds } from "./crop-geometry";
import { cropContrast } from "./crop-contrast";
import type { CropBounds, DieCropBatch, ImageSize } from "./types";

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
  const limit = Math.max(1, Math.min(6, options.expectedCount));
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
    if (!source || source.width > 768 || source.height > 768) continue;
    const image = readCrop(source);
    const existing = dice.find((die) => overlapsDie(die, candidate));
    const crop = { candidate, source, image, overviewValue: existing?.value ?? null, cropValue: null, used: false, preprocessing: "raw" } satisfies DieCropBatch["crops"][number];
    batch.crops.push(crop);
    // No additional detail exists when digital zoom has used up native pixels.
    if (Math.min(transform.scaleX, transform.scaleY) < 1.25) continue;
    const locate = (pixels: ImageData) => detectDiceOpenCv(cv, pixels, cameraTilt).map((die) => ({
      ...die, ...cropToOverview(die, source, overviewSize, sourceSize, zoom),
    })).filter((die) => overlapsDie(die, candidate)
      && die.width >= candidate.width * 0.5 && die.width <= candidate.width * 1.8);
    let matches = locate(image);
    // An empty reading may benefit from local contrast. Never resolve two
    // competing faces by changing thresholds until only a preferred one wins.
    if (!matches.length) {
      const contrast = cropContrast(image);
      if (contrast !== image) {
        matches = locate(contrast);
        batch.crops[batch.crops.length - 1] = { ...crop, preprocessing: "contrast" };
      }
    }
    if (matches.length !== 1) continue;
    const match = matches[0];
    if (refined.some((die) => die !== existing && overlapsDie(die, match))) continue;
    batch.crops[batch.crops.length - 1] = { ...batch.crops[batch.crops.length - 1], cropValue: match.value, used: true };
    if (existing) refined[refined.indexOf(existing)] = { ...existing, value: match.value };
    else refined.push(match);
  }
  return { dice: refined.sort((a, b) => a.x - b.x || a.y - b.y), batch };
}

import type * as OpenCv from "@techstark/opencv-js";
import { detectDiceOpenCv } from "../detection/opencv-dice";
import { overlapsDie } from "../detection/face-overlap";
import type { DetectedDie } from "../dice-types";
import { cropToOverview } from "./crop-geometry";
import { cropContrast } from "./crop-contrast";
import type { CropBounds, DieCrop, DieCropBatch } from "./types";

interface NativeCropOptions extends Pick<DieCropBatch, "sourceSize" | "overviewSize" | "zoom" | "cameraTilt"> {
  image: ImageData;
  candidate: CropBounds;
  source: CropBounds;
}

interface NativeCropReading {
  match: DetectedDie | null;
  preprocessing: DieCrop["preprocessing"];
}

/** Accept one matching face; retry local contrast only when no face was read. */
export function readNativeCrop(cv: typeof OpenCv, options: NativeCropOptions): NativeCropReading {
  const { image, candidate, source, sourceSize, overviewSize, zoom, cameraTilt } = options;
  function locate(pixels: ImageData) {
    return detectDiceOpenCv(cv, pixels, cameraTilt)
      .map((die) => ({ ...die, ...cropToOverview(die, source, overviewSize, sourceSize, zoom) }))
      .filter((die) => overlapsDie(die, candidate)
        && die.width >= candidate.width * 0.5 && die.width <= candidate.width * 1.8);
  }

  let matches = locate(image);
  let preprocessing: DieCrop["preprocessing"] = "raw";
  // Never change thresholds to resolve two competing faces in favor of one.
  if (!matches.length) {
    const contrast = cropContrast(image);
    if (contrast !== image) {
      matches = locate(contrast);
      preprocessing = "contrast";
    }
  }
  return { match: matches.length === 1 ? matches[0] : null, preprocessing };
}

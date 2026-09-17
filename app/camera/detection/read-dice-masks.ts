import type * as OpenCv from "@techstark/opencv-js";
import type { DiceMasks } from "./dice-masks";
import { readDiceMask, type DiceMaskOptions } from "./read-dice-mask";

/** Read one mask at a time so the caller can accept its results before the next pass. */
export function* readDiceMasks(cv: typeof OpenCv, masks: DiceMasks, options: DiceMaskOptions) {
  yield readDiceMask(cv, masks.binary, options);
  if (masks.local) yield readDiceMask(cv, masks.local, options);
}

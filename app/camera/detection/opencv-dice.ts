import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "../dice-types";
import { withCvResources } from "./cv-resources";
import { createDiceMasks } from "./dice-masks";
import { readDiceMask } from "./read-dice-mask";

/** OpenCV locates bright dice, isolates their top faces, and counts enclosed pips.
 * Pattern validation checks that count after the face has been selected.
 * cameraTilt is degrees away from overhead; zero preserves the entire face.
 */
export function detectDiceOpenCv(
  cv: typeof OpenCv,
  frame: Pick<ImageData, "data" | "width" | "height">,
  cameraTilt: number,
): DetectedDie[] {
  const { width, height, data } = frame;
  if (!width || !height || data.length !== width * height * 4 || !Number.isFinite(cameraTilt)) return [];
  return withCvResources((own) => {
    const { binary, local } = createDiceMasks(cv, frame, cameraTilt, own);
    const detected = readDiceMask(cv, binary, cameraTilt);
    if (local) {
      // Keep established readings and add only independently validated dice in
      // previously unread regions. A second mask must not duplicate a die.
      for (const die of readDiceMask(cv, local, cameraTilt)) {
        if (!detected.some((other) => die.x < other.x + other.width
          && die.x + die.width > other.x && die.y < other.y + other.height
          && die.y + die.height > other.y)) detected.push(die);
      }
    }
    return detected.sort((a, b) => a.x - b.x || a.y - b.y);
  });
}

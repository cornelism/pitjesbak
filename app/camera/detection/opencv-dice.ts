import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "../dice-types";
import { withCvResources } from "./cv-resources";
import { createDiceMasks } from "./dice-masks";
import { readDiceMask } from "./read-dice-mask";
import type { FaceBounds } from "./top-face";

function overlaps(a: FaceBounds, b: FaceBounds): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x
    && a.y < b.y + b.height && a.y + a.height > b.y;
}

function sameFace(a: FaceBounds, b: FaceBounds): boolean {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height >= Math.max(a.width * a.height, b.width * b.height) * 0.7;
}

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
    const unread: (FaceBounds & { pipCount: number })[] = [];
    const recordUnread = (bounds: FaceBounds, pipCount: number) => {
      unread.push({ ...bounds, pipCount });
    };
    const detected = readDiceMask(cv, binary, cameraTilt, recordUnread);
    function addReadings(readings: DetectedDie[]) {
      for (const die of readings) {
        if (!detected.some((other) => overlaps(die, other))) detected.push(die);
      }
    }
    // A second mask fills unread regions without replacing established values.
    if (local) addReadings(readDiceMask(cv, local, cameraTilt, recordUnread));

    const unresolved = unread.filter((bounds) => !detected.some((die) => overlaps(bounds, die)));
    if (unresolved.length) {
      const detail = createDiceMasks(cv, frame, cameraTilt, own, "gentle");
      for (const mask of [detail.binary, detail.local]) {
        if (!mask) continue;
        const readings = readDiceMask(cv, mask, cameraTilt);
        // Require the same previously located face and a valid full pip pattern.
        // The retry must separate additional pips, not merely relabel a mark.
        addReadings(readings.filter((die) => unresolved.some((bounds) =>
          die.value > bounds.pipCount && sameFace(bounds, die),
        )));
      }
    }
    return detected.sort((a, b) => a.x - b.x || a.y - b.y);
  });
}

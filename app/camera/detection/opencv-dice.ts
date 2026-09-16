import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "../dice-types";
import { withCvResources } from "./cv-resources";
import { createDiceMasks } from "./dice-masks";
import { readDiceMask } from "./read-dice-mask";
import type { FaceBounds } from "./top-face";
import { sameRimTop } from "./rim-pips";
import { overlapsDie, sameFace } from "./face-overlap";

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
    const candidates: (FaceBounds & { pipCount: number; small: boolean })[] = [];
    const recordCandidate = (bounds: FaceBounds, pipCount: number, small = false) => {
      candidates.push({ ...bounds, pipCount, small });
    };
    const detected = readDiceMask(cv, binary, cameraTilt, recordCandidate);
    function addReadings(readings: DetectedDie[]) {
      for (const die of readings) {
        if (!detected.some((other) => overlapsDie(die, other))) detected.push(die);
      }
    }
    // A second mask fills unread regions without replacing established values.
    if (local) addReadings(readDiceMask(cv, local, cameraTilt, recordCandidate));

    const unresolved = candidates.filter((bounds) => !detected.some((die) => overlapsDie(bounds, die)));
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
    // Small contours can yield a plausible partial count even when the first
    // pass succeeds. Only a validated top with additional measured pips may
    // replace that count; never add a new region or choose a smaller subset.
    const smallCandidates = candidates.filter((candidate) => candidate.small);
    if (smallCandidates.length) {
      const detail = createDiceMasks(cv, frame, cameraTilt, own, "small");
      for (const mask of [detail.binary, detail.local]) {
        if (!mask) continue;
        const readings = readDiceMask(cv, mask, cameraTilt, undefined, "small");
        for (const die of readings) {
          if (die.value < 2 || !smallCandidates.some((bounds) => die.value >= bounds.pipCount && sameFace(bounds, die))) continue;
          const existing = detected.findIndex((other) => overlapsDie(die, other));
          if (existing === -1) detected.push(die);
          else if (sameFace(detected[existing], die) && die.value > detected[existing].value) detected[existing] = die;
        }
      }
    }
    // Only unread slanted faces can use the rim retry; accepted values remain
    // authoritative. Its extra marks must form a separated top-face pattern.
    const rimCandidates = cameraTilt > 0
      ? smallCandidates.filter((bounds) => !detected.some((die) => overlapsDie(bounds, die))) : [];
    if (rimCandidates.length) {
      const detail = createDiceMasks(cv, frame, cameraTilt, own, "rim");
      for (const mask of [detail.binary, detail.local]) {
        if (!mask) continue;
        addReadings(readDiceMask(cv, mask, cameraTilt, undefined, "rim").filter((die) =>
          rimCandidates.some((bounds) => die.value > bounds.pipCount && sameRimTop(bounds, die)),
        ));
      }
    }
    return detected.sort((a, b) => a.x - b.x || a.y - b.y);
  });
}

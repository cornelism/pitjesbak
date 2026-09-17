import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "../dice-types";
import { withCvResources } from "./cv-resources";
import { createDiceMasks } from "./dice-masks";
import { readDiceMask } from "./read-dice-mask";
import { readDiceMasks } from "./read-dice-masks";
import type { FaceBounds } from "./top-face";
import { sameRimTop } from "./rim-pips";
import { overlapsDie, sameFace } from "./face-overlap";

export interface DiceCandidate extends FaceBounds { pipCount: number }

/** OpenCV locates bright dice, isolates their top faces, and counts enclosed pips.
 * Pattern validation checks that count after the face has been selected.
 * cameraTilt is degrees away from overhead; zero preserves the entire face.
 */
export function detectDiceOpenCv(
  cv: typeof OpenCv,
  frame: Pick<ImageData, "data" | "width" | "height">,
  cameraTilt: number,
  onCandidates?: (candidates: readonly DiceCandidate[]) => void,
): DetectedDie[] {
  const { width, height, data } = frame;
  if (!width || !height || data.length !== width * height * 4 || !Number.isFinite(cameraTilt)) return [];
  return withCvResources((own) => {
    const { binary, local } = createDiceMasks(cv, frame, cameraTilt, own);
    const candidates: (FaceBounds & { pipCount: number; small: boolean })[] = [];
    const recordCandidate = (bounds: FaceBounds, pipCount: number, small = false) => {
      candidates.push({ ...bounds, pipCount, small });
    };
    const standard = { cameraTilt, onCandidate: recordCandidate };
    const detected = readDiceMask(cv, binary, standard);
    function addReadings(readings: DetectedDie[]) {
      for (const die of readings) {
        if (!detected.some((other) => overlapsDie(die, other))) detected.push(die);
      }
    }
    // A second mask fills unread regions without replacing established values.
    if (local) addReadings(readDiceMask(cv, local, standard));

    const unresolved = candidates.filter((bounds) => !detected.some((die) => overlapsDie(bounds, die)));
    if (unresolved.length) {
      const detail = createDiceMasks(cv, frame, cameraTilt, own, "gentle");
      for (const readings of readDiceMasks(cv, detail, { cameraTilt })) {
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
      for (const readings of readDiceMasks(cv, detail, { cameraTilt, detail: "small" })) {
        for (const die of readings) {
          if (die.value < 2 || !smallCandidates.some((bounds) => die.value >= bounds.pipCount && sameFace(bounds, die))) continue;
          const existing = detected.findIndex((other) => overlapsDie(die, other));
          if (existing === -1) detected.push(die);
          else if (sameFace(detected[existing], die) && die.value > detected[existing].value) detected[existing] = die;
        }
      }
    }
    // A small accepted pair can still be a three with an open rim pip. Retry
    // unread faces and pairs; changing a pair requires a measured third pip
    // and the calibrated three-pip pattern, not merely a higher count.
    const rimCandidates = cameraTilt > 0
      ? smallCandidates.filter((bounds) => {
        const existing = detected.find((die) => overlapsDie(bounds, die));
        return !existing || (existing.value === 2 && bounds.pipCount === 2);
      }) : [];
    if (rimCandidates.length) {
      const detail = createDiceMasks(cv, frame, cameraTilt, own, "rim");
      for (const readings of readDiceMasks(cv, detail, { cameraTilt, detail: "rim" })) {
        for (const die of readings) {
          if (!rimCandidates.some((bounds) => die.value >= bounds.pipCount && sameRimTop(bounds, die))) continue;
          const existing = detected.findIndex((other) => overlapsDie(die, other));
          if (existing === -1) detected.push(die);
          else if (detected[existing].value === 2 && die.value === 3 && sameRimTop(detected[existing], die)) {
            detected[existing] = die;
          }
        }
      }
      const unread = rimCandidates.filter((bounds) => !detected.some((die) => overlapsDie(bounds, die)));
      if (unread.length) {
        // Split weak bridges between dark pip centers inside an existing
        // face. This retry only fills unread regions; it cannot relabel a die.
        const source = own(cv.matFromArray(height, width, cv.CV_8UC4, data));
        const gray = own(new cv.Mat());
        cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
        for (const readings of readDiceMasks(cv, detail, { cameraTilt, detail: "rim", pipIntensities: gray })) {
          addReadings(readings.filter((die) =>
            unread.some((bounds) => die.value >= bounds.pipCount && sameRimTop(bounds, die)),
          ));
        }
      }
    }
    // Keep ellipse-based depth estimation last: an early plausible pair must
    // not prevent a detail/rim pass from recovering the other pips of a four.
    const remaining = candidates.filter((bounds) => !detected.some((die) => overlapsDie(bounds, die)));
    if (cameraTilt > 0 && remaining.length) {
      for (const readings of readDiceMasks(cv, { binary, local }, { cameraTilt, detail: "ellipse" })) {
        addReadings(readings.filter((die) =>
          remaining.some((bounds) => die.value >= bounds.pipCount && sameFace(bounds, die)),
        ));
      }
    }
    onCandidates?.(candidates);
    return detected.sort((a, b) => a.x - b.x || a.y - b.y);
  });
}

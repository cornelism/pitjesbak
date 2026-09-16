import type * as OpenCv from "@techstark/opencv-js";
import type { DetectedDie } from "./dice-types";
import { faceRectifier, type Point } from "./face-perspective";
import { hasConsistentPipSizes, readPipPattern, readSeparatedTop, readWholeFacePattern, type Pip } from "./pip-pattern";
import { separateDice } from "./separate-dice";
import { readIsolatedTopOne, type EllipticalPip } from "./isolated-top-pip";

const MAX_SINGLE_PIP_RATIO = 0.2;

const CONTRAST_CURVE = Uint8Array.from({ length: 256 }, (_, value) =>
  Math.round(255 * (value / 255) ** 1.5),
);

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
  const owned: { delete(): void }[] = [];
  function own<T extends { delete(): void }>(object: T): T {
    owned.push(object);
    return object;
  }

  try {
    const source = own(cv.matFromArray(height, width, cv.CV_8UC4, data));
    const gray = own(new cv.Mat());
    const binary = own(new cv.Mat());
    let local: OpenCv.Mat | null = null;
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(3, 3), 0);
    const threshold = cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    // Preserve narrow light rims around small, foreshortened pips. At the
    // unadjusted Otsu threshold those holes can merge with the background.
    if (cameraTilt > 0) cv.threshold(gray, binary, threshold * 0.75, 255, cv.THRESH_BINARY);
    if (cameraTilt > 0 && cv.countNonZero(binary) > width * height * 0.3) {
      // A bright table can dominate Otsu's foreground class. Suppress midtones
      // before recomputing the split, leaving already-separated dice untouched.
      const curve = own(cv.matFromArray(1, 256, cv.CV_8UC1, CONTRAST_CURVE));
      cv.LUT(gray, curve, gray);
      const adjusted = cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
      cv.threshold(gray, binary, adjusted * 0.75, 255, cv.THRESH_BINARY);
      if (cv.countNonZero(binary) > width * height * 0.3) {
        // If the table still dominates, split the brighter population again.
        // Keep the correction small: preserve thin rims around edge pips
        // without bringing the midtone table back into the foreground.
        const values = gray.data.filter((value) => value > adjusted);
        const foreground = own(cv.matFromArray(1, values.length, cv.CV_8UC1, values));
        const foregroundMask = own(new cv.Mat());
        let bright = cv.threshold(foreground, foregroundMask, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        cv.threshold(gray, binary, bright * 0.95, 255, cv.THRESH_BINARY);
        // Several lit table regions can occupy successive brightness bands.
        // Continue splitting while the foreground is still table-sized.
        for (let pass = 0; pass < 3 && cv.countNonZero(binary) > width * height * 0.3; pass++) {
          const brighterValues = gray.data.filter((value) => value > bright);
          if (!brighterValues.length) break;
          const brighter = own(cv.matFromArray(1, brighterValues.length, cv.CV_8UC1, brighterValues));
          const next = cv.threshold(brighter, foregroundMask, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
          if (next <= bright) break;
          bright = next;
          cv.threshold(gray, binary, bright * 0.95, 255, cv.THRESH_BINARY);
        }
        // Recover dim dice against their local surroundings. Scale the offset
        // with scene brightness so exposure changes do not erase small rims.
        local = own(new cv.Mat());
        cv.adaptiveThreshold(gray, local, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
          cv.THRESH_BINARY, 81, -bright * 0.05);
      }
    }
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
  } finally {
    // OpenCV allocates WASM memory outside the JS garbage collector.
    for (const object of owned.reverse()) object.delete();
  }
}

function readDiceMask(cv: typeof OpenCv, binary: OpenCv.Mat, cameraTilt: number): DetectedDie[] {
  const width = binary.cols, height = binary.rows;
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  try {
    separateDice(cv, binary);
    cv.findContours(binary, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_NONE);
    const detected: DetectedDie[] = [];
    const tilt = Math.max(0, Math.min(60, cameraTilt)) * Math.PI / 180;

    for (let i = 0; i < contours.size(); i++) {
      if (hierarchy.data32S[i * 4 + 3] !== -1) continue;
      const contour = contours.get(i);
      try {
        const bounds = cv.boundingRect(contour);
        const area = cv.contourArea(contour);
        const { x, y, width: w, height: h } = bounds;
        if (area < 225 || area > width * height * 0.3 || w / h < 0.45 || w / h > 1.8 || area / (w * h) < 0.38) continue;
        if (x === 0 || y === 0 || x + w >= width || y + h >= height) continue;

        const silhouette = cv.Mat.zeros(height, width, cv.CV_8UC1);
        try {
          cv.drawContours(silhouette, contours, i, new cv.Scalar(255), cv.FILLED);
          // A projected square top is no taller than it is wide for an upright
          // camera. A full cube in our 0–60° range has additional vertical sides.
          // If thresholding already removed those sides, keep the complete face
          // instead of cutting another strip off its bottom (six would become four).
          const completeFace = tilt === 0 || h <= w;
          // A square rotated on the table has equal X/Y extents. Its projected
          // top depth is width*cos(tilt); the remaining height is the side face.
          // Subtract that vertical extrusion from EACH column's lower boundary.
          const sideHeight = completeFace ? 0 : Math.max(0, h - w * Math.cos(tilt));
          const top = new Uint32Array(w * h);
          let left = w;
          let right = 0;
          let bottom = 0;
          let firstY = h;
          for (let xx = 0; xx < w; xx++) {
            let lower = y + h - 1;
            while (lower >= y && !silhouette.data[lower * width + x + xx]) lower--;
            const boundary = lower - sideHeight;
            for (let yy = 0; yy < h; yy++) {
              if (y + yy > boundary || !silhouette.data[(y + yy) * width + x + xx]) continue;
              top[yy * w + xx] = 1;
              left = Math.min(left, xx);
              right = Math.max(right, xx);
              firstY = Math.min(firstY, yy);
              bottom = Math.max(bottom, yy);
            }
          }
          // For a whole cube, use the calibrated table projection. Its rounded
          // silhouette is not a planar quadrilateral suitable for a homography.
          const rectify = tilt > 0
            ? ([px, py]: Point): Point => [px / (w - 1), py / ((w - 1) * Math.cos(tilt))]
            : faceRectifier(top, w, { id: 1, x: left, y: firstY, right, bottom });
          if (!rectify) continue;
          const facePips: Pip[] = [];
          const allPips: EllipticalPip[] = [];
          for (let child = hierarchy.data32S[i * 4 + 2]; child !== -1; child = hierarchy.data32S[child * 4]) {
            const pip = contours.get(child);
            try {
              const pipArea = cv.contourArea(pip);
              if (pipArea < 4 || pipArea / area < 0.003 || pipArea / area > MAX_SINGLE_PIP_RATIO || pip.rows < 5) continue;
              const ellipse = cv.fitEllipse(pip);
              const axes = [ellipse.size.width, ellipse.size.height];
              if (Math.min(...axes) / Math.max(...axes) < 0.35) continue;
              const m = cv.moments(pip);
              const px = m.m10 / m.m00 - x;
              const py = m.m01 / m.m00 - y;
              allPips.push({ point: [px, py], area: pipArea,
                axisRatio: Math.min(...axes) / Math.max(...axes), angle: ellipse.angle });
              if (!top[Math.round(py) * w + Math.round(px)]) continue;
              facePips.push({ point: [px, py], area: pipArea });
            } finally {
              pip.delete();
            }
          }
          // A large central dot can fill up to 20% of a thresholded face,
          // especially when bright-light segmentation tightens the outline.
          // Other faces keep the stricter limit; all readings need a valid layout.
          const count = facePips.length;
          const maxPipRatio = count === 1 ? MAX_SINGLE_PIP_RATIO : 0.085;
          const consistentPips = hasConsistentPipSizes(facePips)
            && facePips.every((pip) => pip.area / area <= maxPipRatio);
          const validatedCount = consistentPips
            ? readPipPattern(facePips.map((pip) => rectify(pip.point)))
              ?? (tilt > 0 && completeFace ? readWholeFacePattern(facePips, w, h) : null)
            : null;
          // For cubes, a separated upper cluster can refine the estimated mask.
          // The one-pip fallback additionally requires ellipse evidence that
          // the lower marks belong to different planes, not one complete face.
          const value = validatedCount
            ?? (tilt > 0 && !completeFace
              ? readSeparatedTop(allPips.filter((pip) => pip.area / area <= 0.085), w, h) : null)
            ?? (tilt > 0 ? readIsolatedTopOne(allPips, w, h) : null);
          if (value) detected.push({ value, x, y, width: w, height: h });
        } finally {
          silhouette.delete();
        }
      } finally {
        contour.delete();
      }
    }
    return detected;
  } finally {
    hierarchy.delete();
    contours.delete();
  }
}

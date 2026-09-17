import type * as OpenCv from "@techstark/opencv-js";
import type { OwnCvResource } from "./cv-resources";

export interface DiceMasks {
  binary: OpenCv.Mat;
  local: OpenCv.Mat | null;
}

const CONTRAST_CURVE = Uint8Array.from({ length: 256 }, (_, value) =>
  Math.round(255 * (value / 255) ** 1.5),
);

/** Segment bright dice globally, with a local mask for uneven lighting.
 * The caller owns every returned matrix for the duration of detection.
 */
export function createDiceMasks(
  cv: typeof OpenCv,
  frame: Pick<ImageData, "data" | "width" | "height">,
  cameraTilt: number,
  own: OwnCvResource,
  profile: "standard" | "gentle" | "small" | "rim" = "standard",
): DiceMasks {
  const { width, height, data } = frame;
  const source = own(cv.matFromArray(height, width, cv.CV_8UC4, data));
  const gray = own(new cv.Mat());
  const binary = own(new cv.Mat());
  let local: OpenCv.Mat | null = null;
  cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
  // Gentle smoothing preserves thin light gaps between distant pips when a
  // candidate could not be read with the standard noise suppression.
  // The last rim retry preserves raw one-pixel marks and narrow notches.
  if (profile !== "rim") cv.GaussianBlur(gray, gray, new cv.Size(3, 3), profile === "standard" ? 0 : 0.5);
  // Small faces need a wider light rim as well as gentler smoothing. These
  // masks are only consulted for previously located, low-resolution faces.
  const rimRatio = profile === "rim" ? 0.5 : profile === "small" ? 0.6 : 0.75;
  const brightRimRatio = profile === "rim" ? 0.5 : profile === "small" ? 0.6 : 0.95;
  const threshold = cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
  // Preserve narrow light rims around small, foreshortened pips. At the
  // unadjusted Otsu threshold those holes can merge with the background.
  if (cameraTilt > 0) cv.threshold(gray, binary, threshold * rimRatio, 255, cv.THRESH_BINARY);
  if (cameraTilt > 0 && cv.countNonZero(binary) > width * height * 0.3) {
    // A bright table can dominate Otsu's foreground class. Suppress midtones
    // before recomputing the split, leaving already-separated dice untouched.
    const curve = own(cv.matFromArray(1, 256, cv.CV_8UC1, CONTRAST_CURVE));
    cv.LUT(gray, curve, gray);
    const adjusted = cv.threshold(gray, binary, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
    cv.threshold(gray, binary, adjusted * rimRatio, 255, cv.THRESH_BINARY);
    if (cv.countNonZero(binary) > width * height * 0.3) {
      // If the table still dominates, split the brighter population again.
      // Keep the correction small: preserve thin rims around edge pips
      // without bringing the midtone table back into the foreground.
      const values = gray.data.filter((value) => value > adjusted);
      const foreground = own(cv.matFromArray(1, values.length, cv.CV_8UC1, values));
      const foregroundMask = own(new cv.Mat());
      let bright = cv.threshold(foreground, foregroundMask, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
      cv.threshold(gray, binary, bright * brightRimRatio, 255, cv.THRESH_BINARY);
      // Several lit table regions can occupy successive brightness bands.
      // Continue splitting while the foreground is still table-sized.
      for (let pass = 0; pass < 3 && cv.countNonZero(binary) > width * height * 0.3; pass++) {
        const brighterValues = gray.data.filter((value) => value > bright);
        if (!brighterValues.length) break;
        const brighter = own(cv.matFromArray(1, brighterValues.length, cv.CV_8UC1, brighterValues));
        const next = cv.threshold(brighter, foregroundMask, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);
        if (next <= bright) break;
        bright = next;
        cv.threshold(gray, binary, bright * brightRimRatio, 255, cv.THRESH_BINARY);
      }
      // Recover dim dice against their local surroundings. Scale the offset
      // with scene brightness so exposure changes do not erase small rims.
      local = own(new cv.Mat());
      cv.adaptiveThreshold(gray, local, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY, 81, -bright * 0.05);
    }
  }
  return { binary, local };
}

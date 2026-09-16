import { createRequire } from "node:module";
import type * as OpenCv from "@techstark/opencv-js";

export async function loadTestOpenCv(): Promise<{ cv: typeof OpenCv }> {
  const cv: typeof OpenCv & { onRuntimeInitialized: () => void } = createRequire(import.meta.url)("@techstark/opencv-js");
  // OpenCV 4.12 is a self-resolving thenable. Await a wrapper, never the runtime.
  if (!cv.Mat) await new Promise<void>((resolve) => { cv.onRuntimeInitialized = resolve; });
  return { cv };
}

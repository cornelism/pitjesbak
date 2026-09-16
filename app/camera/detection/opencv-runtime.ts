import type * as OpenCv from "@techstark/opencv-js";

type Runtime = typeof OpenCv & { onRuntimeInitialized?: () => void };
declare global {
  interface Window { cv?: Runtime }
}

let loading: Promise<{ cv: typeof OpenCv }> | null = null;

/** Load the locally served WASM runtime only when camera recognition starts. */
export function loadOpenCv(): Promise<{ cv: typeof OpenCv }> {
  if (loading) return loading;
  loading = new Promise<{ cv: typeof OpenCv }>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => fail(), 20000);

    function fail() {
      window.clearTimeout(timeout);
      script.remove();
      reject(new Error("OpenCV could not load. Stop and restart the camera to retry."));
    }

    script.async = true;
    script.src = "/vendor/opencv.js";
    script.onerror = fail;
    script.onload = () => {
      const cv = window.cv;
      if (!cv) { fail(); return; }
      function ready() {
        window.clearTimeout(timeout);
        // 4.12 exposes a self-resolving thenable: resolving cv directly loops.
        resolve({ cv: cv! });
      }
      if (cv.Mat) ready();
      else cv.onRuntimeInitialized = ready;
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}

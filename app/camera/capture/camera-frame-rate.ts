import { updateCameraConstraints } from "./camera-constraints";

function reportedFrameRate(track: MediaStreamTrack): number | null {
  const rate = track.getSettings?.().frameRate;
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function cameraFrameRate(track: MediaStreamTrack) {
  try {
    const actual = reportedFrameRate(track);
    const { min, max } = track.getCapabilities?.().frameRate ?? {};
    if (typeof min !== "number" || typeof max !== "number" || !Number.isFinite(min) || !Number.isFinite(max)
      || min < 0 || max <= 0 || max <= min || !track.applyConstraints) {
      return { rates: [], actual };
    }
    const rates = [10, 15, 20, 25, 30, 60].filter((rate) => rate >= min && rate <= max);
    return { rates, actual };
  } catch {
    return { rates: [], actual: null };
  }
}

/** Apply a maximum to the actual camera stream, not just to the detection timer. */
export async function applyCameraFrameRate(track: MediaStreamTrack, limit: number | null): Promise<number | null> {
  if (limit !== null && !cameraFrameRate(track).rates.includes(limit)) throw new Error("Unsupported frame rate");
  await updateCameraConstraints(track, (current) => {
    const next = { ...current };
    if (limit === null) delete next.frameRate;
    else next.frameRate = { ideal: limit, max: limit };
    return next;
  });
  const actual = reportedFrameRate(track);
  if (limit !== null && (actual === null || actual > limit + 0.5)) throw new Error("Camera did not apply frame-rate limit");
  return actual;
}

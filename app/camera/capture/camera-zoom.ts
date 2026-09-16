export interface CameraZoom {
  mode: "camera" | "digital";
  min: number;
  max: number;
  step: number;
  value: number;
}

export function digitalZoom(): CameraZoom {
  return { mode: "digital", min: 1, max: 3, step: 0.1, value: 1 };
}

/** Zoom is optional even when the browser supports camera capture. */
export function cameraZoom(track: MediaStreamTrack): CameraZoom {
  try {
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
      zoom?: { min: number; max: number; step: number };
    };
    const range = capabilities.zoom;
    if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)
      || range.min <= 0 || range.max <= range.min) return digitalZoom();
    const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };
    const value = settings.zoom !== undefined && Number.isFinite(settings.zoom) ? settings.zoom : range.min;
    return {
      mode: "camera",
      min: range.min,
      max: range.max,
      step: Number.isFinite(range.step) && range.step > 0 ? range.step : 0.1,
      value: Math.max(range.min, Math.min(range.max, value)),
    };
  } catch {
    return digitalZoom();
  }
}

/** Verify the applied setting: some cameras silently ignore zoom constraints. */
export async function applyCameraZoom(track: MediaStreamTrack, value: number, step: number): Promise<CameraZoom> {
  const constraint: MediaTrackConstraintSet & { zoom: number } = { zoom: value };
  await track.applyConstraints({ advanced: [constraint] });
  const actual = cameraZoom(track);
  if (actual.mode !== "camera" || Math.abs(actual.value - value) > step / 2) {
    throw new Error("Camera did not apply zoom");
  }
  return actual;
}

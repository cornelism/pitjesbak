import { describe, expect, it, vi } from "vitest";
import { cameraZoom, applyCameraZoom } from "./camera-zoom";

describe("camera zoom capabilities", () => {
  it.each([
    undefined,
    { min: 1, max: 1, step: 0 },
    { min: 0, max: 3, step: 0.1 },
    { min: 1, max: NaN, step: 0.1 },
  ])("uses digital zoom for unsupported or invalid range %s", (zoom) => {
    const track = { getCapabilities: () => ({ zoom }), getSettings: () => ({}) } as unknown as MediaStreamTrack;
    expect(cameraZoom(track)).toEqual({ mode: "digital", min: 1, max: 3, step: 0.1, value: 1 });
  });

  it("uses the camera's range and clamps invalid current settings", () => {
    const track = {
      getCapabilities: () => ({ zoom: { min: 100, max: 400, step: 10 } }),
      getSettings: () => ({ zoom: 500 }),
    } as unknown as MediaStreamTrack;
    expect(cameraZoom(track)).toEqual({ mode: "camera", min: 100, max: 400, step: 10, value: 400 });
  });
});

describe("applying hardware zoom", () => {
  it("accepts rounding within half a hardware step and returns the actual value", async () => {
    const track = {
      applyConstraints: vi.fn().mockResolvedValue(undefined),
      getCapabilities: () => ({ zoom: { min: 1, max: 4, step: 0.1 } }),
      getSettings: () => ({ zoom: 2.04 }),
    } as unknown as MediaStreamTrack;
    expect(await applyCameraZoom(track, 2, 0.1)).toMatchObject({ mode: "camera", value: 2.04 });
    expect(track.applyConstraints).toHaveBeenCalledWith({ advanced: [{ zoom: 2 }] });
  });

  it.each([1, 2.06])("rejects an applied zoom of %s when it differs from the requested value", async (value) => {
    const track = {
      applyConstraints: vi.fn().mockResolvedValue(undefined),
      getCapabilities: () => ({ zoom: { min: 1, max: 4, step: 0.1 } }),
      getSettings: () => ({ zoom: value }),
    } as unknown as MediaStreamTrack;
    await expect(applyCameraZoom(track, 2, 0.1)).rejects.toThrow("Camera did not apply zoom");
  });
});

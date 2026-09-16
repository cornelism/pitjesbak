import { describe, expect, it } from "vitest";
import { cameraZoom } from "./camera-zoom";

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

import { expect, it } from "vitest";
import { applyCameraFrameRate, cameraFrameRate } from "./camera-frame-rate";
import { applyCameraZoom } from "./camera-zoom";

function camera() {
  let constraints: MediaTrackConstraints & { zoom?: boolean } = { width: { ideal: 1920 }, height: { ideal: 1080 }, zoom: true };
  let fps = 30, zoom = 1;
  const track = {
    getCapabilities: () => ({ frameRate: { min: 1, max: 60 }, zoom: { min: 1, max: 4, step: 0.1 } }),
    getSettings: () => ({ frameRate: fps, zoom }),
    getConstraints: () => structuredClone(constraints),
    applyConstraints: async (next: MediaTrackConstraints) => {
      await Promise.resolve();
      const advanced = next.advanced as (MediaTrackConstraintSet & { zoom?: number })[] | undefined;
      const nextZoom = advanced?.find((item) => item.zoom !== undefined)?.zoom;
      const hasImage = "zoom" in next || nextZoom !== undefined;
      const hasVideo = "width" in next || "height" in next || "frameRate" in next;
      if (hasImage && hasVideo) throw new Error("Mixed image and video constraints");
      if (nextZoom !== undefined) {
        constraints = { ...constraints, advanced };
        zoom = nextZoom;
      } else {
        constraints = { ...next, advanced: constraints.advanced };
        const range = next.frameRate as ConstrainDoubleRange | undefined;
        fps = range?.max ?? 30;
      }
    },
  } as unknown as MediaStreamTrack;
  return track;
}

it("caps the camera frame rate while retaining resolution constraints", async () => {
  const track = camera();
  expect(await applyCameraFrameRate(track, 15)).toBe(15);
  expect(track.getConstraints()).toMatchObject({ width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { max: 15 } });
});

it("preserves both settings when FPS and zoom changes overlap", async () => {
  const track = camera();
  await Promise.all([applyCameraFrameRate(track, 15), applyCameraZoom(track, 2, 0.1)]);
  expect(track.getSettings()).toMatchObject({ frameRate: 15, zoom: 2 });
  await Promise.all([applyCameraZoom(track, 3, 0.1), applyCameraFrameRate(track, 20)]);
  expect(track.getSettings()).toMatchObject({ frameRate: 20, zoom: 3 });
});

it("removes only the FPS limit when switching back to Auto", async () => {
  const track = camera();
  await applyCameraZoom(track, 2, 0.1);
  await applyCameraFrameRate(track, 15);
  expect(await applyCameraFrameRate(track, null)).toBe(30);
  expect(track.getSettings().zoom).toBe(2);
  expect(track.getConstraints()).not.toHaveProperty("frameRate");
  expect(track.getConstraints().width).toEqual({ ideal: 1920 });
});

it("reports unsupported controls without failing camera playback", () => {
  expect(cameraFrameRate({} as MediaStreamTrack)).toEqual({ rates: [], actual: null });
});

it("rejects invalid limits before changing the camera", async () => {
  const track = camera();
  for (const value of [NaN, 0, -1, 100]) await expect(applyCameraFrameRate(track, value)).rejects.toThrow();
  expect(track.getSettings().frameRate).toBe(30);
});

it("rejects a silently ignored limit and permits a later update", async () => {
  const track = camera();
  const apply = track.applyConstraints.bind(track);
  track.applyConstraints = async () => {};
  await expect(applyCameraFrameRate(track, 15)).rejects.toThrow();
  track.applyConstraints = apply;
  expect(await applyCameraFrameRate(track, 15)).toBe(15);
});

it("recovers after the camera rejects a constraint", async () => {
  const track = camera();
  const apply = track.applyConstraints.bind(track);
  track.applyConstraints = async () => { throw new Error("Unsupported"); };
  await expect(applyCameraFrameRate(track, 15)).rejects.toThrow("Unsupported");
  track.applyConstraints = apply;
  expect(await applyCameraFrameRate(track, 20)).toBe(20);
});

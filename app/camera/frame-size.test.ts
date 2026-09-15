// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cameraFrameSize } from "./frame-size";

describe("cameraFrameSize", () => {
  it.each([
    { name: "landscape HD", videoWidth: 1920, videoHeight: 1080, width: 640, height: 360 },
    { name: "portrait HD", videoWidth: 1080, videoHeight: 1920, width: 360, height: 640 },
    { name: "square", videoWidth: 1200, videoHeight: 1200, width: 640, height: 640 },
    { name: "fractional scaled dimensions", videoWidth: 1000, videoHeight: 667, width: 640, height: 427 },
    { name: "already at the limit", videoWidth: 640, videoHeight: 480, width: 640, height: 480 },
    { name: "small frame without upscaling", videoWidth: 321, videoHeight: 241, width: 321, height: 241 },
    { name: "uninitialized video", videoWidth: 0, videoHeight: 0, width: 0, height: 0 },
  ])("sizes $name", ({ videoWidth, videoHeight, width, height }) => {
    expect(cameraFrameSize({ videoWidth, videoHeight })).toEqual({ width, height });
  });
});

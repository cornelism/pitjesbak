import { expect, it, vi } from "vitest";
import { createCropFrameCapture } from "./capture-frame";

it("uses one frozen native frame for the full field, zoomed view, and all die crops", () => {
  const video = document.createElement("video");
  Object.defineProperties(video, { videoWidth: { value: 1920 }, videoHeight: { value: 1080 } });
  const pixels = { width: 90, height: 60, data: new Uint8ClampedArray(90 * 60 * 4) };
  const native = { drawImage: vi.fn(), getImageData: vi.fn(() => pixels) };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(native as unknown as CanvasRenderingContext2D);
  const overview = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ width: 640, height: 360 })) };
  const captured = createCropFrameCapture()(video, overview as unknown as CanvasRenderingContext2D, { width: 640, height: 360 }, 2);
  const snapshot = overview.drawImage.mock.calls[0][0];
  expect(snapshot).toBeInstanceOf(HTMLCanvasElement);
  expect(snapshot.width).toBe(1920);
  expect(native.drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0);
  expect(overview.drawImage).toHaveBeenLastCalledWith(snapshot, 480, 270, 960, 540, 0, 0, 640, 360);
  expect(captured.readCrop({ x: 500, y: 300, width: 90, height: 60 })).toBe(pixels);
  expect(native.getImageData).toHaveBeenCalledWith(500, 300, 90, 60);
  expect(native.drawImage).toHaveBeenCalledOnce();
});

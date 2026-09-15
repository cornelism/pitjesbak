import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SaveCameraFrame from "./save-camera-frame";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function camera(ready = true) {
  const video = document.createElement("video");
  Object.defineProperties(video, {
    readyState: { value: ready ? 2 : 0 },
    videoWidth: { value: 1920 },
    videoHeight: { value: 1080 },
  });
  return { current: video };
}

describe("SaveCameraFrame", () => {
  it("downloads an unannotated PNG at the detector's resolution only on click", () => {
    const videoRef = camera();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,test");
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("dice-camera-frame.png");
      expect(this.href).toBe("data:image/png;base64,test");
    });
    render(<SaveCameraFrame videoRef={videoRef} />);
    expect(drawImage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save camera frame" }));
    expect(drawImage).toHaveBeenCalledWith(videoRef.current, 0, 0, 640, 360);
    expect(encode).toHaveBeenCalledWith("image/png");
    expect(download).toHaveBeenCalledOnce();
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("reports a frame that is not ready", () => {
    render(<SaveCameraFrame videoRef={camera(false)} />);
    fireEvent.click(screen.getByRole("button", { name: "Save camera frame" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Wait for the camera/);
  });

  it("handles unavailable canvas capture", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<SaveCameraFrame videoRef={camera()} />);
    fireEvent.click(screen.getByRole("button", { name: "Save camera frame" }));
    expect(screen.getByRole("alert").textContent).toMatch(/screenshot/);
  });
});

import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CameraPreview from "./camera-preview";

function createStream() {
  const track = Object.assign(new EventTarget(), { stop: vi.fn() });
  return { stream: { getTracks: () => [track], getVideoTracks: () => [track] }, track };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

const getUserMedia = vi.fn();

beforeEach(() => {
  getUserMedia.mockReset();
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
});

afterEach(cleanup);

function startCamera() {
  fireEvent.click(screen.getByRole("button", { name: "Start camera" }));
}

describe("CameraPreview", () => {
  it("changes FPS without reopening the camera or resetting the selected angle", async () => {
    const { stream, track } = createStream();
    let fps = 30;
    Object.assign(track, {
      getCapabilities: () => ({ frameRate: { min: 1, max: 30 } }),
      getSettings: () => ({ frameRate: fps }),
      applyConstraints: async (constraints: MediaTrackConstraints) => {
        fps = (constraints.frameRate as ConstrainDoubleRange).max!;
      },
    });
    getUserMedia.mockResolvedValue(stream);
    render(<CameraPreview />);
    startCamera();
    const select = await screen.findByRole("combobox", { name: "Frame rate" });
    const angle = screen.getByRole<HTMLInputElement>("slider", { name: "Camera angle from overhead" });
    fireEvent.change(angle, { target: { value: "35" } });
    await act(async () => { fireEvent.change(select, { target: { value: "15" } }); });
    expect(screen.getByText("Camera reports 15 FPS")).toBeDefined();
    expect(angle.value).toBe("35");
    expect(screen.getByLabelText<HTMLVideoElement>("Live camera preview").srcObject).toBe(stream);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(track.stop).not.toHaveBeenCalled();
  });

  it("uses digital zoom without hardware support and clips the preview to its source aspect ratio", async () => {
    getUserMedia.mockResolvedValue(createStream().stream);
    render(<CameraPreview />);
    startCamera();
    const slider = await screen.findByRole("slider", { name: "Camera zoom" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(screen.getByText("Zoom: 2.0× (digital)")).toBeDefined();
    const video = screen.getByLabelText<HTMLVideoElement>("Live camera preview");
    expect(video.style.transform).toBe("scale(2)");
    Object.defineProperties(video, { videoWidth: { value: 640 }, videoHeight: { value: 480 } });
    fireEvent.loadedMetadata(video);
    expect(parseFloat(video.parentElement!.style.aspectRatio)).toBeCloseTo(4 / 3);
  });

  it("applies hardware zoom without also cropping the preview", async () => {
    const { stream, track } = createStream();
    let value = 1;
    const applyConstraints = vi.fn(async (constraints: { advanced: { zoom: number }[] }) => {
      value = constraints.advanced[0].zoom;
    });
    Object.assign(track, {
      getCapabilities: () => ({ zoom: { min: 1, max: 4, step: 0.1 } }),
      getSettings: () => ({ zoom: value }), applyConstraints,
    });
    getUserMedia.mockResolvedValue(stream);
    render(<CameraPreview />);
    startCamera();
    const slider = await screen.findByRole("slider", { name: "Camera zoom" });
    await act(async () => { fireEvent.change(slider, { target: { value: "2" } }); });
    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ zoom: 2 }] });
    expect(screen.getByText("Zoom: 2.0× (camera)")).toBeDefined();
    expect(screen.getByLabelText<HTMLVideoElement>("Live camera preview").style.transform).toBe("scale(1)");
  });

  it.each(["reject", "ignore"])("falls back to digital zoom when the camera constraints %s", async (behavior) => {
    const { stream, track } = createStream();
    Object.assign(track, {
      getCapabilities: () => ({ zoom: { min: 1, max: 4, step: 0.1 } }),
      getSettings: () => ({ zoom: 1 }),
      applyConstraints: behavior === "reject" ? vi.fn().mockRejectedValue(new Error("Unsupported")) : vi.fn().mockResolvedValue(undefined),
    });
    getUserMedia.mockResolvedValue(stream);
    render(<CameraPreview />);
    startCamera();
    const slider = await screen.findByRole("slider", { name: "Camera zoom" });
    await act(async () => { fireEvent.change(slider, { target: { value: "2" } }); });
    expect(screen.getByRole("alert").textContent).toContain("Use digital zoom");
    fireEvent.change(slider, { target: { value: "2" } });
    expect(screen.getByText("Zoom: 2.0× (digital)")).toBeDefined();
  });

  it("ignores a pending zoom response after the camera is restarted", async () => {
    const old = createStream();
    const current = createStream();
    const change = deferred<void>();
    Object.assign(old.track, {
      getCapabilities: () => ({ zoom: { min: 1, max: 4, step: 0.1 } }),
      getSettings: () => ({ zoom: 2 }), applyConstraints: () => change.promise,
    });
    getUserMedia.mockResolvedValueOnce(old.stream).mockResolvedValueOnce(current.stream);
    render(<CameraPreview />);
    startCamera();
    fireEvent.change(await screen.findByRole("slider", { name: "Camera zoom" }), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Stop camera" }));
    startCamera();
    await screen.findByText("Zoom: 1.0× (digital)");
    await act(async () => { change.resolve(); });
    expect(screen.getByText("Zoom: 1.0× (digital)")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("requests video only after starting and releases the stream when stopped", async () => {
    const { stream, track } = createStream();
    getUserMedia.mockResolvedValue(stream);
    render(<StrictMode><CameraPreview /></StrictMode>);
    expect(getUserMedia).not.toHaveBeenCalled();

    startCamera();
    const stop = await screen.findByRole("button", { name: "Stop camera" });
    const video = screen.getByLabelText<HTMLVideoElement>("Live camera preview");
    expect(getUserMedia).toHaveBeenCalledExactlyOnceWith({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, zoom: true }, audio: false,
    });
    expect(video.srcObject).toBe(stream);
    expect(video.play).toHaveBeenCalledOnce();
    expect(video.muted).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);

    fireEvent.click(stop);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
    expect(screen.getByRole("button", { name: "Start camera" })).toBeDefined();
  });

  it.each([
    ["NotAllowedError", /Camera access was blocked/],
    ["NotFoundError", /No camera was found/],
    ["NotReadableError", /Close other apps/],
    ["UnknownError", /preview could not start/],
  ])("explains %s and allows retrying", async (name, message) => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Failed", name));
    render(<CameraPreview />);
    startCamera();
    expect(await screen.findByText(message)).toBeDefined();

    const { stream } = createStream();
    getUserMedia.mockResolvedValueOnce(stream);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Live preview")).toBeDefined();
  });

  it("explains unavailable camera APIs", () => {
    vi.stubGlobal("navigator", {});
    render(<CameraPreview />);
    startCamera();
    expect(screen.getByText(/HTTPS or localhost/)).toBeDefined();
  });

  it("releases the active camera on unmount", async () => {
    const { stream, track } = createStream();
    getUserMedia.mockResolvedValue(stream);
    const { unmount } = render(<CameraPreview />);
    startCamera();
    await screen.findByText("Live preview");
    const video = screen.getByLabelText<HTMLVideoElement>("Live camera preview");
    unmount();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(video.srcObject).toBeNull();
  });

  it("releases a stream whose permission request finishes after unmount", async () => {
    const { stream, track } = createStream();
    const request = deferred<typeof stream>();
    getUserMedia.mockReturnValue(request.promise);
    const { unmount } = render(<CameraPreview />);
    startCamera();
    unmount();
    await act(async () => { request.resolve(stream); });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("discards a cancelled request without replacing a newer preview", async () => {
    const old = createStream();
    const current = createStream();
    const request = deferred<typeof old.stream>();
    getUserMedia.mockReturnValueOnce(request.promise).mockResolvedValueOnce(current.stream);
    render(<CameraPreview />);
    startCamera();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    startCamera();
    await screen.findByText("Live preview");

    await act(async () => { request.resolve(old.stream); });
    expect(old.track.stop).toHaveBeenCalledOnce();
    expect(current.track.stop).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLVideoElement>("Live camera preview").srcObject).toBe(current.stream);
  });

  it("does not revive the preview if playback finishes after cancellation", async () => {
    const { stream, track } = createStream();
    const playback = deferred<void>();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(playback.promise);
    render(<CameraPreview />);
    await act(async () => { startCamera(); });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await act(async () => { playback.resolve(); });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(screen.queryByText("Live preview")).toBeNull();
  });

  it("stops capture when playback fails", async () => {
    const { stream, track } = createStream();
    getUserMedia.mockResolvedValue(stream);
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error("Playback failed"));
    render(<CameraPreview />);
    startCamera();
    await screen.findByRole("button", { name: "Try again" });
    expect(track.stop).toHaveBeenCalledOnce();
    expect(screen.getByLabelText<HTMLVideoElement>("Live camera preview").srcObject).toBeNull();
  });

  it("handles camera disconnection and removes its event listener", async () => {
    const { stream, track } = createStream();
    getUserMedia.mockResolvedValue(stream);
    render(<CameraPreview />);
    startCamera();
    await screen.findByText("Live preview");
    act(() => { track.dispatchEvent(new Event("ended")); });
    expect(screen.getByText(/camera disconnected/)).toBeDefined();
    expect(track.stop).toHaveBeenCalledOnce();
    act(() => { track.dispatchEvent(new Event("ended")); });
    expect(track.stop).toHaveBeenCalledOnce();
  });
});

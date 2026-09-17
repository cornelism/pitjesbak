import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CameraPreview from "../components/camera-preview";
import { detectDiceOpenCv } from "../detection/opencv-dice";
import { motionFrame } from "../__fixtures__/motion-frames";
import type { DetectedDie } from "../dice-types";

vi.mock("../detection/opencv-dice", () => ({ detectDiceOpenCv: vi.fn() }));
vi.mock("../detection/opencv-runtime", () => ({ loadOpenCv: () => Promise.resolve({ cv: {} }) }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("switches between immediate and stabilized confirmation without restarting the camera", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const track = Object.assign(new EventTarget(), { stop: vi.fn() });
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [track], getVideoTracks: () => [track] });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const dice: DetectedDie[] = ([2, 4, 6] as const).map((value, i) => ({ value, x: 80 + i * 80, y: 100, width: 40, height: 40 }));
  const image = motionFrame(dice);
  vi.mocked(detectDiceOpenCv).mockReturnValue(dice);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(), getImageData: () => image, clearRect: vi.fn(),
    strokeRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  const { unmount } = render(<CameraPreview />);
  const video = screen.getByLabelText<HTMLVideoElement>("Live camera preview");
  Object.defineProperties(video, { readyState: { value: 2 }, videoWidth: { value: 640 }, videoHeight: { value: 480 } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start camera" })); });
  const checkbox = screen.getByRole<HTMLInputElement>("checkbox", { name: "Enable stabilization" });
  expect(checkbox.checked).toBe(true);
  const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
  await advance(160);
  expect(log).not.toHaveBeenCalled();

  await act(async () => { fireEvent.click(checkbox); });
  expect(checkbox.checked).toBe(false);
  expect(vi.getTimerCount()).toBe(1);
  await advance(160);
  expect(screen.getByText("Roll confirmed")).toBeTruthy();
  expect(log).toHaveBeenCalledExactlyOnceWith("[Dice roll]", expect.objectContaining({ dice: [2, 4, 6] }));

  await act(async () => { fireEvent.click(checkbox); });
  expect(checkbox.checked).toBe(true);
  expect(screen.getByText("Last roll: None yet")).toBeTruthy();
  expect(vi.getTimerCount()).toBe(1);
  await advance(160);
  expect(log).toHaveBeenCalledTimes(1);
  await advance(960);
  expect(log).toHaveBeenCalledTimes(2);
  expect(screen.getByText("Roll confirmed")).toBeTruthy();
  expect(getUserMedia).toHaveBeenCalledOnce();
  expect(track.stop).not.toHaveBeenCalled();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

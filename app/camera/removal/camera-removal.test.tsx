import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import CameraPreview from "../components/camera-preview";
import { detectDiceOpenCv } from "../detection/opencv-dice";
import { motionFrame } from "../__fixtures__/motion-frames";
import type { DetectedDie } from "../dice-types";

vi.mock("../detection/opencv-dice", () => ({ detectDiceOpenCv: vi.fn() }));
vi.mock("../detection/opencv-runtime", () => ({ loadOpenCv: () => Promise.resolve({ cv: {} }) }));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it.each(["digital", "camera"])("confirms removal, keeps the badge and resets %s zoom to 1.0×", async (mode) => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const track = Object.assign(new EventTarget(), { stop: vi.fn() });
  let hardwareZoom = 2;
  const applyConstraints = vi.fn(async ({ advanced }: { advanced: { zoom: number }[] }) => { hardwareZoom = advanced[0].zoom; });
  if (mode === "camera") Object.assign(track, {
    getCapabilities: () => ({ zoom: { min: 2, max: 6, step: 0.1 } }),
    getSettings: () => ({ zoom: hardwareZoom }), applyConstraints,
  });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track], getVideoTracks: () => [track] }) } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const dice: DetectedDie[] = [270, 310, 350].map((x) => ({ value: 4, x, y: 200, width: 24, height: 24 }));
  let objects = dice;
  let readings = dice;
  const drawImage = vi.fn();
  const clearRect = vi.fn();
  const crop = (items: DetectedDie[]) => items.map((die) => ({
    ...die, x: 320 + (die.x - 320) * 2, y: 240 + (die.y - 240) * 2, width: die.width * 2, height: die.height * 2,
  }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage, getImageData: () => motionFrame(drawImage.mock.lastCall?.length === 9 ? crop(objects) : objects),
    clearRect, strokeRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  const { unmount } = render(<CameraPreview />);
  const video = screen.getByLabelText<HTMLVideoElement>("Live camera preview");
  Object.defineProperties(video, { readyState: { value: 2 }, videoWidth: { value: 640 }, videoHeight: { value: 480 } });
  vi.mocked(detectDiceOpenCv).mockImplementation(() => video.style.transform === "scale(2)" ? crop(readings) : readings);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Start camera" })); });
  await act(async () => { fireEvent.change(screen.getByRole("slider", { name: "Camera zoom" }), { target: { value: mode === "digital" ? "2" : "4" } }); });
  const advance = async (ms: number) => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
  await advance(1120);
  expect(screen.getByText("Roll confirmed")).toBeTruthy();

  // A stationary hand is still an obstruction after recognition returns no pips.
  readings = [];
  objects = [{ ...dice[0], x: 240, y: 150, width: 160, height: 120 }];
  await advance(3000);
  expect(screen.queryByText("Dice removed")).toBeNull();
  // Neither partial removal nor moving the last die outside the digital crop is removal.
  objects = dice.slice(0, 1);
  await advance(2500);
  expect(screen.queryByText("Dice removed")).toBeNull();
  objects = [{ ...dice[0], x: 100, y: 300 }];
  await advance(2500);
  expect(screen.queryByText("Dice removed")).toBeNull();

  objects = [];
  await advance(160);
  await advance(1920);
  expect(screen.queryByText("Dice removed")).toBeNull();
  await advance(160);
  const badge = screen.getByText("Dice removed");
  expect(badge.getAttribute("role")).toBe("status");
  expect(badge.className).toContain("right-3 top-3");
  expect(screen.getByText(`Zoom: 1.0× (${mode})`)).toBeTruthy();
  expect(screen.getByText("Last roll: None yet")).toBeTruthy();
  if (mode === "camera") expect(applyConstraints).toHaveBeenLastCalledWith({ advanced: [{ zoom: 2 }] });
  expect(clearRect).toHaveBeenCalled();
  await advance(2500);
  expect(screen.getByText("Dice removed")).toBeTruthy();
  expect(log.mock.calls.filter(([event]) => event === "[Dice removed]")).toHaveLength(1);

  objects = readings = dice;
  await advance(160);
  expect(screen.queryByText("Dice removed")).toBeNull();
  await advance(1120);
  expect(screen.getByText("Roll confirmed")).toBeTruthy();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

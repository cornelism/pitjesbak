import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DiceReader from "./dice-reader";
import { detectDiceOpenCv } from "../detection/opencv-dice";
import type { DieValue } from "../dice-types";
import { motionFrame } from "../__fixtures__/motion-frames";

vi.mock("../detection/opencv-dice", () => ({ detectDiceOpenCv: vi.fn() }));
vi.mock("../detection/opencv-runtime", () => ({ loadOpenCv: () => Promise.resolve({ cv: {} }) }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each(["steady", "flickering"])("confirms %s readings, then freezes indicators until a new throw", async (mode) => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const video = document.createElement("video");
  Object.defineProperties(video, { readyState: { value: 2 }, videoWidth: { value: 640 }, videoHeight: { value: 480 } });
  const fillText = vi.fn();
  const strokeRect = vi.fn();
  const clearRect = vi.fn();
  const drawImage = vi.fn();
  let image = motionFrame(([1, 4, 2] as const).map((value, i) => ({ value, x: i * 80, y: 40, width: 50, height: 50 })));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage, getImageData: vi.fn().mockImplementation(() => image), clearRect,
    strokeRect, fillRect: vi.fn(), fillText,
  } as unknown as CanvasRenderingContext2D);
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  let values: DieValue[] = [1, 4, 2];
  let offset = 0;
  vi.mocked(detectDiceOpenCv).mockImplementation(() => values.map((value, i) => ({ value, x: i * 80 + offset, y: 40, width: 50, height: 50 })));
  const videoRef = { current: video };
  const { unmount, rerender } = render(<DiceReader videoRef={videoRef} />);
  const attempt = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(160); }); };
  await act(async () => {});

  await attempt();
  expect(fillText.mock.calls.slice(-3).map(([value]) => value)).toEqual(["1", "4", "2"]);
  for (let i = 1; i < 7; i++) {
    values = mode === "flickering" && i === 1 ? [1, 4, 6] : [1, 4, 2];
    await attempt();
    if (mode === "flickering" && i < 6) {
      expect(log).not.toHaveBeenCalled();
      expect(screen.getByText(/\/6 agreeing readings · need 5/)).toBeTruthy();
    }
  }
  expect(log).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toBe("Last roll: 1 · 4 · 2");

  const redraws = clearRect.mock.calls.length;
  offset = 30;
  for (let i = 0; i < 15; i++) {
    values = i < 8 ? [] : [1, 4, 6];
    await attempt();
    expect(screen.getByText("Roll confirmed")).toBeTruthy();
    expect(fillText.mock.calls.slice(-3).map(([value]) => value)).toEqual(["1", "4", "2"]);
    expect(strokeRect.mock.calls.slice(-3).map(([x]) => x)).toEqual([0, 80, 160]);
  }
  expect(clearRect).toHaveBeenCalledTimes(redraws);
  expect(log).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toBe("Last roll: 1 · 4 · 2");

  // A new throw moves the dice, unlocking the previous confirmation.
  offset = 80;
  image = motionFrame(values.map((value, i) => ({ value, x: i * 80 + offset, y: 40, width: 50, height: 50 })));
  for (let i = 0; i < 10; i++) await attempt();
  expect(log).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status").textContent).toBe("Last roll: 1 · 4 · 6");
  expect(fillText.mock.calls.slice(-3).map(([value]) => value)).toEqual(["1", "4", "6"]);

  // Changing either setting must discard the frozen roll and replace the loop.
  if (mode === "steady") {
    fireEvent.change(screen.getByLabelText("Camera angle from overhead"), { target: { value: "50" } });
  } else {
    values = [1, 4];
    fireEvent.change(screen.getByLabelText("Dice to read"), { target: { value: "2" } });
  }
  expect(screen.getByRole("status").textContent).toBe("Last roll: None yet");
  await act(async () => {});
  expect(vi.getTimerCount()).toBe(1);
  for (let i = 0; i < 7; i++) await attempt();
  expect(log).toHaveBeenCalledTimes(3);
  expect(screen.getByRole("status").textContent).toBe(`Last roll: ${values.join(" · ")}`);
  expect(vi.mocked(detectDiceOpenCv).mock.lastCall?.[2]).toBe(mode === "steady" ? 50 : 45);

  // Zoom resets confirmation but preserves angle/count settings and uses the
  // same source crop as saved frames and the centered preview.
  await act(async () => { rerender(<DiceReader videoRef={videoRef} zoom={2} zoomRevision={1} />); });
  expect(screen.getByRole("status").textContent).toBe("Last roll: None yet");
  expect(screen.getByLabelText<HTMLInputElement>("Camera angle from overhead").value).toBe(mode === "steady" ? "50" : "45");
  expect(screen.getByLabelText<HTMLSelectElement>("Dice to read").value).toBe(mode === "steady" ? "3" : "2");
  expect(vi.getTimerCount()).toBe(1);
  await attempt();
  expect(drawImage).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), 160, 120, 320, 240, 0, 0, 640, 480);

  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

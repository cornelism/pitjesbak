import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DiceReader from "./dice-reader";
import { detectDiceOpenCv } from "./opencv-dice";
import type { DieValue } from "./dice-types";

vi.mock("./opencv-dice", () => ({ detectDiceOpenCv: vi.fn() }));
vi.mock("./opencv-runtime", () => ({ loadOpenCv: () => Promise.resolve({ cv: {} }) }));

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("freezes confirmed values, marker positions and status until a new throw", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  const video = document.createElement("video");
  Object.defineProperties(video, { readyState: { value: 2 }, videoWidth: { value: 640 }, videoHeight: { value: 480 } });
  const fillText = vi.fn();
  const strokeRect = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(), getImageData: vi.fn().mockReturnValue({}), clearRect: vi.fn(),
    strokeRect, fillRect: vi.fn(), fillText,
  } as unknown as CanvasRenderingContext2D);
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  let values: DieValue[] = [1, 4, 2];
  let offset = 0;
  vi.mocked(detectDiceOpenCv).mockImplementation(() => values.map((value, i) => ({ value, x: i * 80 + offset, y: 40, width: 50, height: 50 })));
  const { unmount } = render(<DiceReader videoRef={{ current: video }} />);
  const attempt = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(160); }); };
  await act(async () => {});

  await attempt();
  expect(fillText.mock.calls.slice(-3).map(([value]) => value)).toEqual(["1", "4", "2"]);
  for (let i = 1; i < 7; i++) await attempt();
  expect(log).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toBe("Last roll: 1 · 4 · 2");

  values = [1, 4, 6];
  offset = 2;
  for (let i = 0; i < 15; i++) {
    await attempt();
    expect(screen.getByText("Roll confirmed")).toBeTruthy();
    expect(fillText.mock.calls.slice(-3).map(([value]) => value)).toEqual(["1", "4", "2"]);
    expect(strokeRect.mock.calls.slice(-3).map(([x]) => x)).toEqual([0, 80, 160]);
  }
  expect(log).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("status").textContent).toBe("Last roll: 1 · 4 · 2");

  // A new throw moves the dice, unlocking the previous confirmation.
  offset = 80;
  for (let i = 0; i < 10; i++) await attempt();
  expect(log).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("status").textContent).toBe("Last roll: 1 · 4 · 6");
  expect(fillText.mock.calls.slice(-3).map(([value]) => value)).toEqual(["1", "4", "6"]);

  unmount();
  expect(vi.getTimerCount()).toBe(0);
});

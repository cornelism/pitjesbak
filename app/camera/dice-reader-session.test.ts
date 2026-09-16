import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDiceReader } from "./dice-reader-session";
import { loadOpenCv } from "./detection/opencv-runtime";
import { detectDiceOpenCv } from "./detection/opencv-dice";

vi.mock("./detection/opencv-runtime", () => ({ loadOpenCv: vi.fn() }));
vi.mock("./detection/opencv-dice", () => ({ detectDiceOpenCv: vi.fn() }));

const runtime = { cv: {} } as Awaited<ReturnType<typeof loadOpenCv>>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  vi.mocked(loadOpenCv).mockResolvedValue(runtime);
  vi.mocked(detectDiceOpenCv).mockReturnValue([]);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetAllMocks();
});

function sessionOptions() {
  const video = document.createElement("video");
  Object.defineProperties(video, {
    readyState: { value: 2, writable: true },
    videoWidth: { value: 640, writable: true },
    videoHeight: { value: 480, writable: true },
  });
  const overlay = document.createElement("canvas");
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray(640 * 480 * 4), width: 640, height: 480 }),
    clearRect: vi.fn(), strokeRect: vi.fn(), fillRect: vi.fn(), fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  return {
    video, overlay, expectedCount: 3, cameraTilt: 45, zoom: 1,
    onReady: vi.fn(), onStatus: vi.fn(), onRoll: vi.fn(),
  };
}

describe("dice reader session lifecycle", () => {
  it("waits for a usable video frame without creating extra timers", async () => {
    const options = sessionOptions();
    Object.defineProperty(options.video, "readyState", { value: 0 });
    const stop = startDiceReader(options);
    await vi.advanceTimersByTimeAsync(480);
    expect(options.onReady).toHaveBeenCalledOnce();
    expect(detectDiceOpenCv).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    Object.defineProperty(options.video, "readyState", { value: 2 });
    await vi.advanceTimersByTimeAsync(160);
    expect(detectDiceOpenCv).toHaveBeenCalledOnce();
    expect(options.onStatus).toHaveBeenLastCalledWith("0 of 3 dice visible");
    stop();
    stop();
    await vi.advanceTimersByTimeAsync(1000);
    expect(detectDiceOpenCv).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores a stopped session when the shared runtime finishes loading", async () => {
    let resolve!: (runtime: Awaited<ReturnType<typeof loadOpenCv>>) => void;
    vi.mocked(loadOpenCv).mockReturnValue(new Promise((ready) => { resolve = ready; }));
    const old = sessionOptions();
    startDiceReader(old)();
    const current = sessionOptions();
    const stop = startDiceReader(current);
    resolve(runtime);
    await vi.advanceTimersByTimeAsync(160);
    expect(old.onReady).not.toHaveBeenCalled();
    expect(old.onStatus).not.toHaveBeenCalled();
    expect(current.onReady).toHaveBeenCalledOnce();
    expect(detectDiceOpenCv).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(1);
    stop();
  });

  it.each([false, true])("handles a runtime failure with cancelled=%s", async (cancelled) => {
    let reject!: (error: Error) => void;
    vi.mocked(loadOpenCv).mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    const options = sessionOptions();
    const stop = startDiceReader(options);
    if (cancelled) stop();
    reject(new Error("Cannot load WASM"));
    await vi.advanceTimersByTimeAsync(1000);
    if (cancelled) expect(options.onStatus).not.toHaveBeenCalled();
    else expect(options.onStatus).toHaveBeenLastCalledWith("OpenCV could not load. Stop and restart the camera to retry.");
    expect(options.onReady).not.toHaveBeenCalled();
    expect(detectDiceOpenCv).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });

  it("stops sampling when canvas access is unavailable", async () => {
    const options = sessionOptions();
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    const stop = startDiceReader(options);
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.onStatus).toHaveBeenLastCalledWith("Dice reading is unavailable in this browser.");
    expect(detectDiceOpenCv).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });

  it("stops sampling after a detection error without publishing a roll", async () => {
    const options = sessionOptions();
    vi.mocked(detectDiceOpenCv).mockImplementation(() => { throw new Error("Bad frame"); });
    const stop = startDiceReader(options);
    await vi.advanceTimersByTimeAsync(1000);
    expect(options.onStatus).toHaveBeenLastCalledWith("Dice reading failed. Stop and restart the camera to retry.");
    expect(options.onRoll).not.toHaveBeenCalled();
    expect(detectDiceOpenCv).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    stop();
  });
});

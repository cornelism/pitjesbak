import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useCamera } from "./use-camera";

afterEach(cleanup);

it("queues a removal reset behind a pending hardware zoom instead of losing it", async () => {
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  let value = 4;
  const applyConstraints = vi.fn(async ({ advanced }: { advanced: { zoom: number }[] }) => {
    if (advanced[0].zoom === 6) await pending;
    value = advanced[0].zoom;
  });
  const track = Object.assign(new EventTarget(), {
    stop: vi.fn(), applyConstraints,
    getCapabilities: () => ({ zoom: { min: 2, max: 6, step: 0.1 } }), getSettings: () => ({ zoom: value }),
  });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [track], getVideoTracks: () => [track] }) } });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  const { result } = renderHook(useCamera);
  result.current.videoRef.current = document.createElement("video");
  await act(async () => { await result.current.startCamera(); });
  act(() => { void result.current.changeZoom(6); });
  expect(result.current.zoomPending).toBe(true);
  act(() => { result.current.resetZoom(); });
  await act(async () => { finish(); });
  expect(applyConstraints.mock.calls.map(([constraints]) => constraints.advanced[0].zoom)).toEqual([6, 2]);
  expect(result.current.zoom.value / result.current.zoom.min).toBe(1);
  expect(result.current.zoomPending).toBe(false);
});

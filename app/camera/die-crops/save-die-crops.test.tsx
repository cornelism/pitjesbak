import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import SaveDieCrops from "./save-die-crops";
import type { DieCropBatch } from "./types";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function batch(): DieCropBatch {
  return { capturedAt: new Date().toISOString(), sourceSize: { width: 1920, height: 1080 }, overviewSize: { width: 640, height: 360 },
    zoom: 1, cameraTilt: 70, crops: [{ candidate: { x: 200, y: 100, width: 40, height: 30 },
      source: { x: 480, y: 180, width: 360, height: 330 }, overviewValue: 4, cropValue: 6, used: true, preprocessing: "raw",
      image: { width: 360, height: 330, data: new Uint8ClampedArray(360 * 330 * 4), colorSpace: "srgb" } }] };
}
it("sends separate crop pixels and metadata, then displays the saved folder", async () => {
  const putImageData = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ putImageData } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,crop");
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ path: "docs/dice-crops/captures/test" }) });
  vi.stubGlobal("fetch", fetch);
  const current = batch();
  render(<SaveDieCrops batchRef={{ current }} />);
  fireEvent.click(screen.getByRole("button", { name: "Save die crops to repo" }));
  await screen.findByText("Saved 1 die images to docs/dice-crops/captures/test");
  expect(putImageData).toHaveBeenCalledWith(current.crops[0].image, 0, 0);
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(body.crops[0]).toMatchObject({ png: "data:image/png;base64,crop", cropValue: 6 });
  expect(body.crops[0]).not.toHaveProperty("image");
});
it("does not save a stale or unavailable crop set", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  render(<SaveDieCrops batchRef={{ current: { ...batch(), capturedAt: "2020-01-01T00:00:00Z" } }} />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText(/Wait for dice/)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
});
it("shows a save failure without discarding the capture", async () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  render(<SaveDieCrops batchRef={{ current: batch() }} />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(screen.getByText(/Could not save die crops/)).toBeTruthy());
  expect(screen.getByRole<HTMLButtonElement>("button").disabled).toBe(false);
});

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import CameraFrameRateControl from "./camera-frame-rate-control";

afterEach(cleanup);

it("shows the applied limit and reported rate without restarting the track", async () => {
  let fps = 30;
  const track = {
    getCapabilities: () => ({ frameRate: { min: 1, max: 30 } }),
    getSettings: () => ({ frameRate: fps }),
    applyConstraints: async (constraints: MediaTrackConstraints) => {
      fps = (constraints.frameRate as ConstrainDoubleRange | undefined)?.max ?? 30;
    },
  } as MediaStreamTrack;
  render(<CameraFrameRateControl track={track} />);
  const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Frame rate" });
  expect(select.value).toBe("auto");
  expect(screen.queryByRole("option", { name: "60 FPS" })).toBeNull();
  await act(async () => { fireEvent.change(select, { target: { value: "15" } }); });
  expect(select.value).toBe("15");
  expect(screen.getByText("Camera reports 15 FPS")).toBeDefined();
  await act(async () => { fireEvent.change(select, { target: { value: "auto" } }); });
  expect(screen.getByText("Camera reports 30 FPS")).toBeDefined();
});

it("retains the previous selection and explains a rejected limit", async () => {
  const track = {
    getCapabilities: () => ({ frameRate: { min: 1, max: 30 } }),
    getSettings: () => ({ frameRate: 30 }),
    applyConstraints: async () => { throw new Error("unsupported"); },
  } as unknown as MediaStreamTrack;
  render(<CameraFrameRateControl track={track} />);
  const select = screen.getByRole<HTMLSelectElement>("combobox", { name: "Frame rate" });
  await act(async () => { fireEvent.change(select, { target: { value: "15" } }); });
  expect(select.value).toBe("auto");
  expect(screen.getByRole("alert").textContent).toContain("could not apply");
  expect(select.disabled).toBe(false);
});

it("explains when frame-rate control is unavailable", () => {
  render(<CameraFrameRateControl track={{} as MediaStreamTrack} />);
  expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Frame rate" }).disabled).toBe(true);
  expect(screen.getByText("Frame-rate control is unavailable for this camera.")).toBeDefined();
});

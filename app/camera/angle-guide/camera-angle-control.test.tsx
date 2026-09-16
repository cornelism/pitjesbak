import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import CameraAngleControl from "./camera-angle-control";

// jsdom omits AnimationEvent; expose it before React selects event names.
vi.hoisted(() => vi.stubGlobal("AnimationEvent", Event));

afterEach(cleanup);

function Control() {
  const [angle, setAngle] = useState(45);
  return <CameraAngleControl angle={angle} onChange={setAngle} />;
}

it("shows the guide on keyboard focus, updates with the angle, and removes it after fading", () => {
  render(<Control />);
  expect(screen.queryByTestId("camera-angle-grid")).toBeNull();
  const slider = screen.getByRole("slider", { name: "Camera angle from overhead" });
  expect(slider.getAttribute("max")).toBe("70");
  fireEvent.focus(slider);
  const initial = screen.getByTestId("camera-angle-grid");
  expect(initial.getAttribute("data-dragging")).toBe("false");

  fireEvent.change(slider, { target: { value: "70" } });
  expect(screen.getByText("Camera angle: 70°")).toBeTruthy();
  const updated = screen.getByTestId("camera-angle-grid");
  expect(updated).not.toBe(initial); // Restart the fade after each adjustment.
  expect(updated.querySelector("path")?.getAttribute("d"))
    .not.toBe(initial.querySelector("path")?.getAttribute("d"));
  expect(updated.classList.contains("pointer-events-none")).toBe(true);

  fireEvent.animationEnd(updated);
  expect(screen.queryByTestId("camera-angle-grid")).toBeNull();
  // Subsequent keyboard adjustments work without having to refocus.
  fireEvent.change(slider, { target: { value: "0" } });
  expect(screen.getByTestId("camera-angle-grid").querySelector("path")?.getAttribute("d"))
    .not.toBe(updated.querySelector("path")?.getAttribute("d"));
});

it.each(["pointerUp", "pointerCancel", "lostPointerCapture", "blur"] as const)(
  "keeps the guide visible during dragging and resumes fading on %s", (endEvent) => {
    render(<Control />);
    const slider = screen.getByRole("slider");
    const capture = vi.fn();
    Object.defineProperty(slider, "setPointerCapture", { value: capture });
    fireEvent.pointerDown(slider, { pointerId: 1 });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("camera-angle-grid").getAttribute("data-dragging")).toBe("true");
    fireEvent.change(slider, { target: { value: "50" } });
    expect(screen.getByTestId("camera-angle-grid").getAttribute("data-dragging")).toBe("true");

    fireEvent[endEvent](slider);
    const guide = screen.getByTestId("camera-angle-grid");
    expect(guide.getAttribute("data-dragging")).toBe("false");
    fireEvent.animationEnd(guide);
    expect(screen.queryByTestId("camera-angle-grid")).toBeNull();
  },
);

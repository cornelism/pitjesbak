import { describe, expect, it } from "vitest";
import type { DetectedDie } from "../dice-types";
import { motionFrame } from "../__fixtures__/motion-frames";
import { createDiceRemovalTracker } from "./dice-removal";
import { captureTable } from "./clear-table";

const dice: DetectedDie[] = [80, 180, 280].map((x) => ({ value: 4, x, y: 120, width: 30, height: 30 }));
const empty = motionFrame([]);
const roll = motionFrame(dice);
const hand = motionFrame([{ value: 1, x: 60, y: 70, width: 300, height: 150 }]);

describe("clear-table evidence", () => {
  const clear = captureTable(roll, dice);
  it("requires table pixels at every previous die, even when pip recognition fails", () => {
    expect(clear(roll)).toBe(false);
    expect(clear(motionFrame(dice.slice(0, 1)))).toBe(false);
    expect(clear(empty)).toBe(true);
  });
  it("rejects a still hand and an unread die moved to a different part of the camera", () => {
    expect(clear(hand)).toBe(false);
    expect(clear(motionFrame([{ ...dice[0], x: 500, y: 300, width: 14, height: 14 }]))).toBe(false);
  });
  it("waits for a hand away from the old dice positions to leave the field", () => {
    expect(clear(motionFrame([{ ...dice[0], x: 450, y: 250, width: 80, height: 100 }]))).toBe(false);
  });
  it("compensates for moderate exposure changes without treating a covered lens as an empty table", () => {
    expect(clear(motionFrame([], 25))).toBe(true);
    expect(clear(motionFrame(dice, 25))).toBe(false);
    expect(clear(motionFrame([], -40))).toBe(false);
    expect(clear(motionFrame([], 80))).toBe(false);
  });
  it("rejects changes in camera dimensions and missing references", () => {
    expect(clear({ ...empty, width: 320 })).toBe(false);
    expect(captureTable(empty, [])(empty)).toBe(false);
  });
  it("allows a die's cast shadow to disappear when those pixels become table again", () => {
    const shadowed = motionFrame(dice);
    for (let y = 150; y < 185; y++) {
      for (let x = 95; x < 135; x++) shadowed.data.set([0, 0, 0, 255], (y * shadowed.width + x) * 4);
    }
    const clearShadowed = captureTable(shadowed, dice);
    expect(clearShadowed(empty)).toBe(true);
    expect(clearShadowed(motionFrame([{ ...dice[0], x: 110, y: 155 }]))).toBe(false);
  });
  it("ignores movement beyond the tray while still checking the whole connected table", () => {
    function trayFrame(objects: readonly DetectedDie[], outsideChanged = false) {
      const frame = motionFrame(objects);
      // A dark tray rim separates the playing surface from the desk above it.
      for (let y = 0; y < 80; y++) {
        for (let x = 0; x < frame.width; x++) {
          const color = y >= 60 ? 0 : outsideChanged ? 180 : 40;
          frame.data.set([color, color, color, 255], (y * frame.width + x) * 4);
        }
      }
      return frame;
    }
    const tableClear = captureTable(trayFrame(dice), dice);
    expect(tableClear(trayFrame([], true))).toBe(true);
    // An unread die, including one outside a centered digital crop, must veto removal.
    expect(tableClear(trayFrame([{ ...dice[0], x: 520, y: 300 }], true))).toBe(false);
    expect(tableClear(trayFrame([{ ...dice[0], x: 450, y: 250, width: 80, height: 100 }], true))).toBe(false);
  });
});

describe("all dice removed", () => {
  function tracker() {
    const result = createDiceRemovalTracker();
    result.capture(roll, dice);
    return result;
  }
  it("requires movement, a clear table and two uninterrupted seconds of absence", () => {
    const track = tracker();
    for (let now = 0; now <= 2500; now += 250) expect(track.update(roll, 0, now)).toBe(false);
    for (let now = 2750; now <= 5500; now += 250) expect(track.update(hand, 0, now)).toBe(false);
    for (let now = 5750; now < 7750; now += 250) expect(track.update(empty, 0, now)).toBe(false);
    expect(track.update(empty, 0, 7749)).toBe(false);
    expect(track.update(empty, 0, 7750)).toBe(true);
    expect(track.update(empty, 0, 8000)).toBe(false);
  });
  it("never triggers before a roll is captured", () => {
    const track = createDiceRemovalTracker();
    for (let now = 0; now <= 3000; now += 250) expect(track.update(empty, 0, now)).toBe(false);
  });
  it.each(["recognized die", "unread die", "hand"])("restarts the absence timer when a %s interrupts it", (interruption) => {
    const track = tracker();
    for (let now = 0; now <= 1500; now += 250) expect(track.update(empty, 0, now)).toBe(false);
    const image = interruption === "hand" ? hand : motionFrame(dice.slice(0, 1));
    expect(track.update(image, interruption === "recognized die" ? 1 : 0, 1750)).toBe(false);
    for (let now = 2000; now < 4000; now += 250) expect(track.update(empty, 0, now)).toBe(false);
    expect(track.update(empty, 0, 4000)).toBe(true);
  });
  it("does not count time while the camera or tab is paused", () => {
    const track = tracker();
    expect(track.update(empty, 0, 0)).toBe(false);
    expect(track.update(empty, 0, 5000)).toBe(false);
    for (let now = 5250; now < 7000; now += 250) expect(track.update(empty, 0, now)).toBe(false);
    expect(track.update(empty, 0, 7000)).toBe(true);
  });
  it("can arm again for the next roll", () => {
    const track = tracker();
    for (let now = 0; now < 2000; now += 250) track.update(empty, 0, now);
    expect(track.update(empty, 0, 2000)).toBe(true);
    track.capture(roll, dice);
    for (let now = 2250; now < 4250; now += 250) expect(track.update(empty, 0, now)).toBe(false);
    expect(track.update(empty, 0, 4250)).toBe(true);
  });
});

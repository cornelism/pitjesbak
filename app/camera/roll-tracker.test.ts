import { describe, expect, it } from "vitest";
import type { DetectedDie, DieValue } from "./dice-types";
import { createRollTracker } from "./roll-tracker";

function roll(values: DieValue[] = [2, 4, 6], offset = 0): DetectedDie[] {
  return values.map((value, index) => ({ value, x: index * 80 + offset, y: 40, width: 50, height: 50 }));
}

describe("roll tracker", () => {
  it("logs a complete settled roll once", () => {
    const track = createRollTracker(3);
    expect(track(roll(), 0)).toBeNull();
    expect(track(roll(), 500)).toBeNull();
    expect(track(roll(), 900)).toEqual([2, 4, 6]);
    expect(track(roll(), 2000)).toBeNull();
    expect(track(roll(), 10000)).toBeNull();
  });

  it("requires the selected count and stable values", () => {
    const track = createRollTracker(3);
    track(roll([2, 4]), 0);
    expect(track(roll([2, 4]), 2000)).toBeNull();
    track(roll(), 2200);
    expect(track(roll([1, 4, 6]), 2900)).toBeNull();
    expect(track(roll([1, 4, 6]), 3800)).toEqual([1, 4, 6]);
  });

  it("does not log rolling dice whose positions keep changing", () => {
    const track = createRollTracker(3);
    for (let time = 0; time <= 2000; time += 100) {
      expect(track(roll([2, 4, 6], time / 10), time)).toBeNull();
    }
  });

  it("tolerates small jitter, detection order changes, and a brief dropout", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    expect(track(roll([2, 4, 6], 2).reverse(), 900)).toEqual([6, 4, 2]);
    track([], 1000);
    track(roll(), 1160);
    expect(track(roll(), 2200)).toBeNull();
  });

  it("logs the same values again after dice are removed and thrown again", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    expect(track(roll(), 900)).toEqual([2, 4, 6]);
    track([], 1000);
    track([], 1500);
    track(roll(), 1600);
    expect(track(roll(), 2500)).toEqual([2, 4, 6]);
  });

  it("rearms after sustained movement even when the values stay the same", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    track(roll(), 900);
    track(roll([2, 4, 6], 30), 1000);
    track(roll([2, 4, 6], 50), 1500);
    expect(track(roll([2, 4, 6], 50), 2400)).toEqual([2, 4, 6]);
  });
});

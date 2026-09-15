import { describe, expect, it } from "vitest";
import type { DetectedDie, DieValue } from "./dice-types";
import { createRollTracker } from "./roll-tracker";

function roll(values: DieValue[] = [2, 4, 6], offset = 0): DetectedDie[] {
  return values.map((value, index) => ({ value, x: index * 80 + offset, y: 40, width: 50, height: 50 }));
}

function recover(track: ReturnType<typeof createRollTracker>, dice = roll(), start = 1000) {
  for (let i = 0; i < 9; i++) {
    const state = track(dice, start + i * 160);
    expect(state.roll).toBeNull();
    expect(state.recovering).toBe(true);
    expect(state.matchingAttempts).toBe(i + 1);
  }
  return track(dice, start + 9 * 160);
}

describe("roll tracker", () => {
  it("keeps normal confirmation speed for steady readings and logs once", () => {
    const track = createRollTracker(3);
    expect(track(roll(), 0).roll).toBeNull();
    expect(track(roll(), 500).recovering).toBe(false);
    expect(track(roll(), 900).roll).toEqual([2, 4, 6]);
    expect(track(roll(), 2000).roll).toBeNull();
  });

  it("requires ten matching attempts after stationary values flicker", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    expect(recover(track).roll).toEqual([2, 4, 6]);
  });

  it("does not substitute elapsed time for ten attempts while recovering", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i < 10; i++) expect(track(roll(), i * 1000).roll).toBeNull();
    expect(track(roll(), 10000).roll).toEqual([2, 4, 6]);
  });

  it.each(([[], [2, 4], [2, 4, 6, 1]] satisfies DieValue[][]).map((values) => ({ values })))("restarts recovery after a wrong dice count $values", ({ values }) => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i <= 9; i++) track(roll(), i * 160);
    expect(track(roll(values), 1600).matchingAttempts).toBe(0);
    expect(recover(track, roll(), 1760).roll).toEqual([2, 4, 6]);
  });

  it("compares individual values, not just the total", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    expect(recover(track, roll([3, 3, 6])).roll).toEqual([3, 3, 6]);
  });

  it("never confirms continuously alternating values", () => {
    const track = createRollTracker(3);
    for (let i = 0; i < 40; i++) {
      const state = track(roll(i % 2 ? [2, 4, 6] : [2, 4, 4]), i * 160);
      expect(state.roll).toBeNull();
      expect(state.confirmedDice).toEqual([]);
    }
  });

  it("tolerates small jitter and detection order changes", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    expect(track(roll([2, 4, 6], 2).reverse(), 900).roll).toEqual([2, 4, 6]);
  });

  it("holds confirmed markers through brief dropouts and wrong values without logging again", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    const confirmed = track(roll(), 900).confirmedDice;
    for (const [dice, now] of [[[], 1000], [roll([2, 4, 4]), 1160], [roll(), 1320]] as const) {
      const state = track(dice, now);
      expect(state.confirmedDice).toEqual(confirmed);
      expect(state.roll).toBeNull();
    }
    expect(track(roll(), 3000).roll).toBeNull();
  });

  it("clears markers after sustained removal and uses normal speed on the next steady roll", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    track(roll(), 900);
    track([], 1000);
    expect(track([], 1500).confirmedDice).toEqual([]);
    expect(track(roll(), 1600).recovering).toBe(false);
    expect(track(roll(), 2500).roll).toEqual([2, 4, 6]);
  });

  it("does not confirm moving dice and rearms when the same values move", () => {
    const track = createRollTracker(3);
    for (let time = 0; time <= 2000; time += 100) expect(track(roll([2, 4, 6], time / 10), time).roll).toBeNull();
    expect(track(roll([2, 4, 6], 200), 2900).roll).toEqual([2, 4, 6]);
    track(roll([2, 4, 6], 250), 3100);
    expect(track(roll([2, 4, 6], 280), 3600).confirmedDice).toEqual([]);
    expect(track(roll([2, 4, 6], 280), 4500).roll).toEqual([2, 4, 6]);
  });
});

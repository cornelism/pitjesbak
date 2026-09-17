import { describe, expect, it } from "vitest";
import type { DetectedDie, DieValue } from "../dice-types";
import { createRollTracker } from "./roll-tracker";

function roll(values: DieValue[] = [2, 4, 6], offset = 0): DetectedDie[] {
  return values.map((value, index) => ({ value, x: index * 80 + offset, y: 40, width: 50, height: 50 }));
}

function recover(track: ReturnType<typeof createRollTracker>, dice = roll(), start = 1000) {
  for (let i = 0; i < 5; i++) {
    const state = track(dice, start + i * 160);
    expect(state.roll).toBeNull();
    expect(state.recovering).toBe(true);
    expect(state.matchingAttempts).toBe(i + 1);
  }
  return track(dice, start + 5 * 160);
}

describe("roll tracker", () => {
  it("confirms the first complete reading when stabilization is disabled", () => {
    const track = createRollTracker(3, false);
    const state = track(roll(), 0);
    expect(state.roll).toEqual([2, 4, 6]);
    expect(state.confirmedDice).toEqual(roll());
    expect(state.recovering).toBe(false);
    expect(track(roll(), 160).roll).toBeNull();
  });

  it("still requires the requested dice count with stabilization disabled", () => {
    const track = createRollTracker(3, false);
    for (const values of [[], [2, 4], [2, 4, 6, 1]] satisfies DieValue[][]) {
      expect(track(roll(values), 0).roll).toBeNull();
    }
    expect(track(roll(), 160).roll).toEqual([2, 4, 6]);
  });

  it("keeps immediate confirmations frozen until sustained motion starts a new roll", () => {
    const track = createRollTracker(3, false);
    const confirmed = track(roll(), 0).confirmedDice;
    expect(track(roll([1, 1, 1]), 160).confirmedDice).toBe(confirmed);
    expect(track(roll([1, 1, 1], 80), 320, true).roll).toBeNull();
    expect(track(roll([1, 1, 1], 80), 720, true).roll).toEqual([1, 1, 1]);
  });

  it("keeps normal confirmation speed for steady readings and logs once", () => {
    const track = createRollTracker(3);
    expect(track(roll(), 0).roll).toBeNull();
    expect(track(roll(), 500).recovering).toBe(false);
    expect(track(roll(), 900).roll).toEqual([2, 4, 6]);
    expect(track(roll(), 2000).roll).toBeNull();
  });

  it("waits for a full recovery window after stationary values flicker", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    expect(recover(track).roll).toEqual([2, 4, 6]);
  });

  it("does not substitute elapsed time for six attempts while recovering", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i < 6; i++) expect(track(roll(), i * 1000).roll).toBeNull();
    expect(track(roll(), 6000).roll).toEqual([2, 4, 6]);
  });

  it.each(([[], [2, 4], [2, 4, 6, 1]] satisfies DieValue[][]).map((values) => ({ values })))("tolerates one wrong dice count $values in the recovery window", ({ values }) => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i <= 5; i++) track(roll(), i * 160);
    expect(track(roll(values), 960).roll).toBeNull();
    expect(track(roll(), 1120).roll).toEqual([2, 4, 6]);
  });

  it("confirms a five-of-six majority despite one isolated misread", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i <= 6; i++) {
      const state = track(roll(i === 4 ? [2, 4, 4] : [2, 4, 6]), i * 160);
      expect(state.roll).toEqual(i === 6 ? [2, 4, 6] : null);
    }
  });

  it("does not confirm when two of six readings disagree", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i <= 30; i++) {
      expect(track(roll(i % 6 < 2 ? [2, 4, 4] : [2, 4, 6]), i * 160).roll).toBeNull();
    }
  });

  it("expires old votes instead of accumulating agreement across attempts", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i <= 5; i++) track(roll(), i * 160);
    for (let i = 6; i <= 8; i++) expect(track([], i * 160).roll).toBeNull();
    expect(track(roll(), 1440).roll).toBeNull();
  });

  it("waits for the current reading to agree with the majority", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i <= 5; i++) track(roll(), i * 160);
    expect(track(roll([2, 4, 4]), 960).roll).toBeNull();
    expect(track(roll(), 1120).roll).toEqual([2, 4, 6]);
  });

  it("does not mistake accumulating small movements for stationary jitter", () => {
    const track = createRollTracker(3);
    for (let i = 0; i < 40; i++) {
      expect(track(roll([2, 4, 6], i * 2), i * 160).roll).toBeNull();
    }
  });

  it("tolerates minor box shifts and size changes while settling and after confirmation", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    const jitter = roll([2, 4, 6], 5).map((die) => ({ ...die, width: 54, height: 46 }));
    expect(track(jitter, 900).roll).toEqual([2, 4, 6]);
    const confirmed = track(jitter, 1000).confirmedDice;
    expect(track(roll(), 1600).confirmedDice).toBe(confirmed);
    expect(track(roll(), 2200).confirmedDice).toBe(confirmed);
  });

  it("discards recovery votes when dice move to a new position", () => {
    const track = createRollTracker(3);
    track(roll([2, 4, 4]), 0);
    for (let i = 1; i <= 5; i++) track(roll(), i * 160);
    expect(track(roll([2, 4, 6], 80), 1600).roll).toBeNull();
    expect(track(roll([2, 4, 6], 80), 2500).roll).toEqual([2, 4, 6]);
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

  it("freezes confirmed values and geometry despite stationary misreads and jitter", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    const confirmed = track(roll(), 900).confirmedDice;
    for (let i = 0; i < 30; i++) {
      const state = track(roll([2, 4, 4], i % 2 ? 2 : 0), 1000 + i * 160);
      expect(state.confirmedDice).toBe(confirmed);
      expect(state.roll).toBeNull();
      expect(state.recovering).toBe(false);
    }
  });

  it("requires sustained movement independently of stationary misreads", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    const confirmed = track(roll(), 900).confirmedDice;
    track(roll([2, 4, 4]), 1000);
    expect(track(roll([2, 4, 4], 80), 2000, true).confirmedDice).toBe(confirmed);
    track(roll([2, 4, 4]), 2200);
    expect(track(roll([2, 4, 4], 80), 2400, true).confirmedDice).toBe(confirmed);
    expect(track(roll([2, 4, 4], 80), 2800, true).confirmedDice).toEqual([]);
    expect(track(roll([2, 4, 4], 80), 3700).roll).toEqual([2, 4, 4]);
  });

  it("clears markers after sustained removal and uses normal speed on the next steady roll", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    track(roll(), 900);
    track([], 1000, true);
    expect(track([], 1500, true).confirmedDice).toEqual([]);
    expect(track(roll(), 1600).recovering).toBe(false);
    expect(track(roll(), 2500).roll).toEqual([2, 4, 6]);
  });

  it("does not confirm moving dice and rearms when the same values move", () => {
    const track = createRollTracker(3);
    for (let time = 0; time <= 2000; time += 100) expect(track(roll([2, 4, 6], time / 10), time).roll).toBeNull();
    expect(track(roll([2, 4, 6], 200), 2900).roll).toEqual([2, 4, 6]);
    track(roll([2, 4, 6], 250), 3100, true);
    expect(track(roll([2, 4, 6], 280), 3600, true).confirmedDice).toEqual([]);
    expect(track(roll([2, 4, 6], 280), 4500).roll).toEqual([2, 4, 6]);
  });

  it("keeps confirmation through prolonged recognition dropouts without camera motion", () => {
    const track = createRollTracker(3);
    track(roll(), 0);
    const confirmed = track(roll(), 900).confirmedDice;
    for (let i = 0; i < 60; i++) {
      const state = track(i % 2 ? [] : roll([1, 1, 1], 30), 1000 + i * 160, false);
      expect(state.confirmedDice).toBe(confirmed);
      expect(state.recovering).toBe(false);
      expect(state.roll).toBeNull();
    }
  });
});

import { describe, expect, it } from "vitest";
import type { DetectedDie } from "../dice-types";
import { motionFrame } from "../__fixtures__/motion-frames";
import { createRollMotionTracker } from "./roll-motion";

const dice: DetectedDie[] = [{ value: 6, x: 80, y: 40, width: 50, height: 50 }];

describe("camera motion around a confirmed roll", () => {
  it("waits for a confirmed reference", () => {
    expect(createRollMotionTracker().hasMoved(motionFrame(dice))).toBe(false);
  });

  it("ignores static pixels, minor shifts and exposure changes", () => {
    const motion = createRollMotionTracker();
    motion.capture(motionFrame(dice), dice);
    expect(motion.hasMoved(motionFrame(dice))).toBe(false);
    expect(motion.hasMoved(motionFrame(dice, 40))).toBe(false);
    expect(motion.hasMoved(motionFrame(dice.map((die) => ({ ...die, x: die.x + 2 }))))).toBe(false);
  });

  it("detects removal even when recognition cannot return any dice", () => {
    const motion = createRollMotionTracker();
    motion.capture(motionFrame(dice), dice);
    expect(motion.hasMoved(motionFrame([]))).toBe(true);
  });

  it("detects movement against the confirmed position, not just the previous frame", () => {
    const motion = createRollMotionTracker();
    motion.capture(motionFrame(dice), dice);
    const moved = motionFrame(dice.map((die) => ({ ...die, x: die.x + 40 })));
    expect(motion.hasMoved(moved)).toBe(true);
    expect(motion.hasMoved(moved)).toBe(true);
  });

  it("ignores movement away from the dice", () => {
    const motion = createRollMotionTracker();
    motion.capture(motionFrame(dice), dice);
    const elsewhere: DetectedDie = { value: 1, x: 400, y: 300, width: 80, height: 80 };
    expect(motion.hasMoved(motionFrame([...dice, elsewhere]))).toBe(false);
  });

  it("replaces the reference when the next roll is confirmed", () => {
    const motion = createRollMotionTracker();
    motion.capture(motionFrame(dice), dice);
    const next = dice.map((die) => ({ ...die, x: die.x + 80 }));
    motion.capture(motionFrame(next), next);
    expect(motion.hasMoved(motionFrame(next))).toBe(false);
    expect(motion.hasMoved(motionFrame([]))).toBe(true);
  });
});

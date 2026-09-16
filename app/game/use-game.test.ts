import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as scoring from "./scoring";
import { useGame } from "./use-game";

afterEach(cleanup);

describe("game turn state", () => {
  it("requires confirmation for a triple before its points can be banked", () => {
    vi.spyOn(scoring, "roll").mockReturnValueOnce([3, 3, 3]).mockReturnValueOnce([6, 5, 1]);
    const { result } = renderHook(useGame);
    act(() => result.current.rollTheDice());
    expect(result.current.pointsToConfirm).toBe(1000);
    expect(result.current.needsConfirmation).toBe(true);
    expect(result.current.canTakePoints).toBe(false);
    act(() => result.current.rollTheDice());
    expect(result.current.currentScore).toBe(1150);
    expect(result.current.pointsToConfirm).toBe(0);
    expect(result.current.canTakePoints).toBe(true);
    act(() => result.current.cashOut());
    expect(result.current.score).toBe(1150);
    expect(result.current.currentScore).toBe(0);
    expect(result.current.canTakePoints).toBe(false);
  });

  it("holds points below the initial banking threshold", () => {
    vi.spyOn(scoring, "roll").mockReturnValue([6, 5, 1]);
    const { result } = renderHook(useGame);
    act(() => result.current.rollTheDice());
    expect(result.current.currentScore).toBe(150);
    expect(result.current.canTakePoints).toBe(false);
  });

  it("ends an invalid turn and resets the next player's turn", () => {
    vi.spyOn(scoring, "roll").mockReturnValueOnce([6, 5, 1]).mockReturnValueOnce([6, 3, 2]);
    const { result } = renderHook(useGame);
    act(() => result.current.rollTheDice());
    act(() => result.current.rollTheDice());
    expect(result.current.isGameOver).toBe(true);
    act(() => result.current.resetGame());
    expect(result.current.isGameOver).toBe(false);
    expect(result.current.currentScore).toBe(0);
    expect(result.current.pointsToConfirm).toBe(0);
    expect(result.current.multiplier).toBe(1);
    expect(result.current.dice).toEqual([1, 1, 1]);
  });
});

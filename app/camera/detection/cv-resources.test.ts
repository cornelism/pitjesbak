import { describe, expect, it, vi } from "vitest";
import { withCvResources } from "./cv-resources";

describe("OpenCV resource ownership", () => {
  it("releases resources in reverse order after returning the result", () => {
    const released: string[] = [];
    const result = withCvResources((own) => {
      own({ delete: () => released.push("source") });
      const mask = own({ pixels: 42, delete: () => released.push("mask") });
      expect(released).toEqual([]);
      return mask.pixels;
    });
    expect(result).toBe(42);
    expect(released).toEqual(["mask", "source"]);
  });

  it("releases allocated memory when a later operation fails", () => {
    const release = vi.fn();
    const failure = new Error("OpenCV failed");
    expect(() => withCvResources((own) => {
      own({ delete: release });
      throw failure;
    })).toThrow(failure);
    expect(release).toHaveBeenCalledOnce();
  });
});

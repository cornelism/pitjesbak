import { describe, expect, it } from "vitest";
import { projectTopFace } from "./top-face";

function rectangle(width: number, height: number) {
  const cols = width + 20;
  const data = new Uint8Array(cols * (height + 20));
  for (let y = 10; y < height + 10; y++) data.fill(255, y * cols + 10, y * cols + 10 + width);
  return { silhouette: { data, cols }, bounds: { x: 10, y: 10, width, height } };
}

describe("top-face projection", () => {
  it("preserves the whole overhead face and maps its center into a unit square", () => {
    const { silhouette, bounds } = rectangle(20, 20);
    const face = projectTopFace(silhouette, bounds, 0)!;
    expect(face.completeFace).toBe(true);
    expect(face.visibleSides).toBe(false);
    expect(face.mask.every((pixel) => pixel === 1)).toBe(true);
    const center = face.rectify([9.5, 9.5]);
    expect(center[0]).toBeCloseTo(0.5);
    expect(center[1]).toBeCloseTo(0.5);
  });

  it("cuts the lower side from a tall cube at 45 degrees", () => {
    const { silhouette, bounds } = rectangle(20, 30);
    const face = projectTopFace(silhouette, bounds, Math.PI / 4)!;
    expect(face.completeFace).toBe(false);
    expect(face.visibleSides).toBe(true);
    expect(face.mask[13 * 20 + 10]).toBe(1);
    expect(face.mask[14 * 20 + 10]).toBe(0);
    const center = face.rectify([9.5, 9.5 * Math.SQRT1_2]);
    expect(center[0]).toBeCloseTo(0.5);
    expect(center[1]).toBeCloseTo(0.5);
  });

  it("does not cut a second strip from an already isolated slanted top", () => {
    const { silhouette, bounds } = rectangle(20, 14);
    const face = projectTopFace(silhouette, bounds, Math.PI / 4)!;
    expect(face.completeFace).toBe(true);
    expect(face.visibleSides).toBe(false);
    expect(face.mask.every((pixel) => pixel === 1)).toBe(true);
  });

  it("rejects an empty overhead silhouette", () => {
    const { silhouette, bounds } = rectangle(20, 20);
    silhouette.data.fill(0);
    expect(projectTopFace(silhouette, bounds, 0)).toBeNull();
  });
});

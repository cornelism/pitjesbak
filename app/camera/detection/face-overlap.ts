import type { FaceBounds } from "./top-face";

function intersectionArea(a: FaceBounds, b: FaceBounds): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

/** Axis-aligned boxes around adjacent rounded dice may share a small corner. */
export function overlapsDie(a: FaceBounds, b: FaceBounds): boolean {
  const sharedArea = intersectionArea(a, b);
  return sharedArea > 0 && sharedArea >= Math.min(a.width * a.height, b.width * b.height) * 0.25;
}

/** A detail pass must still locate substantially the same complete face. */
export function sameFace(a: FaceBounds, b: FaceBounds): boolean {
  const sharedArea = intersectionArea(a, b);
  return sharedArea > 0 && sharedArea >= Math.max(a.width * a.height, b.width * b.height) * 0.7;
}

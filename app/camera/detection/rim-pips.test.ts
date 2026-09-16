// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { loadTestOpenCv } from "./__test-helpers__/opencv";
import { readRimTop, sameRimTop } from "./rim-pips";
import { withCvResources } from "./cv-resources";

let cv: typeof OpenCv;
beforeAll(async () => { ({ cv } = await loadTestOpenCv()); });

function rimFace(variant: "five" | "missing" | "extra", enclosed = 3) {
  return withCvResources((own) => {
    const mask = own(cv.Mat.zeros(40, 40, cv.CV_8UC1));
    for (let y = 4; y < 32; y++) mask.data.fill(255, y * 40 + 4, y * 40 + 34);
    const dots = [[11, 5], [25, 5], [18, 9], [11, 13], [25, 13]];
    if (variant === "missing") dots.pop();
    if (variant === "extra") dots.push([18, 13]);
    for (const [cx, cy] of dots) {
      for (let y = cy - 1; y <= cy + 1; y++) mask.data.fill(0, y * 40 + cx - 1, y * 40 + cx + 2);
    }
    // The front side has a much larger dark pip, separate from the top plane.
    for (let y = 24; y < 29; y++) mask.data.fill(0, y * 40 + 14, y * 40 + 22);
    const contours = own(new cv.MatVector()), hierarchy = own(new cv.Mat());
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
    const contour = own(contours.get(0));
    const before = new Uint8Array(mask.data);
    const value = readRimTop(cv, mask, contour, cv.boundingRect(contour), enclosed);
    expect(mask.data).toEqual(before);
    return value;
  });
}

describe("readRimTop", () => {
  it("reads five with two open rear notches without counting the front-side pip", () => {
    expect(rimFace("five")).toBe(5);
  });
  it("rejects a missing corner instead of inventing the fifth pip", () => {
    expect(rimFace("missing")).toBeNull();
  });
  it("rejects an extra top mark instead of selecting a convenient five", () => {
    expect(rimFace("extra")).toBeNull();
  });
  it("requires at least three enclosed pips as supporting evidence", () => {
    expect(rimFace("five", 2)).toBeNull();
  });
  it("requires the recovered pattern to contain additional pips", () => {
    expect(rimFace("five", 5)).toBeNull();
  });
});

describe("sameRimTop", () => {
  const cube = { x: 30, y: 40, width: 25, height: 25 };
  it("matches a shorter top mask when the retry also retains the cube sides", () => {
    expect(sameRimTop({ x: 31, y: 41, width: 23, height: 12 }, cube)).toBe(true);
  });
  it.each([
    { x: 60, y: 41, width: 23, height: 12 },
    { x: 31, y: 55, width: 23, height: 12 },
    { x: 31, y: 30, width: 23, height: 12 },
    { x: 37, y: 41, width: 10, height: 8 },
    { x: 20, y: 41, width: 45, height: 12 },
  ])("rejects a different region: %j", (bounds) => {
    expect(sameRimTop(bounds, cube)).toBe(false);
  });
});

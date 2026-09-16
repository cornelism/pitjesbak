// @vitest-environment node
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { loadTestOpenCv } from "./__test-helpers__/opencv";
import { readRimThree, readRimTop, sameRimTop } from "./rim-pips";
import { withCvResources } from "./cv-resources";
import type { Pip } from "./types";

let cv: typeof OpenCv;
beforeAll(async () => { ({ cv } = await loadTestOpenCv()); });

function rimFace(variant: "five" | "missing" | "extra" | "sliver" | "flat" | "outline", enclosed = 3) {
  return withCvResources((own) => {
    const mask = own(cv.Mat.zeros(40, 40, cv.CV_8UC1));
    for (let y = 4; y < 32; y++) mask.data.fill(255, y * 40 + 4, y * 40 + 34);
    const dots = [[11, 5], [25, 5], [18, 9], [11, 13], [25, 13]];
    if (variant === "missing") dots.pop();
    if (variant === "extra") dots.push([18, 13]);
    for (const [cx, cy] of dots) {
      if (variant === "flat" && cy === 5) {
        mask.data.fill(0, 5 * 40 + cx - 3, 5 * 40 + cx + 4);
        continue;
      }
      for (let y = cy - 1; y <= cy + 1; y++) mask.data.fill(0, y * 40 + cx - 1, y * 40 + cx + 2);
    }
    if (variant === "sliver") {
      for (let y = 9; y < 13; y++) mask.data[y * 40 + 4] = 0;
    }
    if (variant === "outline") mask.data.fill(0, 4 * 40 + 17, 4 * 40 + 20);
    // The front side has a much larger dark pip, separate from the top plane.
    for (let y = 24; y < 29; y++) mask.data.fill(0, y * 40 + 14, y * 40 + 22);
    const contours = own(new cv.MatVector()), hierarchy = own(new cv.Mat());
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
    const contour = own(contours.get(0));
    const before = new Uint8Array(mask.data);
    const value = readRimTop(cv, mask, contour, cv.boundingRect(contour), enclosed, Math.PI / 4);
    expect(mask.data).toEqual(before);
    return value;
  });
}

describe("readRimTop", () => {
  it.each(["bridge", "missing", "extra", "solid"] as const)("validates dark pip centers in a six with %s", (variant) => {
    withCvResources((own) => {
      const gray = own(new cv.Mat(40, 40, cv.CV_8UC1, new cv.Scalar(80)));
      for (let y = 4; y < 32; y++) gray.data.fill(200, y * 40 + 4, y * 40 + 34);
      const dots = [[11, 7], [25, 7], [11, 12], [25, 12], [11, 17], [25, 17]];
      if (variant === "missing") dots.pop();
      if (variant === "extra") dots.push([18, 12]);
      for (const [x, y] of dots) {
        for (let row = y - 1; row <= y + 1; row++) gray.data.fill(10, row * 40 + x - 1, row * 40 + x + 2);
      }
      for (let y = 9; y <= 10; y++) gray.data[y * 40 + 25] = variant === "solid" ? 10 : 60;
      for (let y = 24; y < 29; y++) gray.data.fill(10, y * 40 + 14, y * 40 + 22);
      const mask = own(new cv.Mat());
      cv.threshold(gray, mask, 100, 255, cv.THRESH_BINARY);
      const contours = own(new cv.MatVector()), hierarchy = own(new cv.Mat());
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_NONE);
      const contour = own(contours.get(0));
      const bounds = cv.boundingRect(contour);
      const beforeGray = new Uint8Array(gray.data), beforeMask = new Uint8Array(mask.data);
      expect(readRimTop(cv, mask, contour, bounds, 5, Math.PI / 4)).toBeNull();
      expect(readRimTop(cv, mask, contour, bounds, 5, Math.PI / 4, gray)).toBe(variant === "bridge" ? 6 : null);
      expect(gray.data).toEqual(beforeGray);
      expect(mask.data).toEqual(beforeMask);
    });
  });

  it("reads five with two open rear notches without counting the front-side pip", () => {
    expect(rimFace("five")).toBe(5);
  });
  it("rejects a missing corner instead of inventing the fifth pip", () => {
    expect(rimFace("missing")).toBeNull();
  });
  it("rejects an extra top mark instead of selecting a convenient five", () => {
    expect(rimFace("extra")).toBeNull();
  });
  it("requires at least three enclosed pips to recover a larger pattern", () => {
    expect(rimFace("five", 2)).toBeNull();
  });
  it("requires the recovered pattern to contain additional pips", () => {
    expect(rimFace("five", 5)).toBeNull();
  });
  it("ignores a one-pixel-wide vertical outline fragment", () => {
    expect(rimFace("sliver")).toBe(5);
  });
  it("preserves one-pixel-high horizontal rim pips", () => {
    expect(rimFace("flat")).toBe(5);
  });
  it("ignores a horizontal fragment confined to the outer hull boundary", () => {
    expect(rimFace("outline")).toBe(5);
  });
});

describe("readRimThree", () => {
  const top: Pip[] = [
    { point: [11.5, 1.25], area: 9 },
    { point: [14.25, 4.5], area: 7 },
    { point: [17, 7.5], area: 6 },
  ];
  const side: Pip[] = [{ point: [24, 13], area: 13 }, { point: [10.5, 16], area: 69 }];
  const read = (pips: Pip[], angle = 70) => readRimThree(pips, 28, 21, angle * Math.PI / 180, 40);

  it.each([45, 50, 65, 70])("reads three measured rim pips above larger side marks at %i degrees", (angle) => {
    expect(read([...side, ...top].reverse(), angle)).toBe(3);
  });
  it("does not infer a missing third pip", () => {
    expect(read(top.slice(1))).toBeNull();
    expect(read([...top.slice(1), ...side])).toBeNull();
  });
  it("rejects uneven spacing", () => {
    expect(read([top[0], { ...top[1], point: [12, 2] }, top[2], ...side])).toBeNull();
  });
  it("rejects a triangular three", () => {
    expect(read([top[0], { ...top[1], point: [20, 4.5] }, top[2], ...side])).toBeNull();
  });
  it("rejects an additional mark in the top instead of choosing three", () => {
    expect(read([...top, { point: [20, 8], area: 7 }, ...side])).toBeNull();
  });
  it("rejects side marks that are too close to the top", () => {
    expect(read([...top, { point: [24, 9], area: 13 }])).toBeNull();
  });
  it("rejects oversized or inconsistent components", () => {
    expect(read(top.map((pip) => ({ ...pip, area: 41 })))).toBeNull();
    expect(read([{ ...top[0], area: 30 }, ...top.slice(1)])).toBeNull();
  });
  it("rejects a pattern on the lower side", () => {
    expect(read(top.map((pip) => ({ ...pip, point: [pip.point[0], pip.point[1] + 8] })))).toBeNull();
  });
  it.each([0, 90, NaN])("requires a usable tilted top projection (%s degrees)", (angle) => {
    expect(read(top, angle)).toBeNull();
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

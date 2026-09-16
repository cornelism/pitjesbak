// @vitest-environment node
import { loadTestOpenCv } from "./__test-helpers__/opencv";
import { beforeAll, describe, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { separateDice } from "./separate-dice";

let cv: typeof OpenCv;
beforeAll(async () => {
  ({ cv } = await loadTestOpenCv());
});

function touchingFaces(scale = 1, bridgeHeight = 4) {
  const width = Math.round(220 * scale), height = Math.round(200 * scale);
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x / scale, py = y / scale;
      const face = py >= 30 && py < 78 && ((px >= 30 && px < 78) || (px >= 94 && px < 142));
      const bridge = px >= 78 && px < 94 && Math.abs(py - 54) < bridgeHeight / 2;
      const pip = [[44, 44], [64, 64], [108, 44], [118, 54], [128, 64]]
        .some(([cx, cy]) => Math.hypot(px - cx, py - cy) < 4);
      if ((face || bridge) && !pip) pixels[y * width + x] = 255;
    }
  }
  return cv.matFromArray(height, width, cv.CV_8UC1, pixels);
}

describe("separateDice", () => {
  it.each([
    { scale: 0.75, bridgeHeight: 4 },
    { scale: 1, bridgeHeight: 4 },
    { scale: 1.5, bridgeHeight: 4 },
    { scale: 0.75, bridgeHeight: 18 },
    { scale: 1, bridgeHeight: 18 },
    { scale: 1.5, bridgeHeight: 18 },
  ])("separates a $bridgeHeight-pixel contact without filling pips at scale $scale", ({ scale, bridgeHeight }) => {
    const mask = touchingFaces(scale, bridgeHeight);
    const labels = new cv.Mat();
    try {
      separateDice(cv, mask);
      expect(cv.connectedComponents(mask, labels)).toBe(3); // background + two dice
      for (const [x, y] of [[44, 44], [64, 64], [108, 44], [118, 54], [128, 64]]) {
        expect(mask.data[Math.round(y * scale) * mask.cols + Math.round(x * scale)]).toBe(0);
      }
      const left = labels.data32S[Math.round(54 * scale) * mask.cols + Math.round(54 * scale)];
      const right = labels.data32S[Math.round(64 * scale) * mask.cols + Math.round(108 * scale)];
      expect(left).toBeGreaterThan(0);
      expect(right).toBeGreaterThan(0);
      expect(left).not.toBe(right);
    } finally {
      labels.delete();
      mask.delete();
    }
  });

  it("preserves an isolated face and its pips exactly", () => {
    const mask = touchingFaces();
    try {
      for (let y = 0; y < mask.rows; y++) mask.data.fill(0, y * mask.cols + 78, (y + 1) * mask.cols);
      const before = new Uint8Array(mask.data);
      separateDice(cv, mask);
      expect(mask.data).toEqual(before);
    } finally {
      mask.delete();
    }
  });

  it("leaves a broad connection unchanged when no clear split exists", () => {
    const mask = touchingFaces(1, 32);
    try {
      const before = new Uint8Array(mask.data);
      separateDice(cv, mask);
      expect(mask.data).toEqual(before);
    } finally {
      mask.delete();
    }
  });

  it("preserves unrelated foreground inside the candidate's bounding box", () => {
    const mask = cv.Mat.zeros(220, 220, cv.CV_8UC1);
    const labels = new cv.Mat();
    try {
      for (let y = 0; y < mask.rows; y++) {
        for (let x = 0; x < mask.cols; x++) {
          const left = x >= 30 && x < 78 && y >= 90 && y < 138;
          const right = x >= 94 && x < 142 && y >= 30 && y < 78;
          const bridge = x >= 75 && x <= 97 && Math.abs(y - (168 - x)) <= 3;
          const neighbor = x >= 34 && x < 54 && y >= 34 && y < 54;
          if (left || right || bridge || neighbor) mask.data[y * mask.cols + x] = 255;
        }
      }
      expect(cv.connectedComponents(mask, labels)).toBe(3);
      separateDice(cv, mask);
      expect(cv.connectedComponents(mask, labels)).toBe(4);
      for (let y = 34; y < 54; y++) {
        for (let x = 34; x < 54; x++) expect(mask.data[y * mask.cols + x]).toBe(255);
      }
    } finally {
      labels.delete();
      mask.delete();
    }
  });

  it.each([false, true])("splits rounded chains only when the cut avoids pips (pip on contact: %s)", (pipOnContact) => {
    const mask = cv.Mat.zeros(160, 200, cv.CV_8UC1);
    const labels = new cv.Mat();
    try {
      const centers = [45, 87, 129];
      for (let y = 0; y < mask.rows; y++) {
        for (let x = 0; x < mask.cols; x++) {
          const face = centers.some((cx) => Math.hypot(x - cx, y - 80) < 24);
          const pip = centers.some((cx) => Math.hypot(x - cx, y - 80) < 4)
            || (pipOnContact && Math.hypot(x - 66, y - 80) < 4);
          if (face && !pip) mask.data[y * mask.cols + x] = 255;
        }
      }
      const before = new Uint8Array(mask.data);
      expect(cv.connectedComponents(mask, labels)).toBe(2);
      separateDice(cv, mask);
      expect(cv.connectedComponents(mask, labels)).toBe(pipOnContact ? 2 : 4);
      if (pipOnContact) expect(mask.data).toEqual(before);
      for (const x of centers) expect(mask.data[80 * mask.cols + x]).toBe(0);
    } finally {
      labels.delete();
      mask.delete();
    }
  });

  it("accepts an empty camera mask", () => {
    const mask = cv.Mat.zeros(100, 100, cv.CV_8UC1);
    try {
      separateDice(cv, mask);
      expect(cv.countNonZero(mask)).toBe(0);
    } finally {
      mask.delete();
    }
  });
});

// @vitest-environment node
import { beforeAll, expect, it, vi } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { loadTestOpenCv } from "./__test-helpers__/opencv";
import { withCvResources } from "./cv-resources";
import { readDiceMask } from "./read-dice-mask";

let cv: typeof OpenCv;
beforeAll(async () => { ({ cv } = await loadTestOpenCv()); });

it("retains a small face with open rim notches for validation without reporting a value", () => {
  withCvResources((own) => {
    const mask = own(cv.Mat.zeros(100, 100, cv.CV_8UC1));
    for (let y = 20; y < 46; y++) mask.data.fill(255, y * 100 + 20, y * 100 + 56);
    // An open notch leaves no enclosed pip holes and less than 45% fill.
    for (let y = 20; y < 43; y++) mask.data.fill(0, y * 100 + 28, y * 100 + 48);
    const candidate = vi.fn();
    expect(readDiceMask(cv, mask, { cameraTilt: 65, onCandidate: candidate })).toEqual([]);
    expect(candidate).toHaveBeenCalledWith({ x: 20, y: 20, width: 36, height: 26 }, 0, true);
  });
});

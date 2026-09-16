// @vitest-environment node
import { beforeAll, expect, it } from "vitest";
import type * as OpenCv from "@techstark/opencv-js";
import { loadTestOpenCv } from "../detection/__test-helpers__/opencv";
import { withCvResources } from "../detection/cv-resources";
import { detectDiceOpenCv, type DiceCandidate } from "../detection/opencv-dice";
import { readDieCrops } from "./read-die-crops";

let cv: typeof OpenCv;
beforeAll(async () => { ({ cv } = await loadTestOpenCv()); });

it("recovers native six-pip detail lost when the overview is reduced to 640 pixels", () => {
  withCvResources((own) => {
    // Render at native resolution, not an enlargement of a low-resolution PNG.
    const source = own(new cv.Mat(1080, 1920, cv.CV_8UC4, new cv.Scalar(30, 60, 40, 255)));
    cv.rectangle(source, new cv.Point(600, 300), new cv.Point(671, 349), new cv.Scalar(220, 220, 220, 255), cv.FILLED);
    for (const x of [618, 654]) for (const y of [309, 325, 341]) {
      cv.circle(source, new cv.Point(x, y), 3, new cv.Scalar(10, 10, 10, 255), cv.FILLED);
    }
    const overview = own(new cv.Mat());
    cv.resize(source, overview, new cv.Size(640, 360), 0, 0, cv.INTER_AREA);
    let candidates: readonly DiceCandidate[] = [];
    const image = { width: 640, height: 360, data: new Uint8ClampedArray(overview.data) };
    const dice = detectDiceOpenCv(cv, image, 45, (found) => { candidates = found; });
    expect(dice).toEqual([]);
    expect(candidates.length).toBeGreaterThan(0);
    const result = readDieCrops(cv, {
      sourceSize: { width: 1920, height: 1080 }, overviewSize: image,
      cameraTilt: 45, zoom: 1, expectedCount: 1, dice, candidates,
      readCrop: ({ x, y, width, height }) => {
        const region = own(source.roi(new cv.Rect(x, y, width, height)));
        const contiguous = own(new cv.Mat());
        region.copyTo(contiguous);
        return { width, height, data: new Uint8ClampedArray(contiguous.data), colorSpace: "srgb" };
      },
    });
    expect(result.dice.map((die) => die.value)).toEqual([6]);
    expect(result.batch.crops[0]).toMatchObject({ overviewValue: null, cropValue: 6, used: true });
  });
});

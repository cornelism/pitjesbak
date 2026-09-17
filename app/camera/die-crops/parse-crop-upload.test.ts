// @vitest-environment node
import { expect, it } from "vitest";
import { parseCropUpload } from "./parse-crop-upload";
import { upload } from "./__test-helpers__/crop-upload";

it("rejects non-PNG data, mismatched dimensions, and out-of-frame crops", () => {
  const batch = upload();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], png: "../../anything" }] })).toThrow();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], source: { ...batch.crops[0].source, width: 5 } }] })).toThrow();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], source: { ...batch.crops[0].source, x: 1920 } }] })).toThrow();
});

it("rejects too many crops and invalid readings", () => {
  const batch = upload();
  expect(() => parseCropUpload({ ...batch, crops: Array(7).fill(batch.crops[0]) })).toThrow();
  expect(() => parseCropUpload({ ...batch, crops: [{ ...batch.crops[0], cropValue: 8 }] })).toThrow();
});

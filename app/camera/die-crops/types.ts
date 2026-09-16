import type { DetectedDie, DieValue } from "../dice-types";

export type CropBounds = Pick<DetectedDie, "x" | "y" | "width" | "height">;
export interface ImageSize { width: number; height: number }
export interface DieCrop {
  candidate: CropBounds;
  source: CropBounds;
  image: ImageData;
  overviewValue: DieValue | null;
  cropValue: DieValue | null;
  used: boolean;
  preprocessing: "raw" | "contrast";
}
export interface DieCropBatch {
  capturedAt: string;
  sourceSize: ImageSize;
  overviewSize: ImageSize;
  zoom: number;
  cameraTilt: number;
  crops: DieCrop[];
}

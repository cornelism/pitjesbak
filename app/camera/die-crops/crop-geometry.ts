import type { CropBounds, ImageSize } from "./types";

/** The overview is a centered digital crop of the camera's native frame. */
export function cropTransform(overview: ImageSize, source: ImageSize, zoom: number) {
  return {
    x: (source.width - source.width / zoom) / 2,
    y: (source.height - source.height / zoom) / 2,
    scaleX: source.width / (overview.width * zoom),
    scaleY: source.height / (overview.height * zoom),
  };
}

/** Include the sides and surrounding table; never enlarge the camera pixels. */
export function dieCropBounds(die: CropBounds, overview: ImageSize, source: ImageSize, zoom: number): CropBounds | null {
  if (![die.x, die.y, die.width, die.height, overview.width, overview.height, source.width, source.height, zoom].every(Number.isFinite)
    || die.width <= 0 || die.height <= 0 || overview.width <= 0 || overview.height <= 0
    || source.width <= 0 || source.height <= 0 || zoom < 1) return null;
  const transform = cropTransform(overview, source, zoom);
  const margin = Math.max(die.width, die.height);
  const left = Math.max(0, Math.floor(transform.x + (die.x - margin) * transform.scaleX));
  const top = Math.max(0, Math.floor(transform.y + (die.y - margin) * transform.scaleY));
  const right = Math.min(source.width, Math.ceil(transform.x + (die.x + die.width + margin) * transform.scaleX));
  const bottom = Math.min(source.height, Math.ceil(transform.y + (die.y + die.height + margin) * transform.scaleY));
  return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null;
}

export function cropToOverview(box: CropBounds, crop: CropBounds, overview: ImageSize, source: ImageSize, zoom: number): CropBounds {
  const transform = cropTransform(overview, source, zoom);
  return {
    x: (crop.x + box.x - transform.x) / transform.scaleX,
    y: (crop.y + box.y - transform.y) / transform.scaleY,
    width: box.width / transform.scaleX,
    height: box.height / transform.scaleY,
  };
}

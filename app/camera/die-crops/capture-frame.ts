import type { CropBounds, ImageSize } from "./types";

/** Freeze video once so slow recognition and all native crops share one frame. */
export function createCropFrameCapture() {
  const snapshot = document.createElement("canvas");
  return (video: HTMLVideoElement, overview: CanvasRenderingContext2D, size: ImageSize, zoom: number) => {
    if (snapshot.width !== video.videoWidth || snapshot.height !== video.videoHeight) {
      snapshot.width = video.videoWidth;
      snapshot.height = video.videoHeight;
    }
    const native = snapshot.getContext("2d", { willReadFrequently: true });
    if (!native) throw new Error("Camera snapshot unavailable");
    const capturedAt = new Date().toISOString();
    native.drawImage(video, 0, 0);
    const { width, height } = size;
    overview.drawImage(snapshot, 0, 0, width, height);
    const fullImage = overview.getImageData(0, 0, width, height);
    if (zoom > 1) {
      const sw = snapshot.width / zoom, sh = snapshot.height / zoom;
      overview.drawImage(snapshot, (snapshot.width - sw) / 2, (snapshot.height - sh) / 2, sw, sh, 0, 0, width, height);
    }
    return {
      capturedAt,
      fullImage,
      image: zoom > 1 ? overview.getImageData(0, 0, width, height) : fullImage,
      sourceSize: { width: snapshot.width, height: snapshot.height },
      readCrop: ({ x, y, width, height }: CropBounds) => native.getImageData(x, y, width, height),
    };
  };
}

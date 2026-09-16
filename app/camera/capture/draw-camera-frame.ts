import { cameraFrameSize } from "./frame-size";

/** Use the same centered crop for recognition and unannotated saved frames. */
export function drawCameraFrame(context: CanvasRenderingContext2D, video: HTMLVideoElement, zoom = 1) {
  const { width, height } = cameraFrameSize(video);
  if (zoom <= 1) {
    context.drawImage(video, 0, 0, width, height);
    return;
  }
  const sourceWidth = video.videoWidth / zoom;
  const sourceHeight = video.videoHeight / zoom;
  context.drawImage(video,
    (video.videoWidth - sourceWidth) / 2, (video.videoHeight - sourceHeight) / 2,
    sourceWidth, sourceHeight, 0, 0, width, height);
}

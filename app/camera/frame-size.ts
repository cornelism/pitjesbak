const MAX_FRAME_DIMENSION = 640;

/** Keep saved fixtures and live recognition at the same resolution, without upscaling. */
export function cameraFrameSize(video: Pick<HTMLVideoElement, "videoWidth" | "videoHeight">) {
  const scale = Math.min(1, MAX_FRAME_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
  return {
    width: Math.round(video.videoWidth * scale),
    height: Math.round(video.videoHeight * scale),
  };
}

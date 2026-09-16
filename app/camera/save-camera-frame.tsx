"use client";

import { useState, type RefObject } from "react";
import { cameraFrameSize } from "./frame-size";
import { drawCameraFrame } from "./draw-camera-frame";

export default function SaveCameraFrame({ videoRef, zoom = 1 }: {
  videoRef: RefObject<HTMLVideoElement | null>;
  zoom?: number;
}) {
  const [error, setError] = useState<string | null>(null);

  function saveFrame() {
    setError(null);
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError("Wait for the camera image before saving a frame.");
      return;
    }

    try {
      const frame = document.createElement("canvas");
      // Match the detector's input size and omit its labels so this PNG can be
      // replayed through recognition without the overlay changing the pixels.
      const { width, height } = cameraFrameSize(video);
      frame.width = width;
      frame.height = height;
      const context = frame.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      drawCameraFrame(context, video, zoom);
      const link = document.createElement("a");
      link.href = frame.toDataURL("image/png");
      link.download = "dice-camera-frame.png";
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
    } catch {
      setError("Could not save a frame. Take a screenshot of the camera preview instead.");
    }
  }

  return (
    <div>
      <button type="button" onClick={saveFrame} className="rounded-lg border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
        Save camera frame
      </button>
      {error && <p role="alert" className="mt-2 max-w-xs text-sm text-amber-300">{error}</p>}
    </div>
  );
}

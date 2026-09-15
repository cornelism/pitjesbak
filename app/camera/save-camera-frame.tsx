"use client";

import { useState, type RefObject } from "react";

export default function SaveCameraFrame({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
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
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      frame.width = Math.round(video.videoWidth * scale);
      frame.height = Math.round(video.videoHeight * scale);
      const context = frame.getContext("2d");
      if (!context) throw new Error("Canvas unavailable");
      context.drawImage(video, 0, 0, frame.width, frame.height);
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

"use client";

import { useState } from "react";
import CameraAngleGrid from "./camera-angle-grid";
import { MAX_CAMERA_ANGLE } from "../camera-angle";

interface CameraAngleControlProps {
  angle: number;
  onChange: (angle: number) => void;
}

/** Owns guide interactions. Render inside a positioned camera preview. */
export default function CameraAngleControl({ angle, onChange }: CameraAngleControlProps) {
  const [guide, setGuide] = useState({ revision: 0, dragging: false });

  function showGuide(dragging = guide.dragging) {
    setGuide((previous) => ({ revision: previous.revision + 1, dragging }));
  }

  return (
    <>
      {guide.revision > 0 && (
        <CameraAngleGrid
          key={guide.revision}
          angle={angle}
          dragging={guide.dragging}
          onFadeComplete={() => setGuide({ revision: 0, dragging: false })}
        />
      )}
      <label className="pointer-events-auto relative rounded-lg bg-black/80 px-3 py-2 text-xs text-white">
        <span className="mb-1 block">Camera angle: {angle}°</span>
        <input
          type="range"
          min="0"
          max={MAX_CAMERA_ANGLE}
          step="5"
          value={angle}
          aria-label="Camera angle from overhead"
          onFocus={() => showGuide()}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            showGuide(true);
          }}
          onPointerUp={() => showGuide(false)}
          onPointerCancel={() => showGuide(false)}
          onLostPointerCapture={() => showGuide(false)}
          onBlur={() => showGuide(false)}
          onChange={(event) => {
            onChange(Number(event.target.value));
            showGuide();
          }}
          className="block w-28 accent-emerald-400"
        />
      </label>
    </>
  );
}

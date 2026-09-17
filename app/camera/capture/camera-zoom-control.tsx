import type { CameraZoom } from "./camera-zoom";

interface CameraZoomControlProps {
  zoom: CameraZoom;
  pending: boolean;
  error: string | null;
  onChange: (value: number) => void;
}

export default function CameraZoomControl({ zoom, pending, error, onChange }: CameraZoomControlProps) {
  return (
    <>
      <label className="flex flex-wrap items-center gap-3 text-sm text-zinc-200">
        <span>Zoom: {(zoom.value / zoom.min).toFixed(1)}× ({zoom.mode})</span>
        <input
          type="range"
          aria-label="Camera zoom"
          min={zoom.min}
          max={zoom.max}
          step={zoom.step}
          value={zoom.value}
          disabled={pending}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-48 accent-emerald-400"
        />
      </label>
      {error && <p role="alert" className="mt-2 text-sm text-amber-300">{error}</p>}
    </>
  );
}

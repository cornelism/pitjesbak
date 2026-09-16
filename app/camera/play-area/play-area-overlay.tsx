import type { PlayArea } from "./play-area";

export default function PlayAreaOverlay({ area, zoom }: { area: PlayArea; zoom: number }) {
  return (
    <svg
      aria-label="Detected play area"
      role="img"
      viewBox={`0 0 ${area.width} ${area.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden"
      style={{ transform: `scale(${zoom})` }}
    >
      <path d={area.fill} fill="#38bdf8" fillOpacity="0.2" />
      <path d={area.outline} fill="none" stroke="#7dd3fc" strokeOpacity="0.8" strokeWidth="0.8" />
    </svg>
  );
}

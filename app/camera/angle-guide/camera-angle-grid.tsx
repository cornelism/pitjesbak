import { projectAngleGrid } from "./grid-projection";
import styles from "./camera-angle-grid.module.css";

interface CameraAngleGridProps {
  angle: number;
  dragging: boolean;
  onFadeComplete: () => void;
}

/** Presentation only; the guide never draws into captured camera frames. */
export default function CameraAngleGrid({ angle, dragging, onFadeComplete }: CameraAngleGridProps) {
  const { columns, rows } = projectAngleGrid(angle);
  const path = [...columns, ...rows].map(({ x1, y1, x2, y2 }) =>
    `M ${x1} ${y1} L ${x2} ${y2}`,
  ).join(" ");

  return (
    <svg
      data-testid="camera-angle-grid"
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${styles.guide}`}
      data-dragging={dragging}
      onAnimationEnd={onFadeComplete}
    >
      {/* Project beyond the viewport, then clip at its edges. Uniform slice
          scaling keeps overhead cells square on wide and tall camera feeds. */}
      <path d={path} fill="none" stroke="black" strokeOpacity="0.4" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
      <path d={path} fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

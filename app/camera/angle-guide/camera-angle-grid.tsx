import { useId } from "react";
import styles from "./camera-angle-grid.module.css";

interface CameraAngleGridProps {
  angle: number;
  dragging: boolean;
  onFadeComplete: () => void;
}

/** Presentation only; the guide never draws into captured camera frames. */
export default function CameraAngleGrid({ angle, dragging, onFadeComplete }: CameraAngleGridProps) {
  const patternId = useId();
  const depth = Math.cos(angle * Math.PI / 180);

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
      {/* Repeat the projected cells beyond the viewport, then clip at its edges.
          Uniform slice scaling keeps overhead cells square on wide/tall feeds. */}
      <defs>
        <pattern
          id={patternId}
          width="14"
          height="14"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(50 50) scale(1 ${depth}) translate(-50 -50)`}
        >
          <path d="M 0 14 V 0 H 14" fill="none" stroke="black" strokeOpacity="0.4" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <path d="M 0 14 V 0 H 14" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#${patternId})`} />
    </svg>
  );
}

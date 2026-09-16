import { MAX_CAMERA_ANGLE } from "../camera-angle";

interface GridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const CENTER = 50;
const CELL_SIZE = 14;
// Illustrative pinhole camera: a 150-unit focal length in a 100-unit viewport
// gives a ~37° field of view, keeping the horizon outside the frame at 70°.
// This is not calibration of the physical camera.
const FOCAL_LENGTH = 150;

function gridCoordinates(min: number, max: number): number[] {
  const first = Math.floor(min / CELL_SIZE);
  const last = Math.ceil(max / CELL_SIZE);
  return Array.from({ length: last - first + 1 }, (_, i) => (first + i) * CELL_SIZE);
}

/** Project a square table grid into a 100 × 100 viewport. Farther points are up.
 * Camera distance equals focal length, so center-cell width stays constant.
 */
export function projectAngleGrid(angle: number): { columns: GridLine[]; rows: GridLine[] } {
  const tilt = (Number.isFinite(angle) ? Math.max(0, Math.min(MAX_CAMERA_ANGLE, angle)) : 0) * Math.PI / 180;
  const cos = Math.cos(tilt), sin = Math.sin(tilt);
  // Perspective scale at each screen row. At 70° the horizon remains above
  // the viewport, so all inverse projections are finite and in front of it.
  const scaleAtRow = (row: number) => 1 + (row - CENTER) * Math.tan(tilt) / FOCAL_LENGTH;
  const farScale = scaleAtRow(0), nearScale = scaleAtRow(100);
  const halfWidth = CENTER / farScale;
  const columns = gridCoordinates(-halfWidth, halfWidth).map((x) => ({
    x1: CENTER + x * farScale, y1: 0,
    x2: CENTER + x * nearScale, y2: 100,
  }));

  // Invert the screen edges and include one row beyond each for clipped coverage.
  const tableDepthAtRow = (row: number) => {
    const offset = row - CENTER;
    return offset / (cos + offset * sin / FOCAL_LENGTH);
  };
  const rows = gridCoordinates(tableDepthAtRow(0), tableDepthAtRow(100)).map((y) => {
    const screenY = CENTER + y * cos / (1 - y * sin / FOCAL_LENGTH);
    return { x1: 0, y1: screenY, x2: 100, y2: screenY };
  });
  return { columns, rows };
}

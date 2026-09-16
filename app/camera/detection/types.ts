export type Point = readonly [number, number];

export interface Pip {
  point: Point;
  area: number;
}

export interface EllipticalPip extends Pip {
  axisRatio: number;
  /** OpenCV fitEllipse angle of the minor axis, in degrees. */
  angle: number;
}

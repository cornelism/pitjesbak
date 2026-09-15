export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface DetectedDie {
  value: DieValue;
  x: number;
  y: number;
  width: number;
  height: number;
}

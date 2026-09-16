import { describe, expect, it } from "vitest";
import { projectAngleGrid } from "./grid-projection";

describe("projectAngleGrid", () => {
  it("keeps square, evenly spaced cells when viewed overhead", () => {
    const { columns, rows } = projectAngleGrid(0);
    expect(columns.length).toBe(rows.length);
    expect(columns.every((line) => line.x1 === line.x2 && line.y1 === 0 && line.y2 === 100)).toBe(true);
    expect(rows.every((line) => line.y1 === line.y2 && line.x1 === 0 && line.x2 === 100)).toBe(true);
    const spacing = columns[1].x1 - columns[0].x1;
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].y1 - rows[i - 1].y1).toBeCloseTo(spacing);
      expect(columns[i].x1 - columns[i - 1].x1).toBeCloseTo(spacing);
    }
  });

  it.each([15, 30, 45, 60])("converges columns and compresses distant rows at %i degrees", (angle) => {
    const { columns, rows } = projectAngleGrid(angle);
    expect(columns[1].x1 - columns[0].x1).toBeLessThan(columns[1].x2 - columns[0].x2);
    const gaps = rows.slice(1).map((row, i) => row.y1 - rows[i].y1);
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1]);
    expect(columns.some((line) => line.x1 === 50 && line.x2 === 50)).toBe(true);
  });

  it("uses a shared vanishing point instead of independently squeezing columns", () => {
    // A 45° table has its depth vanishing point one focal length (100) above center.
    for (const line of projectAngleGrid(45).columns) {
      const xAtHorizon = line.x1 + (-50 - line.y1) * (line.x2 - line.x1) / (line.y2 - line.y1);
      expect(xAtHorizon).toBeCloseTo(50);
    }
  });

  it.each([0, 5, 15, 30, 45, 55, 60])("covers the field with finite geometry at %i degrees", (angle) => {
    const { columns, rows } = projectAngleGrid(angle);
    expect([...columns, ...rows].every((line) => Object.values(line).every(Number.isFinite))).toBe(true);
    // The grid extends past all four edges; the SVG viewport handles clipping.
    expect(columns[0].x1).toBeLessThanOrEqual(0);
    expect(columns.at(-1)!.x1).toBeGreaterThanOrEqual(100);
    expect(rows[0].y1).toBeLessThanOrEqual(0);
    expect(rows.at(-1)!.y1).toBeGreaterThanOrEqual(100);
  });

  it("bounds unsupported angles so the horizon cannot enter the viewport", () => {
    expect(projectAngleGrid(-10)).toEqual(projectAngleGrid(0));
    expect(projectAngleGrid(90)).toEqual(projectAngleGrid(60));
    expect(projectAngleGrid(NaN)).toEqual(projectAngleGrid(0));
  });
});

import { describe, it, expect } from "vitest";
import { filenameToScreenName, gridPositions, resolveOverlaps } from "./dropImport";
import { GRID_COLUMNS, GRID_COL_WIDTH } from "../constants";

describe("filenameToScreenName", () => {
  it("strips extension and title-cases", () => {
    expect(filenameToScreenName("login_page.png")).toBe("Login Page");
  });

  it("handles uppercase filenames", () => {
    expect(filenameToScreenName("HOME.jpg")).toBe("Home");
  });

  it("handles hyphens", () => {
    expect(filenameToScreenName("my-dashboard.PNG")).toBe("My Dashboard");
  });

  it("handles dots in filename", () => {
    expect(filenameToScreenName("screenshot.2024.01.15.png")).toBe("Screenshot.2024.01.15");
  });

  it("handles filename without extension", () => {
    expect(filenameToScreenName("noext")).toBe("Noext");
  });

  it("handles mixed separators", () => {
    expect(filenameToScreenName("user_profile-settings.jpg")).toBe("User Profile Settings");
  });
});

describe("gridPositions", () => {
  const gap = 60;

  it("returns correct count", () => {
    expect(gridPositions([100, 100, 100, 100, 100], 0, 0)).toHaveLength(5);
  });

  it("first position matches origin", () => {
    const pos = gridPositions([100], 100, 200);
    expect(pos[0]).toEqual({ x: 100, y: 200 });
  });

  it("arranges in columns", () => {
    const pos = gridPositions([100, 100, 100], 0, 0);
    expect(pos[0]).toEqual({ x: 0, y: 0 });
    expect(pos[1]).toEqual({ x: GRID_COL_WIDTH, y: 0 });
    expect(pos[2]).toEqual({ x: GRID_COL_WIDTH * 2, y: 0 });
  });

  it("wraps to next row after GRID_COLUMNS using tallest item height", () => {
    // Row of 4 items: heights 100, 200, 150, 100 -> tallest is 200
    const heights = [100, 200, 150, 100, 120];
    const pos = gridPositions(heights, 0, 0, gap);
    // Second row starts at tallest(200) + gap(60) = 260
    expect(pos[GRID_COLUMNS]).toEqual({ x: 0, y: 260 });
  });

  it("uses dynamic row heights based on tallest item per row", () => {
    // Row 1: heights [300, 100, 100, 100] -> tallest 300
    // Row 2: heights [50, 200] -> tallest 200
    // Row 3: heights [150]
    const heights = [300, 100, 100, 100, 50, 200, 100, 100, 150];
    const pos = gridPositions(heights, 0, 0, gap);

    // All items in row 1 start at y=0
    expect(pos[0].y).toBe(0);
    expect(pos[3].y).toBe(0);

    // Row 2 starts at 300 + 60 = 360
    expect(pos[4].y).toBe(360);
    expect(pos[7].y).toBe(360);

    // Row 3 starts at 360 + 200 + 60 = 620
    expect(pos[8].y).toBe(620);
  });

  it("offsets from origin", () => {
    const heights = [100, 100, 100, 100, 100];
    const pos = gridPositions(heights, 50, 100, gap);
    expect(pos[0]).toEqual({ x: 50, y: 100 });
    expect(pos[GRID_COLUMNS]).toEqual({ x: 50, y: 100 + 100 + gap });
  });
});

describe("resolveOverlaps", () => {
  const w = 220;
  const h = 160;

  it("returns positions unchanged when no existing screens", () => {
    const candidates = [
      { x: 0, y: 0, width: w, height: h },
      { x: 300, y: 0, width: w, height: h },
    ];
    const result = resolveOverlaps(candidates, []);
    expect(result[0]).toEqual({ x: 0, y: 0 });
    expect(result[1]).toEqual({ x: 300, y: 0 });
  });

  it("shifts candidate when overlapping an existing screen", () => {
    const existing = [{ x: 0, y: 0, width: w, height: h }];
    const candidates = [{ x: 10, y: 10, width: w, height: h }];
    const result = resolveOverlaps(candidates, existing);
    expect(result[0].x).toBeGreaterThan(10);
  });

  it("prevents candidates from overlapping each other", () => {
    const candidates = [
      { x: 0, y: 0, width: w, height: h },
      { x: 0, y: 0, width: w, height: h },
    ];
    const result = resolveOverlaps(candidates, []);
    const rect1 = { x: result[0].x, y: result[0].y, width: w, height: h };
    const rect2 = { x: result[1].x, y: result[1].y, width: w, height: h };
    // They should not overlap (with margin)
    const noOverlapX = rect1.x + w + 40 <= rect2.x || rect2.x + w + 40 <= rect1.x;
    const noOverlapY = rect1.y + h + 40 <= rect2.y || rect2.y + h + 40 <= rect1.y;
    expect(noOverlapX || noOverlapY).toBe(true);
  });

  it("wraps to next row after exhausting columns", () => {
    // Fill a row with existing screens
    const existing = [];
    for (let i = 0; i < GRID_COLUMNS; i++) {
      existing.push({ x: i * GRID_COL_WIDTH, y: 0, width: w, height: h });
    }
    const candidates = [{ x: 0, y: 0, width: w, height: h }];
    const result = resolveOverlaps(candidates, existing);
    expect(result[0].y).toBeGreaterThan(0);
  });

  it("respects custom margin", () => {
    const existing = [{ x: 0, y: 0, width: w, height: h }];
    // Place candidate just outside default margin but inside a larger margin
    const candidates = [{ x: w + 30, y: 0, width: w, height: h }];
    const resultSmall = resolveOverlaps(candidates, existing, 20);
    const resultLarge = resolveOverlaps(candidates, existing, 50);
    // With small margin, should stay in place; with large margin, should shift
    expect(resultSmall[0].x).toBe(w + 30);
    expect(resultLarge[0].x).toBeGreaterThan(w + 30);
  });
});

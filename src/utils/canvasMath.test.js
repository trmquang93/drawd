import { describe, it, expect } from "vitest";
import {
  computeDrawRect,
  computeRepositionDelta,
  computeResize,
  hitTestScreen,
  zoomTowardCursor,
  worldToScreenPct,
} from "./canvasMath.js";

// --- computeDrawRect ---

describe("computeDrawRect", () => {
  const imageRect = { left: 100, top: 200, width: 400, height: 800 };

  it("computes rect when dragging right-down from origin", () => {
    const result = computeDrawRect({ x: 100, y: 200 }, { x: 200, y: 300 }, imageRect);
    expect(result).toEqual({ x: 0, y: 0, w: 25, h: 12.5 });
  });

  it("handles reversed direction (left-up drag)", () => {
    const result = computeDrawRect({ x: 200, y: 300 }, { x: 100, y: 200 }, imageRect);
    expect(result.w).toBeGreaterThan(0);
    expect(result.h).toBeGreaterThan(0);
    expect(result).toEqual({ x: 0, y: 0, w: 25, h: 12.5 });
  });

  it("clamps to image bounds when dragging beyond edges", () => {
    // Drag starts inside, ends far outside
    const result = computeDrawRect({ x: 100, y: 200 }, { x: 600, y: 1200 }, imageRect);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.x + result.w).toBeLessThanOrEqual(100);
    expect(result.y + result.h).toBeLessThanOrEqual(100);
  });

  it("clamps when dragging before image origin", () => {
    const result = computeDrawRect({ x: 200, y: 400 }, { x: 50, y: 100 }, imageRect);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });

  it("produces small rects for small drags", () => {
    const result = computeDrawRect({ x: 300, y: 600 }, { x: 304, y: 608 }, imageRect);
    expect(result.w).toBe(1);
    expect(result.h).toBe(1);
  });
});

// --- computeRepositionDelta ---

describe("computeRepositionDelta", () => {
  it("moving +40px in a 400px-wide image increases x by 10%", () => {
    const result = computeRepositionDelta(
      { clientX: 100, clientY: 100 },
      { clientX: 140, clientY: 100 },
      { width: 400, height: 800 },
      1,
      { x: 10, y: 10, w: 20, h: 20 },
      { x: 10, y: 10 },
    );
    expect(result.x).toBe(20);
    expect(result.y).toBe(10);
  });

  it("clamps x so hotspot does not exceed right edge", () => {
    const result = computeRepositionDelta(
      { clientX: 0, clientY: 0 },
      { clientX: 400, clientY: 0 },
      { width: 400, height: 800 },
      1,
      { x: 50, y: 10, w: 30, h: 20 },
      { x: 50, y: 10 },
    );
    // x + w must be <= 100, so x <= 70
    expect(result.x).toBe(70);
  });

  it("clamps x so hotspot does not go below 0", () => {
    const result = computeRepositionDelta(
      { clientX: 200, clientY: 200 },
      { clientX: 0, clientY: 200 },
      { width: 400, height: 800 },
      1,
      { x: 10, y: 10, w: 20, h: 20 },
      { x: 10, y: 10 },
    );
    expect(result.x).toBe(0);
  });

  it("accounts for zoom when computing delta", () => {
    const result = computeRepositionDelta(
      { clientX: 100, clientY: 100 },
      { clientX: 180, clientY: 100 },
      { width: 400, height: 800 },
      2, // zoom = 2, so 80px client delta = 40px world delta
      { x: 10, y: 10, w: 20, h: 20 },
      { x: 10, y: 10 },
    );
    expect(result.x).toBe(20);
  });
});

// --- computeResize ---

describe("computeResize", () => {
  const original = { x: 20, y: 20, w: 30, h: 30 };
  const imageRect = { width: 400, height: 800 };

  it("'se' handle increases w and h", () => {
    const result = computeResize(
      "se",
      { clientX: 0, clientY: 0 },
      { clientX: 40, clientY: 80 },
      imageRect,
      1,
      original,
    );
    expect(result.w).toBe(40); // 30 + (40/400)*100 = 30 + 10
    expect(result.h).toBe(40); // 30 + (80/800)*100 = 30 + 10
    expect(result.x).toBe(20);
    expect(result.y).toBe(20);
  });

  it("'nw' handle moves origin and adjusts w/h", () => {
    const result = computeResize(
      "nw",
      { clientX: 100, clientY: 100 },
      { clientX: 60, clientY: 20 },
      imageRect,
      1,
      original,
    );
    // dx = ((60-100)/1/400)*100 = -10, dy = ((20-100)/1/800)*100 = -10
    // w direction: dx=-10 < w-2=28, clampedDx = max(-20, -10) = -10
    // x = 20 + (-10) = 10, w = 30 - (-10) = 40
    // n direction: dy=-10 < h-2=28, clampedDy = max(-20, -10) = -10
    // y = 20 + (-10) = 10, h = 30 - (-10) = 40
    expect(result.x).toBe(10);
    expect(result.y).toBe(10);
    expect(result.w).toBe(40);
    expect(result.h).toBe(40);
  });

  it("'e' handle only changes w, not x/y/h", () => {
    const result = computeResize(
      "e",
      { clientX: 0, clientY: 0 },
      { clientX: 40, clientY: 50 },
      imageRect,
      1,
      original,
    );
    expect(result.x).toBe(20);
    expect(result.y).toBe(20);
    expect(result.h).toBe(30);
    expect(result.w).toBe(40);
  });

  it("'n' handle only changes y and h", () => {
    const result = computeResize(
      "n",
      { clientX: 0, clientY: 0 },
      { clientX: 50, clientY: -80 },
      imageRect,
      1,
      original,
    );
    expect(result.x).toBe(20);
    expect(result.w).toBe(30);
    // dy = ((-80)/1/800)*100 = -10, clampedDy = max(-20, -10) = -10
    expect(result.y).toBe(10);
    expect(result.h).toBe(40);
  });

  it("enforces min size of 2%", () => {
    // Shrink se so much that w/h would go below 2
    const result = computeResize(
      "se",
      { clientX: 0, clientY: 0 },
      { clientX: -400, clientY: -800 },
      imageRect,
      1,
      original,
    );
    expect(result.w).toBe(2);
    expect(result.h).toBe(2);
  });

  it("clamps to image bounds (e handle cannot exceed 100)", () => {
    const nearEdge = { x: 80, y: 80, w: 15, h: 15 };
    const result = computeResize(
      "se",
      { clientX: 0, clientY: 0 },
      { clientX: 200, clientY: 400 },
      imageRect,
      1,
      nearEdge,
    );
    // w = min(100 - 80, 15 + 50) = 20
    expect(result.x + result.w).toBeLessThanOrEqual(100);
    expect(result.y + result.h).toBeLessThanOrEqual(100);
  });

  it("'sw' handle adjusts x/w and h correctly", () => {
    const result = computeResize(
      "sw",
      { clientX: 100, clientY: 0 },
      { clientX: 60, clientY: 80 },
      imageRect,
      1,
      original,
    );
    // w direction: dxPct = ((60-100)/400)*100 = -10
    // dx = min(-10, 28) = -10, clampedDx = max(-20, -10) = -10
    // x = 20 + (-10) = 10, w = 30 - (-10) = 40
    expect(result.x).toBe(10);
    expect(result.w).toBe(40);
    // s direction: dyPct = (80/800)*100 = 10
    // h = max(2, min(100-20, 30+10)) = 40
    expect(result.h).toBe(40);
    expect(result.y).toBe(20);
  });
});

// --- hitTestScreen ---

describe("hitTestScreen", () => {
  const screen = { x: 100, y: 100, width: 220, imageHeight: 400 };
  const headerHeight = 37;

  it("returns true for point inside screen rect", () => {
    expect(hitTestScreen(200, 300, screen, headerHeight)).toBe(true);
  });

  it("returns false for point outside screen rect", () => {
    expect(hitTestScreen(50, 50, screen, headerHeight)).toBe(false);
  });

  it("returns true for point in header area (header is part of hit area)", () => {
    // The hit test includes the full rect from (x,y) to (x+w, y+imageHeight+headerHeight)
    // y=100 is the top of the screen, header is included
    expect(hitTestScreen(200, 110, screen, headerHeight)).toBe(true);
  });

  it("returns false for point just below the screen", () => {
    // total height = 400 + 37 = 437, bottom edge at y = 100 + 437 = 537
    expect(hitTestScreen(200, 538, screen, headerHeight)).toBe(false);
  });

  it("returns true for point exactly on edge (inclusive bounds)", () => {
    // Top-left corner
    expect(hitTestScreen(100, 100, screen, headerHeight)).toBe(true);
    // Bottom-right corner: x=320, y=537
    expect(hitTestScreen(320, 537, screen, headerHeight)).toBe(true);
  });

  it("returns false for point just past right edge", () => {
    expect(hitTestScreen(321, 300, screen, headerHeight)).toBe(false);
  });

  it("uses default width 220 when screen.width is falsy", () => {
    const noWidth = { x: 0, y: 0, imageHeight: 100 };
    expect(hitTestScreen(110, 50, noWidth, 37)).toBe(true);
    expect(hitTestScreen(221, 50, noWidth, 37)).toBe(false);
  });

  it("uses default imageHeight 120 when imageHeight is falsy", () => {
    const noImgH = { x: 0, y: 0, width: 200 };
    // total height = 120 + 37 = 157
    expect(hitTestScreen(100, 150, noImgH, 37)).toBe(true);
    expect(hitTestScreen(100, 158, noImgH, 37)).toBe(false);
  });
});

// --- worldToScreenPct ---

describe("worldToScreenPct", () => {
  const screen = { x: 100, y: 100, width: 220, imageHeight: 500 };
  const headerHeight = 37;
  const borderWidth = 2;

  it("converts world coords to percentage within the image area", () => {
    // imgLeft = 100 + 2 = 102, imgTop = 100 + 37 + 2 = 139
    // imgW = 220, imgH = 500
    // mouse at (210, 339): pctX = (210-102)/220 * 100 = 49.1%, pctY = (339-139)/500 * 100 = 40%
    const result = worldToScreenPct(210, 339, screen, headerHeight, borderWidth);
    expect(result.x).toBeCloseTo(49.1, 1);
    expect(result.y).toBe(40);
  });

  it("returns negative values for coords above/left of image area (unclamped)", () => {
    const result = worldToScreenPct(50, 50, screen, headerHeight, borderWidth);
    expect(result.x).toBeLessThan(0);
    expect(result.y).toBeLessThan(0);
  });

  it("returns values above 100 for coords beyond bottom-right (unclamped)", () => {
    // imgLeft = 102, imgTop = 139, imgW = 220, imgH = 500
    // mouse at (400, 700): pctX = (400-102)/220 * 100 = 135.5%, pctY = (700-139)/500 * 100 = 112.2%
    const result = worldToScreenPct(400, 700, screen, headerHeight, borderWidth);
    expect(result.x).toBeGreaterThan(100);
    expect(result.y).toBeGreaterThan(100);
  });

  it("uses default width and height for screens without those values", () => {
    const noSize = { x: 0, y: 0 };
    // imgLeft = 0 + 2 = 2, imgTop = 0 + 37 + 2 = 39
    // default imgW = 220, default imgH = 120
    // mouse at (112, 99): pctX = (112-2)/220 * 100 = 50%, pctY = (99-39)/120 * 100 = 50%
    const result = worldToScreenPct(112, 99, noSize, 37, 2);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });
});

// --- zoomTowardCursor ---

describe("zoomTowardCursor", () => {
  it("positive delta increases zoom", () => {
    const result = zoomTowardCursor(1.0, 0.1, 500, 400, { x: 0, y: 0 });
    expect(result.zoom).toBeCloseTo(1.1);
  });

  it("negative delta decreases zoom", () => {
    const result = zoomTowardCursor(1.0, -0.1, 500, 400, { x: 0, y: 0 });
    expect(result.zoom).toBeCloseTo(0.9);
  });

  it("clamps zoom at max 2.0", () => {
    const result = zoomTowardCursor(1.95, 0.1, 500, 400, { x: 0, y: 0 });
    expect(result.zoom).toBe(2.0);
  });

  it("clamps zoom at min 0.2", () => {
    const result = zoomTowardCursor(0.25, -0.1, 500, 400, { x: 0, y: 0 });
    expect(result.zoom).toBe(0.2);
  });

  it("pan adjusts so point under cursor stays fixed", () => {
    const mouseX = 500;
    const mouseY = 400;
    const currentPan = { x: 100, y: 50 };
    const prevZoom = 1.0;
    const delta = 0.1;

    const result = zoomTowardCursor(prevZoom, delta, mouseX, mouseY, currentPan);
    const scale = result.zoom / prevZoom;

    // Verify the zoom-toward-cursor formula:
    // pan.x = mouseX - (mouseX - oldPan.x) * scale
    expect(result.pan.x).toBeCloseTo(mouseX - (mouseX - currentPan.x) * scale);
    expect(result.pan.y).toBeCloseTo(mouseY - (mouseY - currentPan.y) * scale);
  });

  it("pan stays at origin when cursor is at origin with zero pan", () => {
    const result = zoomTowardCursor(1.0, 0.1, 0, 0, { x: 0, y: 0 });
    expect(result.pan.x).toBe(0);
    expect(result.pan.y).toBe(0);
  });
});

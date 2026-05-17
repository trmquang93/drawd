import { describe, it, expect } from "vitest";
import { rectsOverlap, screenToRect } from "../rect-utils.js";

describe("rectsOverlap", () => {
  it("detects overlapping rects", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 50, y: 50, w: 100, h: 100 })).toBe(true);
  });

  it("returns false for non-overlapping rects", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 200, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it("returns false for touching-but-not-overlapping rects", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 100, h: 100 }, { x: 100, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it("detects containment", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 200, h: 200 }, { x: 50, y: 50, w: 10, h: 10 })).toBe(true);
  });
});

describe("screenToRect", () => {
  it("builds rect with default dimensions", () => {
    const r = screenToRect({ x: 10, y: 20 });
    expect(r).toEqual({ x: 10, y: 20, w: 220, h: 480 });
  });

  it("inflates by gap", () => {
    const r = screenToRect({ x: 10, y: 20, width: 100, imageHeight: 200 }, 5);
    expect(r).toEqual({ x: 5, y: 15, w: 110, h: 210 });
  });
});

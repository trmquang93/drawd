/**
 * Axis-aligned rectangle overlap utilities for canvas layout.
 */

/**
 * Check if two rectangles overlap (share any interior area).
 * Each rect is { x, y, w, h } where (x, y) is top-left.
 */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Build a rect for a screen, inflated by `gap` on every side.
 */
export function screenToRect(screen, gap = 0) {
  const w = screen.width || 220;
  const h = screen.imageHeight || 480;
  return {
    x: screen.x - gap,
    y: screen.y - gap,
    w: w + gap * 2,
    h: h + gap * 2,
  };
}

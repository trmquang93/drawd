import { GRID_COLUMNS, GRID_COL_WIDTH, GRID_ROW_HEIGHT, DROP_OVERLAP_MARGIN } from "../constants";
import { rectsIntersect } from "./canvasMath";

/**
 * Convert a filename to a human-readable screen name.
 * "login_page.png" -> "Login Page"
 */
export function filenameToScreenName(filename) {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return withoutExt
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\B\w+/g, (w) => w.toLowerCase());
}

/**
 * Arrange items in a grid starting at (originX, originY).
 * Row height is determined by the tallest item in that row plus rowGap.
 *
 * @param {number[]} heights - height of each item
 * @param {number} originX
 * @param {number} originY
 * @param {number} rowGap - vertical spacing between rows (default 60)
 * @returns {Array<{x, y}>}
 */
export function gridPositions(heights, originX, originY, rowGap = 60) {
  const positions = [];
  let rowY = originY;
  let rowMaxHeight = 0;

  for (let i = 0; i < heights.length; i++) {
    const col = i % GRID_COLUMNS;
    if (col === 0 && i > 0) {
      rowY += rowMaxHeight + rowGap;
      rowMaxHeight = 0;
    }
    positions.push({
      x: originX + col * GRID_COL_WIDTH,
      y: rowY,
    });
    rowMaxHeight = Math.max(rowMaxHeight, heights[i]);
  }
  return positions;
}

/**
 * Inflate a rect by margin on all sides.
 */
function inflateRect(rect, margin) {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2,
  };
}

/**
 * Check if a candidate rect (inflated by margin) overlaps any rect in the occupied list.
 */
function hasCollision(candidate, occupied, margin) {
  const inflated = inflateRect(candidate, margin);
  return occupied.some((r) => rectsIntersect(inflated, r));
}

/**
 * Given candidate rects and existing screen rects, shift candidates to avoid overlaps.
 * Returns Array<{x, y}> with adjusted positions.
 */
export function resolveOverlaps(candidates, existing, margin = DROP_OVERLAP_MARGIN) {
  const occupied = existing.map((r) => ({ ...r }));
  const result = [];

  for (const candidate of candidates) {
    let placed = { ...candidate };
    let attempts = 0;
    const maxAttempts = GRID_COLUMNS * 20;

    while (hasCollision(placed, occupied, margin) && attempts < maxAttempts) {
      placed.x += GRID_COL_WIDTH;
      attempts++;
      if (attempts % GRID_COLUMNS === 0) {
        placed.x = candidate.x;
        placed.y += GRID_ROW_HEIGHT;
      }
    }

    occupied.push(placed);
    result.push({ x: placed.x, y: placed.y });
  }

  return result;
}

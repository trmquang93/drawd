import {
  GRID_COLUMNS,
  GRID_COL_WIDTH,
  GRID_ROW_HEIGHT,
  GRID_MARGIN,
} from "../../../src/constants.js";

export function gridPosition(existingCount) {
  const col = existingCount % GRID_COLUMNS;
  const row = Math.floor(existingCount / GRID_COLUMNS);
  return {
    x: col * GRID_COL_WIDTH + GRID_MARGIN,
    y: row * GRID_ROW_HEIGHT + GRID_MARGIN,
  };
}

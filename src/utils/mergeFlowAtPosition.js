import { mergeFlow } from "./mergeFlow";
import { DEFAULT_SCREEN_WIDTH } from "../constants";

// Phone-aspect height estimate for bounding box when screen has no explicit height
const SCREEN_HEIGHT_ESTIMATE = Math.round(DEFAULT_SCREEN_WIDTH * 1.77);

/**
 * Inserts template screens centered at a target canvas position,
 * then delegates to mergeFlow() for ID remapping only (no auto-offset).
 */
export function mergeFlowAtPosition(
  templateScreens,
  templateConnections,
  templateDocuments,
  targetX,
  targetY
) {
  if (templateScreens.length === 0) {
    return { screens: [], connections: [], documents: [] };
  }

  // Calculate bounding box of template screens
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of templateScreens) {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    const right = s.x + (s.width || DEFAULT_SCREEN_WIDTH);
    const bottom = s.y + SCREEN_HEIGHT_ESTIMATE;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const offsetX = targetX - centerX;
  const offsetY = targetY - centerY;

  // Reposition screens to center at target
  const repositioned = templateScreens.map((s) => ({
    ...s,
    x: s.x + offsetX,
    y: s.y + offsetY,
  }));

  // Pass empty existingScreens so mergeFlow only remaps IDs without adding X offset
  return mergeFlow(repositioned, templateConnections, [], templateDocuments);
}

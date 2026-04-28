import { rectsOverlap, screenToRect } from "../utils/rect-utils.js";

const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 480;
const DEFAULT_GAP = 80;
const STEP_SIZE = 10;
const MAX_STEPS = 500;

export const layoutTools = [
  {
    name: "find_empty_space_near",
    description:
      "Find empty canvas coordinates near an existing screen. Walks outward from the anchor screen in the given direction until a non-overlapping position is found. Returns { x, y, reasoning } and optionally a collisions array when closer placements were blocked. Use this before create_screen to get deterministic, collision-free placement.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: {
          type: "string",
          description: "ID of the anchor screen to place near",
        },
        direction: {
          type: "string",
          enum: ["right", "left", "above", "below", "any"],
          description:
            'Direction to search from the anchor. "any" radiates outward trying right, below, left, above in sequence.',
        },
        width: {
          type: "number",
          description: `Width of the new screen (default: ${DEFAULT_WIDTH})`,
        },
        height: {
          type: "number",
          description: `Height of the new screen (default: ${DEFAULT_HEIGHT})`,
        },
        gap: {
          type: "number",
          description: `Minimum gap in px between the new screen and any existing screen (default: ${DEFAULT_GAP})`,
        },
      },
      required: ["screenId", "direction"],
    },
  },
];

/**
 * Compute the candidate origin for direction + distance from anchor.
 */
function candidateOrigin(anchor, direction, distance, newW, newH) {
  const aw = anchor.width || DEFAULT_WIDTH;
  const ah = anchor.imageHeight || DEFAULT_HEIGHT;

  switch (direction) {
    case "right":
      return { x: anchor.x + aw + distance, y: anchor.y };
    case "left":
      return { x: anchor.x - newW - distance, y: anchor.y };
    case "below":
      return { x: anchor.x, y: anchor.y + ah + distance };
    case "above":
      return { x: anchor.x, y: anchor.y - newH - distance };
    default:
      return { x: anchor.x, y: anchor.y };
  }
}

/**
 * Check whether a candidate rect overlaps any obstacle and return collisions.
 */
function findCollisions(candidate, obstacles) {
  const hits = [];
  for (const obs of obstacles) {
    if (rectsOverlap(candidate, obs.rect)) {
      hits.push({ id: obs.id, name: obs.name });
    }
  }
  return hits;
}

/**
 * Walk outward in a single direction until empty space is found.
 * Returns { x, y, collisions } or null if MAX_STEPS exceeded.
 */
function walkDirection(anchor, direction, newW, newH, gap, obstacles) {
  const collisions = [];
  const seenIds = new Set();

  for (let step = 0; step <= MAX_STEPS; step++) {
    const distance = gap + step * STEP_SIZE;
    const origin = candidateOrigin(anchor, direction, distance, newW, newH);
    const candidateRect = { x: origin.x, y: origin.y, w: newW, h: newH };

    const hits = findCollisions(candidateRect, obstacles);
    if (hits.length === 0) {
      return { x: origin.x, y: origin.y, collisions };
    }

    for (const h of hits) {
      if (!seenIds.has(h.id)) {
        seenIds.add(h.id);
        collisions.push(h);
      }
    }
  }

  return null;
}

const DIRECTION_ORDER = ["right", "below", "left", "above"];

export function handleLayoutTool(name, args, state) {
  if (name !== "find_empty_space_near") {
    throw new Error(`Unknown layout tool: ${name}`);
  }

  const anchor = state.getScreen(args.screenId);
  if (!anchor) throw new Error(`Screen not found: ${args.screenId}`);

  const newW = args.width || DEFAULT_WIDTH;
  const newH = args.height || DEFAULT_HEIGHT;
  const gap = args.gap ?? DEFAULT_GAP;

  // Build obstacle list (every screen except the anchor, inflated by gap)
  const obstacles = state.screens
    .filter((s) => s.id !== args.screenId)
    .map((s) => ({
      id: s.id,
      name: s.name,
      rect: screenToRect(s, gap),
    }));

  const direction = args.direction;

  if (direction !== "any") {
    const result = walkDirection(anchor, direction, newW, newH, gap, obstacles);
    if (result) {
      const dirLabel = direction === "above" ? "above" : `to the ${direction} of`;
      return {
        x: result.x,
        y: result.y,
        reasoning: `Placed ${dirLabel} "${anchor.name}" with ${gap}px gap${result.collisions.length ? "; skipped blocked positions" : "; no collisions"}`,
        ...(result.collisions.length ? { collisions: result.collisions } : {}),
      };
    }
    // Exhausted — fall through to "any" search
  }

  // "any" direction: try each cardinal direction in order
  for (const dir of DIRECTION_ORDER) {
    const result = walkDirection(anchor, dir, newW, newH, gap, obstacles);
    if (result) {
      const dirLabel = dir === "above" ? "above" : `to the ${dir} of`;
      return {
        x: result.x,
        y: result.y,
        reasoning: `Placed ${dirLabel} "${anchor.name}" with ${gap}px gap (best available direction)${result.collisions.length ? "; skipped blocked positions" : ""}`,
        ...(result.collisions.length ? { collisions: result.collisions } : {}),
      };
    }
  }

  // Fully boxed-in fallback: place far to the right
  const allScreens = state.screens;
  let maxRight = anchor.x + (anchor.width || DEFAULT_WIDTH);
  for (const s of allScreens) {
    const right = s.x + (s.width || DEFAULT_WIDTH);
    if (right > maxRight) maxRight = right;
  }
  const fallbackX = maxRight + gap;
  const fallbackY = anchor.y;

  return {
    x: fallbackX,
    y: fallbackY,
    reasoning: `All cardinal directions blocked; placed far right of all screens with ${gap}px gap (fallback)`,
    collisions: state.screens
      .filter((s) => s.id !== args.screenId)
      .map((s) => ({ id: s.id, name: s.name })),
  };
}

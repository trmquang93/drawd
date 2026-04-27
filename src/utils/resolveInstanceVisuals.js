// resolveInstanceVisuals
//
// When a screen is marked as a component instance, on the canvas it inherits
// IMAGE and DIMENSIONS from its canonical so every placement renders the same
// underlying screenshot at the same size. The canonical remains the single
// source of truth for those visuals.
//
// `hotspots[]` is NOT inherited — on an instance, `screen.hotspots[]` holds
// the placement's own *additive local* hotspots. They are rendered as-is on
// the canvas and merged with the canonical's hotspots at export time
// (see generateInstructionFiles.js), not at render time.
//
// This helper is the render-time bridge: pass any screen and the full screens
// array, get back either the screen unchanged (canonical / unlinked / orphan
// instance) or a shallow-merged screen whose IMAGE/DIMENSIONS come from the
// canonical while identity fields (id, x, y, name, status, comments, hotspots,
// etc.) stay from the instance.
//
// We intentionally do NOT copy data into instances on save — keeping this at
// render time means edits to the canonical propagate to every instance
// automatically.

const VISUAL_FIELDS = [
  "imageData",
  "imageWidth",
  "imageHeight",
  "width",
];

export function resolveInstanceVisuals(screen, screens) {
  if (!screen || screen.componentRole !== "instance" || !screen.componentId) {
    return screen;
  }
  const canonical = (screens || []).find(
    (s) => s && s.componentId === screen.componentId && s.componentRole === "canonical"
  );
  if (!canonical) return screen;

  const merged = { ...screen };
  for (const field of VISUAL_FIELDS) {
    if (canonical[field] !== undefined) merged[field] = canonical[field];
  }
  return merged;
}

export function isResolvedInstance(screen) {
  return !!(screen && screen.componentRole === "instance" && screen.componentId);
}

// resolveInstanceVisuals
//
// When a screen is marked as a component instance, on the canvas it should
// look identical to its canonical (same image, same hotspot positions, same
// dimensions). The canonical is the single source of truth for the visual
// spec — instances are placements.
//
// This helper is the render-time bridge: pass any screen and the full screens
// array, get back either the screen unchanged (canonical / unlinked / orphan
// instance) or a shallow-merged screen whose visual fields come from the
// canonical while identity fields (id, x, y, name, status, comments, etc.)
// stay from the instance.
//
// We intentionally do NOT copy data into instances on save — keeping this at
// render time means edits to the canonical propagate to every instance
// automatically.

const VISUAL_FIELDS = [
  "imageData",
  "imageWidth",
  "imageHeight",
  "width",
  "hotspots",
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

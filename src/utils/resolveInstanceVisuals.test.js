import { describe, it, expect } from "vitest";
import { resolveInstanceVisuals, isResolvedInstance } from "./resolveInstanceVisuals.js";

const baseScreen = (overrides = {}) => ({
  id: "s",
  name: "Card",
  x: 0,
  y: 0,
  width: 390,
  imageWidth: 390,
  imageHeight: 844,
  imageData: null,
  hotspots: [],
  ...overrides,
});

describe("resolveInstanceVisuals", () => {
  it("returns screen unchanged when not an instance", () => {
    const screen = baseScreen({ id: "s1", componentRole: "canonical", componentId: "c1" });
    const result = resolveInstanceVisuals(screen, [screen]);
    expect(result).toBe(screen);
  });

  it("returns screen unchanged when componentRole is null", () => {
    const screen = baseScreen({ id: "s1" });
    const result = resolveInstanceVisuals(screen, [screen]);
    expect(result).toBe(screen);
  });

  it("returns screen unchanged when canonical is missing (orphan instance)", () => {
    const orphan = baseScreen({ id: "s1", componentRole: "instance", componentId: "c1" });
    const result = resolveInstanceVisuals(orphan, [orphan]);
    expect(result).toBe(orphan);
  });

  it("merges canonical's image + dimensions into instance but NOT hotspots", () => {
    const canonical = baseScreen({
      id: "s1",
      name: "Card",
      componentId: "c1",
      componentRole: "canonical",
      imageData: "data:image/png;base64,CANONICAL",
      imageWidth: 800,
      imageHeight: 600,
      width: 800,
      hotspots: [{ id: "h1", label: "Tap", x: 10, y: 10, w: 50, h: 20 }],
    });
    const instance = baseScreen({
      id: "s2",
      name: "Card on Home",
      x: 1000,
      y: 200,
      componentId: "c1",
      componentRole: "instance",
      imageData: "data:image/png;base64,STALE",
      hotspots: [],
    });
    const result = resolveInstanceVisuals(instance, [canonical, instance]);
    expect(result.imageData).toBe("data:image/png;base64,CANONICAL");
    expect(result.imageWidth).toBe(800);
    expect(result.imageHeight).toBe(600);
    expect(result.width).toBe(800);
    // Hotspots are NOT inherited from the canonical — instances keep their own.
    expect(result.hotspots).toEqual([]);
  });

  it("instance with non-empty local hotspots returns them verbatim regardless of canonical's hotspots", () => {
    const canonical = baseScreen({
      id: "s1",
      componentId: "c1",
      componentRole: "canonical",
      hotspots: [
        { id: "hC1", label: "Canonical Tap", x: 0, y: 0, w: 10, h: 10 },
        { id: "hC2", label: "Canonical Other", x: 10, y: 10, w: 10, h: 10 },
      ],
    });
    const localHotspots = [
      { id: "hI1", label: "Local Skip", x: 50, y: 50, w: 30, h: 30 },
    ];
    const instance = baseScreen({
      id: "s2",
      componentId: "c1",
      componentRole: "instance",
      hotspots: localHotspots,
    });
    const result = resolveInstanceVisuals(instance, [canonical, instance]);
    expect(result.hotspots).toBe(localHotspots);
    expect(result.hotspots).toEqual(localHotspots);
  });

  it("instance with empty hotspots returns empty (canonical's are NOT copied)", () => {
    const canonical = baseScreen({
      id: "s1",
      componentId: "c1",
      componentRole: "canonical",
      hotspots: [{ id: "hC1", label: "Canonical Tap", x: 0, y: 0, w: 10, h: 10 }],
    });
    const instance = baseScreen({
      id: "s2",
      componentId: "c1",
      componentRole: "instance",
      hotspots: [],
    });
    const result = resolveInstanceVisuals(instance, [canonical, instance]);
    expect(result.hotspots).toEqual([]);
  });

  it("image fields (imageData, imageWidth, imageHeight, width) still inherit from canonical", () => {
    const canonical = baseScreen({
      id: "s1",
      componentId: "c1",
      componentRole: "canonical",
      imageData: "data:image/png;base64,CANONICAL",
      imageWidth: 1024,
      imageHeight: 768,
      width: 1024,
    });
    const instance = baseScreen({
      id: "s2",
      componentId: "c1",
      componentRole: "instance",
      imageData: null,
      imageWidth: 100,
      imageHeight: 100,
      width: 200,
    });
    const result = resolveInstanceVisuals(instance, [canonical, instance]);
    expect(result.imageData).toBe("data:image/png;base64,CANONICAL");
    expect(result.imageWidth).toBe(1024);
    expect(result.imageHeight).toBe(768);
    expect(result.width).toBe(1024);
  });

  it("preserves identity fields (id, name, position) from the instance", () => {
    const canonical = baseScreen({
      id: "s1",
      name: "Card",
      componentId: "c1",
      componentRole: "canonical",
      imageData: "data:image/png;base64,CANONICAL",
    });
    const instance = baseScreen({
      id: "s2",
      name: "Card on Home",
      x: 1000,
      y: 200,
      componentId: "c1",
      componentRole: "instance",
    });
    const result = resolveInstanceVisuals(instance, [canonical, instance]);
    expect(result.id).toBe("s2");
    expect(result.name).toBe("Card on Home");
    expect(result.x).toBe(1000);
    expect(result.y).toBe(200);
    expect(result.componentRole).toBe("instance");
  });

  it("does not mutate the original instance", () => {
    const canonical = baseScreen({
      id: "s1",
      componentId: "c1",
      componentRole: "canonical",
      imageData: "data:image/png;base64,CANONICAL",
    });
    const instance = baseScreen({
      id: "s2",
      componentId: "c1",
      componentRole: "instance",
      imageData: "data:image/png;base64,STALE",
    });
    const before = { ...instance };
    resolveInstanceVisuals(instance, [canonical, instance]);
    expect(instance).toEqual(before);
  });

  it("returns falsy input unchanged", () => {
    expect(resolveInstanceVisuals(null, [])).toBe(null);
    expect(resolveInstanceVisuals(undefined, [])).toBe(undefined);
  });
});

describe("isResolvedInstance", () => {
  it("returns true only for instances with a componentId", () => {
    expect(isResolvedInstance({ componentRole: "instance", componentId: "c1" })).toBe(true);
    expect(isResolvedInstance({ componentRole: "instance", componentId: null })).toBe(false);
    expect(isResolvedInstance({ componentRole: "canonical", componentId: "c1" })).toBe(false);
    expect(isResolvedInstance({})).toBe(false);
    expect(isResolvedInstance(null)).toBe(false);
  });
});

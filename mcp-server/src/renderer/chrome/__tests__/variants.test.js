import { describe, it, expect } from "vitest";
import { CHROME_ELEMENTS, CHROME_IDS } from "../registry.js";
import { CHROME_GEOMETRY, getBounds } from "../geometry.js";

// One consolidated variant test file (consciously diverging from plan's
// "one test file per variant" — same coverage, lower file sprawl).

describe("CHROME_GEOMETRY", () => {
  it("has an entry for every registered chrome id", () => {
    for (const id of CHROME_IDS) {
      expect(CHROME_GEOMETRY[id]).toBeDefined();
    }
  });

  it("rectangles fit inside the viewport for their device", () => {
    const viewports = { iphone: { w: 393, h: 852 }, android: { w: 412, h: 915 } };
    for (const [id, perDevice] of Object.entries(CHROME_GEOMETRY)) {
      for (const [device, rect] of Object.entries(perDevice)) {
        const vp = viewports[device];
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.w, `${id}/${device} overflows width`).toBeLessThanOrEqual(vp.w);
        expect(rect.y + rect.h, `${id}/${device} overflows height`).toBeLessThanOrEqual(vp.h);
      }
    }
  });

  it("getBounds throws for unknown element", () => {
    expect(() => getBounds("not-a-thing", "iphone")).toThrow(/Unknown chrome element/);
  });

  it("getBounds throws when device has no geometry for that element", () => {
    expect(() => getBounds("status-bar-ios", "android")).toThrow(/no geometry for device/);
  });
});

describe("ChromeElement contract", () => {
  it.each(CHROME_IDS)("%s exposes the full contract", (id) => {
    const el = CHROME_ELEMENTS[id];
    expect(el.id).toBe(id);
    expect(Array.isArray(el.appliesTo)).toBe(true);
    expect(el.appliesTo.length).toBeGreaterThan(0);
    expect(Array.isArray(el.conflicts)).toBe(true);
    expect(typeof el.bounds).toBe("function");
    expect(typeof el.safeArea).toBe("function");
    expect(typeof el.render).toBe("function");
  });

  it.each(CHROME_IDS)("%s render produces a non-empty SVG fragment for each chromeStyle", (id) => {
    const el = CHROME_ELEMENTS[id];
    for (const device of el.appliesTo) {
      for (const chromeStyle of ["light", "dark"]) {
        const out = el.render({ device, chromeStyle });
        expect(out, `${id}/${device}/${chromeStyle} produced empty output`).toMatch(/<g\b/);
        expect(out.length).toBeGreaterThan(20);
      }
    }
  });

  it.each(CHROME_IDS)("%s safeArea returns at least one edge", (id) => {
    const el = CHROME_ELEMENTS[id];
    for (const device of el.appliesTo) {
      const sa = el.safeArea({ device });
      const edges = ["top", "bottom", "left", "right"].filter((k) => sa[k] !== undefined);
      expect(edges.length).toBeGreaterThan(0);
    }
  });
});

describe("safeArea contributions match the plan table", () => {
  it("status-bar-ios contributes top: 54", () => {
    expect(CHROME_ELEMENTS["status-bar-ios"].safeArea({ device: "iphone" })).toEqual({ top: 54 });
  });
  it("dynamic-island contributes top: 59", () => {
    expect(CHROME_ELEMENTS["dynamic-island"].safeArea({ device: "iphone" })).toEqual({ top: 59 });
  });
  it("home-indicator contributes bottom: 34", () => {
    expect(CHROME_ELEMENTS["home-indicator"].safeArea({ device: "iphone" })).toEqual({ bottom: 34 });
  });
  it("status-bar-android contributes top: 36", () => {
    expect(CHROME_ELEMENTS["status-bar-android"].safeArea({ device: "android" })).toEqual({ top: 36 });
  });
  it("android-gesture-pill contributes bottom: 16", () => {
    expect(CHROME_ELEMENTS["android-gesture-pill"].safeArea({ device: "android" })).toEqual({ bottom: 16 });
  });
});

describe("conflict declarations", () => {
  it("status-bar-ios and status-bar-android are mutually exclusive (declared on at least one side)", () => {
    const ios = CHROME_ELEMENTS["status-bar-ios"];
    const android = CHROME_ELEMENTS["status-bar-android"];
    const declared =
      ios.conflicts.includes("status-bar-android") ||
      android.conflicts.includes("status-bar-ios");
    expect(declared).toBe(true);
  });
});

describe("colour palette branches", () => {
  it("home-indicator uses different fills for light vs dark", () => {
    const light = CHROME_ELEMENTS["home-indicator"].render({ device: "iphone", chromeStyle: "light" });
    const dark = CHROME_ELEMENTS["home-indicator"].render({ device: "iphone", chromeStyle: "dark" });
    expect(light).toContain("#000000");
    expect(dark).toContain("#ffffff");
  });

  it("dynamic-island stays black regardless of chromeStyle", () => {
    const light = CHROME_ELEMENTS["dynamic-island"].render({ device: "iphone", chromeStyle: "light" });
    const dark = CHROME_ELEMENTS["dynamic-island"].render({ device: "iphone", chromeStyle: "dark" });
    expect(light).toContain("#000000");
    expect(dark).toContain("#000000");
  });
});

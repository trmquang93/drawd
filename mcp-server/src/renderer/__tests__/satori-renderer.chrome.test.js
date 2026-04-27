// @vitest-environment node
//
// Override the project-wide jsdom env: this file imports the real Satori
// renderer, which transitively pulls in node:fs/promises (emoji-loader).
// jsdom's import analyser refuses unknown node: protocols.

import { describe, it, expect, beforeAll } from "vitest";
import { SatoriRenderer } from "../satori-renderer.js";

// End-to-end integration test for Phase 2 (renderer integration).
//
// These exercise the real Satori → composeChromeSvg → Resvg pipeline.
// They are slower than the pure-function tests in chrome/__tests__/ but
// catch regressions the unit tests can't (missing fonts in Resvg, broken
// SVG composition, etc.).

const SIMPLE_HTML =
  '<div style="width:393px;height:852px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;"><div>Hello</div></div>';

const SIMPLE_ANDROID_HTML =
  '<div style="width:412px;height:915px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;"><div>Hello</div></div>';

describe("SatoriRenderer chrome composition", () => {
  let renderer;

  beforeAll(async () => {
    renderer = new SatoriRenderer();
    await renderer.init();
  });

  it("renders an iPhone screen with auto chrome at the device 2x dimensions", async () => {
    const result = await renderer.render(SIMPLE_HTML, { device: "iphone", chrome: "auto" });
    expect(result.width).toBe(786);   // 393 × 2
    expect(result.height).toBe(1704); // 852 × 2
    expect(result.device).toBe("iphone");
    expect(result.chrome).toEqual([
      "status-bar-ios",
      "dynamic-island",
      "home-indicator",
    ]);
    expect(result.chromeStyle).toBe("light");
    expect(result.safeArea).toEqual({ top: 59, bottom: 34, left: 0, right: 0 });
    expect(result.chromeRenderError).toBeUndefined();
    // svgString should now contain chrome group ids
    expect(result.svgString).toContain("chrome-status-bar-ios");
    expect(result.svgString).toContain("chrome-dynamic-island");
    expect(result.svgString).toContain("chrome-home-indicator");
    // PNG buffer should be non-trivial
    expect(result.pngBuffer.length).toBeGreaterThan(1000);
  });

  it("renders an Android screen with auto chrome", async () => {
    const result = await renderer.render(SIMPLE_ANDROID_HTML, { device: "android", chrome: "auto" });
    expect(result.width).toBe(824);    // 412 × 2
    expect(result.height).toBe(1830);  // 915 × 2
    expect(result.device).toBe("android");
    expect(result.chrome).toEqual(["status-bar-android", "android-gesture-pill"]);
    expect(result.safeArea).toEqual({ top: 36, bottom: 16, left: 0, right: 0 });
    expect(result.svgString).toContain("chrome-status-bar-android");
    expect(result.svgString).toContain("chrome-android-gesture-pill");
  });

  it("respects chrome: false (no chrome composited, zero safeArea)", async () => {
    const result = await renderer.render(SIMPLE_HTML, { device: "iphone", chrome: false });
    expect(result.chrome).toEqual([]);
    expect(result.safeArea).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(result.svgString).not.toContain("chrome-status-bar-ios");
  });

  it("respects an explicit chrome subset", async () => {
    const result = await renderer.render(SIMPLE_HTML, {
      device: "iphone",
      chrome: ["status-bar-ios"],
    });
    expect(result.chrome).toEqual(["status-bar-ios"]);
    expect(result.safeArea).toEqual({ top: 54, bottom: 0, left: 0, right: 0 });
    expect(result.svgString).toContain("chrome-status-bar-ios");
    expect(result.svgString).not.toContain("chrome-dynamic-island");
    expect(result.svgString).not.toContain("chrome-home-indicator");
  });

  it("chromeStyle: dark uses the dark palette", async () => {
    const result = await renderer.render(SIMPLE_HTML, {
      device: "iphone",
      chrome: ["home-indicator"],
      chromeStyle: "dark",
    });
    expect(result.chromeStyle).toBe("dark");
    expect(result.svgString).toContain('fill="#ffffff"');
  });

  it("custom width/height (no device) skips chrome and returns zero safeArea", async () => {
    const result = await renderer.render(SIMPLE_HTML, { width: 500, height: 500, chrome: "auto" });
    expect(result.device).toBe(null);
    expect(result.chrome).toEqual([]);
    expect(result.safeArea).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(result.width).toBe(1000);  // 500 × 2
  });

  it("composeChrome (universal path) wraps a base SVG and emits a PNG", async () => {
    const baseSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="393" height="852"><rect width="393" height="852" fill="#abcdef"/></svg>';
    const result = await renderer.composeChrome({
      baseSvg,
      device: "iphone",
      chrome: "auto",
    });
    expect(result.width).toBe(786);
    expect(result.height).toBe(1704);
    expect(result.device).toBe("iphone");
    expect(result.chrome).toEqual([
      "status-bar-ios",
      "dynamic-island",
      "home-indicator",
    ]);
    expect(result.chromeRenderError).toBeUndefined();
    expect(result.pngBuffer.length).toBeGreaterThan(1000);
  });

  it("composeChrome (universal path) wraps a base PNG dataUri", async () => {
    // 1×1 transparent PNG
    const dataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9X0HuBkAAAAASUVORK5CYII=";
    const result = await renderer.composeChrome({
      baseImageDataUri: dataUri,
      device: "android",
      chrome: "auto",
    });
    expect(result.device).toBe("android");
    expect(result.chrome).toEqual(["status-bar-android", "android-gesture-pill"]);
    expect(result.svgString).toContain('<image href="data:image/png;base64,');
    expect(result.pngBuffer.length).toBeGreaterThan(500);
  });
});

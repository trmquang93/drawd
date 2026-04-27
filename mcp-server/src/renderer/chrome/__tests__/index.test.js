import { describe, it, expect } from "vitest";
import {
  expandAutoChrome,
  validateChrome,
  computeSafeArea,
  composeChromeSvg,
  getChromeInfo,
  AUTO_CHROME_BY_DEVICE,
  SUPPORTED_DEVICES,
} from "../index.js";

const IPHONE_VIEWPORT = { width: 393, height: 852 };
const ANDROID_VIEWPORT = { width: 412, height: 915 };

// ── expandAutoChrome ──────────────────────────────────────────────────────────

describe("expandAutoChrome", () => {
  it('returns the iPhone auto-list for "auto"', () => {
    expect(expandAutoChrome("auto", "iphone")).toEqual([
      "status-bar-ios",
      "dynamic-island",
      "home-indicator",
    ]);
  });

  it('returns the Android auto-list for "auto"', () => {
    expect(expandAutoChrome("auto", "android")).toEqual([
      "status-bar-android",
      "android-gesture-pill",
    ]);
  });

  it("treats undefined and null as auto", () => {
    expect(expandAutoChrome(undefined, "iphone")).toEqual(AUTO_CHROME_BY_DEVICE.iphone);
    expect(expandAutoChrome(null, "iphone")).toEqual(AUTO_CHROME_BY_DEVICE.iphone);
  });

  it("returns [] for explicit false (chrome disabled)", () => {
    expect(expandAutoChrome(false, "iphone")).toEqual([]);
  });

  it("returns [] for empty array (chrome explicitly disabled)", () => {
    expect(expandAutoChrome([], "iphone")).toEqual([]);
  });

  it("returns [] for auto on an unsupported device", () => {
    expect(expandAutoChrome("auto", "windows-phone")).toEqual([]);
  });

  it("passes through an explicit array unchanged when valid", () => {
    expect(expandAutoChrome(["status-bar-ios"], "iphone")).toEqual(["status-bar-ios"]);
  });

  it("rejects unknown chrome ids in an explicit array", () => {
    expect(() => expandAutoChrome(["bogus"], "iphone")).toThrow(/Unknown chrome element/);
  });

  it("rejects conflicting chrome elements (device-agnostic check)", () => {
    // No device → skip appliesTo gating, exercise the conflict rule directly.
    expect(() =>
      expandAutoChrome(["status-bar-ios", "status-bar-android"], undefined)
    ).toThrow(/conflict/);
  });

  it("rejects an element not applicable to the device before conflict checks", () => {
    expect(() =>
      expandAutoChrome(["status-bar-ios", "status-bar-android"], "iphone")
    ).toThrow(/does not apply/);
  });

  it("rejects an element not applicable to the device", () => {
    expect(() => expandAutoChrome(["dynamic-island"], "android")).toThrow(/does not apply/);
  });

  it("throws on an unrecognised input shape (e.g. string other than 'auto')", () => {
    expect(() => expandAutoChrome("yes-please", "iphone")).toThrow(/Invalid chrome value/);
  });
});

// ── validateChrome ────────────────────────────────────────────────────────────

describe("validateChrome", () => {
  it("accepts an empty array", () => {
    expect(() => validateChrome([], "iphone")).not.toThrow();
  });

  it("rejects non-array input", () => {
    expect(() => validateChrome("auto", "iphone")).toThrow(/must be an array/);
  });
});

// ── computeSafeArea ───────────────────────────────────────────────────────────

describe("computeSafeArea (max-by-edge)", () => {
  it("returns zero safe-area for empty list", () => {
    expect(computeSafeArea([], "iphone")).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it("for iPhone auto, top safeArea is dynamic-island's 59 (not status bar's 54)", () => {
    const sa = computeSafeArea(AUTO_CHROME_BY_DEVICE.iphone, "iphone");
    expect(sa.top).toBe(59);
    expect(sa.bottom).toBe(34);
    expect(sa.left).toBe(0);
    expect(sa.right).toBe(0);
  });

  it("for Android auto, contributes top: 36 and bottom: 16", () => {
    const sa = computeSafeArea(AUTO_CHROME_BY_DEVICE.android, "android");
    expect(sa.top).toBe(36);
    expect(sa.bottom).toBe(16);
  });
});

// ── composeChromeSvg ──────────────────────────────────────────────────────────

describe("composeChromeSvg", () => {
  const baseSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="393" height="852"><rect width="393" height="852" fill="#fff"/></svg>';

  it("wraps a Satori base SVG with a content group and chrome group", () => {
    const { svgString } = composeChromeSvg({
      baseSvg,
      device: "iphone",
      chrome: AUTO_CHROME_BY_DEVICE.iphone,
      viewport: IPHONE_VIEWPORT,
    });
    expect(svgString).toMatch(/^<svg /);
    expect(svgString).toContain('viewBox="0 0 393 852"');
    expect(svgString).toContain('<g id="content">');
    expect(svgString).toContain('<g id="chrome">');
    expect(svgString).toContain("chrome-status-bar-ios");
    expect(svgString).toContain("chrome-dynamic-island");
    expect(svgString).toContain("chrome-home-indicator");
  });

  it("wraps a base PNG dataUri (universal path)", () => {
    const dataUri =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9X0HuBkAAAAASUVORK5CYII=";
    const { svgString } = composeChromeSvg({
      baseImageDataUri: dataUri,
      device: "android",
      chrome: AUTO_CHROME_BY_DEVICE.android,
      viewport: ANDROID_VIEWPORT,
    });
    expect(svgString).toContain('<image href="data:image/png;base64,');
    expect(svgString).toContain('width="412"');
    expect(svgString).toContain("chrome-status-bar-android");
    expect(svgString).toContain("chrome-android-gesture-pill");
  });

  it("returns the safeArea computed from the chrome list", () => {
    const { safeArea } = composeChromeSvg({
      baseSvg,
      device: "iphone",
      chrome: ["status-bar-ios", "dynamic-island", "home-indicator"],
      viewport: IPHONE_VIEWPORT,
    });
    expect(safeArea).toEqual({ top: 59, bottom: 34, left: 0, right: 0 });
  });

  it("rejects when neither baseSvg nor baseImageDataUri provided", () => {
    expect(() =>
      composeChromeSvg({ device: "iphone", chrome: [], viewport: IPHONE_VIEWPORT })
    ).toThrow(/baseSvg or baseImageDataUri/);
  });

  it("rejects when both bases provided", () => {
    expect(() =>
      composeChromeSvg({
        baseSvg,
        baseImageDataUri: "data:image/png;base64,xxx",
        device: "iphone",
        chrome: [],
        viewport: IPHONE_VIEWPORT,
      })
    ).toThrow(/not both/);
  });

  it("rejects missing viewport", () => {
    expect(() =>
      composeChromeSvg({ baseSvg, device: "iphone", chrome: [], viewport: null })
    ).toThrow(/viewport/);
  });

  it("propagates appliesTo errors through composition", () => {
    expect(() =>
      composeChromeSvg({
        baseSvg,
        device: "iphone",
        chrome: ["status-bar-ios", "status-bar-android"],
        viewport: IPHONE_VIEWPORT,
      })
    ).toThrow(/does not apply/);
  });
});

// ── getChromeInfo ─────────────────────────────────────────────────────────────

describe("getChromeInfo", () => {
  it("with no args returns the full catalog", () => {
    const info = getChromeInfo();
    expect(info.devices).toBeDefined();
    expect(info.devices.map((d) => d.device).sort()).toEqual([...SUPPORTED_DEVICES].sort());
    expect(info.elements.length).toBe(5);
    const ids = info.elements.map((e) => e.id);
    expect(ids).toContain("status-bar-ios");
    expect(ids).toContain("dynamic-island");
  });

  it("with device only returns that device's auto chrome and safeArea", () => {
    const info = getChromeInfo({ device: "iphone" });
    expect(info.device).toBe("iphone");
    expect(info.chrome).toEqual(AUTO_CHROME_BY_DEVICE.iphone);
    expect(info.safeArea.top).toBe(59);
  });

  it("with device + explicit chrome returns the safeArea for that combo", () => {
    const info = getChromeInfo({ device: "iphone", chrome: ["status-bar-ios"] });
    expect(info.chrome).toEqual(["status-bar-ios"]);
    expect(info.safeArea).toEqual({ top: 54, bottom: 0, left: 0, right: 0 });
  });

  it("rejects unknown device", () => {
    expect(() => getChromeInfo({ device: "blackberry" })).toThrow(/Unknown device/);
  });
});

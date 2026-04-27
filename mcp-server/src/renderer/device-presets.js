// Canonical device viewports for MCP screen rendering.
//
// **v2 (item 2.8):** Reduced to two generic devices — `iphone` and
// `android` — that drive both viewport sizing and chrome composition.
// Previous SKU-named presets (iphone-15-pro, ipad, etc.) were removed
// when the chrome system shipped: agents now think in terms of "what
// device" not "which model", and chrome geometry is keyed off these two
// canonical viewports.

export const DEVICE_PRESETS = {
  iphone:  { width: 393, height: 852, deviceScaleFactor: 2, label: "iPhone (modern Pro class)" },
  android: { width: 412, height: 915, deviceScaleFactor: 2, label: "Android (Pixel class)" },
};

export const DEFAULT_DEVICE = "iphone";

// Re-export the chrome auto-expansion table from the chrome subsystem so
// callers that already depend on device-presets.js don't need to learn
// about the chrome module path.
export { AUTO_CHROME_BY_DEVICE } from "./chrome/defaults.js";

export function resolveViewport(device, customWidth, customHeight) {
  if (customWidth && customHeight) {
    return { width: customWidth, height: customHeight, deviceScaleFactor: 2 };
  }
  const preset = DEVICE_PRESETS[device || DEFAULT_DEVICE];
  if (!preset) {
    throw new Error(
      `Unknown device preset: ${device}. Available: ${Object.keys(DEVICE_PRESETS).join(", ")}`
    );
  }
  return {
    width: preset.width,
    height: preset.height,
    deviceScaleFactor: preset.deviceScaleFactor,
  };
}

/**
 * Reverse-lookup: which preset key matches an exact (width × height) pair?
 * Used by `compose_chrome` to infer device on uploaded/Figma screens that
 * have no persisted device. Considers both raw CSS dimensions and the 2×
 * Retina-rendered output (since some images are stored at output size).
 *
 * @returns {string|null} preset id or null if no match.
 */
export function inferDeviceFromDimensions(width, height) {
  for (const [id, preset] of Object.entries(DEVICE_PRESETS)) {
    if (preset.width === width && preset.height === height) return id;
    const dx = preset.width * preset.deviceScaleFactor;
    const dy = preset.height * preset.deviceScaleFactor;
    if (dx === width && dy === height) return id;
  }
  return null;
}

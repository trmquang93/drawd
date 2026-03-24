export const DEVICE_PRESETS = {
  "iphone-15-pro":       { width: 393, height: 852, deviceScaleFactor: 2, label: "iPhone 15 Pro" },
  "iphone-se":           { width: 375, height: 667, deviceScaleFactor: 2, label: "iPhone SE" },
  "iphone-16-pro-max":   { width: 440, height: 956, deviceScaleFactor: 2, label: "iPhone 16 Pro Max" },
  "ipad":                { width: 820, height: 1180, deviceScaleFactor: 2, label: "iPad" },
  "ipad-pro-13":         { width: 1032, height: 1376, deviceScaleFactor: 2, label: "iPad Pro 13\"" },
  "android":             { width: 412, height: 915, deviceScaleFactor: 2, label: "Android" },
  "android-tablet":      { width: 800, height: 1280, deviceScaleFactor: 2, label: "Android Tablet" },
};

export const DEFAULT_DEVICE = "iphone-15-pro";

export function resolveViewport(device, customWidth, customHeight) {
  if (customWidth && customHeight) {
    return { width: customWidth, height: customHeight, deviceScaleFactor: 2 };
  }
  const preset = DEVICE_PRESETS[device || DEFAULT_DEVICE];
  if (!preset) {
    throw new Error(`Unknown device preset: ${device}. Available: ${Object.keys(DEVICE_PRESETS).join(", ")}`);
  }
  return { width: preset.width, height: preset.height, deviceScaleFactor: preset.deviceScaleFactor };
}

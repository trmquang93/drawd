// Auto-expansion table: device → ordered list of chrome ids applied when
// `chrome === "auto"` (the default).
//
// This is the ONE place that says "iphone gets a status bar + island + home
// indicator". Everything else routes through expandAutoChrome() in index.js.

export const AUTO_CHROME_BY_DEVICE = {
  iphone: ["status-bar-ios", "dynamic-island", "home-indicator"],
  android: ["status-bar-android", "android-gesture-pill"],
};

export const SUPPORTED_DEVICES = Object.keys(AUTO_CHROME_BY_DEVICE);

export function isSupportedDevice(device) {
  return SUPPORTED_DEVICES.includes(device);
}

// Per-device validation helper: confirms that every id in `chromeList` is
// allowed on `device` (defers to registry-level appliesTo check in
// validateChrome). Kept here so callers can guard early without pulling
// the full chrome subsystem.
export function isAutoChrome(input) {
  return input === undefined || input === null || input === "auto";
}

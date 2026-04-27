// Per-element × per-device chrome rectangles.
// All coordinates are CSS pixels in the device viewport coordinate space.
// This is the SINGLE SOURCE OF TRUTH for chrome positioning — all variant
// modules ask for their bounds here, and tests assert against these values.
//
// Adding a new device or element = add a row here + a variant module + a
// registry entry. No other file should hard-code chrome geometry.

export const CHROME_GEOMETRY = {
  "status-bar-ios": {
    iphone: { x: 0, y: 0, w: 393, h: 54 },
  },
  "dynamic-island": {
    iphone: { x: 134, y: 11, w: 125, h: 37 },
  },
  "home-indicator": {
    iphone: { x: 130, y: 838, w: 134, h: 5 },
  },
  "status-bar-android": {
    android: { x: 0, y: 0, w: 412, h: 36 },
  },
  "android-gesture-pill": {
    android: { x: 130, y: 905, w: 152, h: 4 },
  },
};

export function getBounds(elementId, device) {
  const elem = CHROME_GEOMETRY[elementId];
  if (!elem) {
    throw new Error(`Unknown chrome element: ${elementId}`);
  }
  const bounds = elem[device];
  if (!bounds) {
    throw new Error(
      `Chrome element "${elementId}" has no geometry for device "${device}"`
    );
  }
  return bounds;
}

import { statusBarIos } from "./variants/status-bar-ios.js";
import { statusBarAndroid } from "./variants/status-bar-android.js";
import { dynamicIsland } from "./variants/dynamic-island.js";
import { homeIndicator } from "./variants/home-indicator.js";
import { androidGesturePill } from "./variants/android-gesture-pill.js";

// The canonical chrome registry. Adding a new chrome element = create a
// variant module under variants/ and add a row here.
//
// Each entry implements the ChromeElement contract:
//   id: string                     — unique id
//   appliesTo: string[]            — list of device presets it can be drawn on
//   conflicts: string[]            — list of element ids that cannot coexist
//   bounds({device}): {x,y,w,h}    — viewport-space rectangle
//   safeArea({device}): partial    — {top?, bottom?, left?, right?}
//   render({device, chromeStyle}): string  — SVG fragment, no <svg> wrapper

export const CHROME_ELEMENTS = {
  "status-bar-ios": statusBarIos,
  "status-bar-android": statusBarAndroid,
  "dynamic-island": dynamicIsland,
  "home-indicator": homeIndicator,
  "android-gesture-pill": androidGesturePill,
};

export const CHROME_IDS = Object.keys(CHROME_ELEMENTS);

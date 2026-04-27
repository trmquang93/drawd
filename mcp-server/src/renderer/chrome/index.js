// Public API for the chrome subsystem.
//
// Three things callers need:
//   1. expandAutoChrome(input, device) — turn "auto" / explicit-array / false
//      into the canonical list of chrome ids to render.
//   2. composeChromeSvg({...}) — produce a wrapper SVG that paints chrome on
//      top of either Satori-produced inner SVG or a base PNG (universal path).
//   3. getChromeInfo({device, chrome}) — let agents query safe-area and the
//      auto-expansion table BEFORE authoring HTML.

import { CHROME_ELEMENTS, CHROME_IDS } from "./registry.js";
import {
  AUTO_CHROME_BY_DEVICE,
  SUPPORTED_DEVICES,
  isSupportedDevice,
  isAutoChrome,
} from "./defaults.js";

export {
  CHROME_ELEMENTS,
  CHROME_IDS,
  AUTO_CHROME_BY_DEVICE,
  SUPPORTED_DEVICES,
  isSupportedDevice,
  isAutoChrome,
};

const ZERO_SAFE_AREA = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 });

/**
 * Resolve the user's chrome request into a concrete ordered list of ids.
 *
 * @param {("auto"|false|string[]|null|undefined)} input
 * @param {string} device — "iphone" | "android"
 * @returns {string[]} canonical chrome id list (empty when chrome is disabled
 *                     or device is unsupported).
 */
export function expandAutoChrome(input, device) {
  if (input === false) return [];
  if (isAutoChrome(input)) {
    if (!isSupportedDevice(device)) return [];
    return [...AUTO_CHROME_BY_DEVICE[device]];
  }
  if (Array.isArray(input)) {
    const list = [...input];
    validateChrome(list, device);
    return list;
  }
  throw new Error(
    `Invalid chrome value: ${JSON.stringify(input)}. Expected "auto", false, or an array of chrome ids.`
  );
}

/**
 * Validate a chrome list against device + conflict rules. Throws on the
 * first violation — never returns a "soft" warning.
 */
export function validateChrome(chromeList, device) {
  if (!Array.isArray(chromeList)) {
    throw new Error("chrome must be an array of element ids");
  }
  for (const id of chromeList) {
    const elem = CHROME_ELEMENTS[id];
    if (!elem) {
      throw new Error(
        `Unknown chrome element: "${id}". Valid: ${CHROME_IDS.join(", ")}`
      );
    }
    if (device && !elem.appliesTo.includes(device)) {
      throw new Error(
        `Chrome element "${id}" does not apply to device "${device}". Applies to: ${elem.appliesTo.join(", ")}`
      );
    }
  }
  for (let i = 0; i < chromeList.length; i++) {
    const a = CHROME_ELEMENTS[chromeList[i]];
    for (let j = i + 1; j < chromeList.length; j++) {
      const otherId = chromeList[j];
      if (a.conflicts.includes(otherId)) {
        throw new Error(
          `Chrome elements conflict: "${a.id}" and "${otherId}" cannot coexist.`
        );
      }
    }
  }
}

/**
 * Max-by-edge composition of safeArea contributions. Returns a fresh object
 * (never the frozen ZERO_SAFE_AREA).
 */
export function computeSafeArea(chromeList, device) {
  if (!chromeList || chromeList.length === 0) {
    return { ...ZERO_SAFE_AREA };
  }
  return chromeList.reduce(
    (acc, id) => {
      const sa = CHROME_ELEMENTS[id].safeArea({ device });
      return {
        top: Math.max(acc.top, sa.top ?? 0),
        bottom: Math.max(acc.bottom, sa.bottom ?? 0),
        left: Math.max(acc.left, sa.left ?? 0),
        right: Math.max(acc.right, sa.right ?? 0),
      };
    },
    { ...ZERO_SAFE_AREA }
  );
}

function renderChromeFragments(chromeList, device, chromeStyle) {
  return chromeList
    .map((id) => CHROME_ELEMENTS[id].render({ device, chromeStyle }))
    .join("\n");
}

// Extract the inner content of a satori-produced <svg>...</svg> wrapper so
// we can re-wrap it together with the chrome layer in one outer <svg>.
function stripSvgWrapper(svgString) {
  const match = svgString.match(/<svg[^>]*>([\s\S]*)<\/svg>\s*$/);
  return match ? match[1] : svgString;
}

/**
 * Compose chrome onto a base layer.
 *
 * Two modes — choose ONE of baseSvg / baseImageDataUri:
 *   - baseSvg: inner content (or full <svg>) from Satori. Stripped of its
 *              outer wrapper and re-inlined under <g id="content">.
 *   - baseImageDataUri: a "data:image/...;base64,..." string. Wrapped in
 *              <image href> at full viewport. Used by compose_chrome on
 *              uploaded / Figma-pasted screens.
 *
 * @param {Object} args
 * @param {string} [args.baseSvg]
 * @param {string} [args.baseImageDataUri]
 * @param {string} args.device — "iphone" | "android"
 * @param {string[]} args.chrome — already-expanded list of chrome ids
 * @param {string} [args.chromeStyle="light"]
 * @param {{width:number,height:number}} args.viewport
 * @returns {{ svgString: string, safeArea: {top,bottom,left,right} }}
 */
export function composeChromeSvg({
  baseSvg,
  baseImageDataUri,
  device,
  chrome,
  chromeStyle = "light",
  viewport,
}) {
  if (!viewport || !viewport.width || !viewport.height) {
    throw new Error("composeChromeSvg requires viewport with width and height");
  }
  if (!baseSvg && !baseImageDataUri) {
    throw new Error("composeChromeSvg requires either baseSvg or baseImageDataUri");
  }
  if (baseSvg && baseImageDataUri) {
    throw new Error("composeChromeSvg accepts baseSvg OR baseImageDataUri, not both");
  }

  validateChrome(chrome, device);

  const { width: w, height: h } = viewport;
  const safeArea = computeSafeArea(chrome, device);
  const chromeFragment = renderChromeFragments(chrome, device, chromeStyle);

  const baseLayer = baseSvg
    ? stripSvgWrapper(baseSvg)
    : `<image href="${baseImageDataUri}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none"/>`;

  const svgString =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<g id="content">${baseLayer}</g>` +
    `<g id="chrome">${chromeFragment}</g>` +
    `</svg>`;

  return { svgString, safeArea };
}

/**
 * Agent-facing query: "what chrome will I get for this device, and what
 * safe-area should my HTML respect?"
 *
 * Three call shapes:
 *   getChromeInfo({})                         → catalog of devices + elements
 *   getChromeInfo({device})                   → auto-chrome + safeArea for device
 *   getChromeInfo({device, chrome:["..."]})   → safeArea for an explicit set
 */
export function getChromeInfo({ device, chrome } = {}) {
  if (device !== undefined && !isSupportedDevice(device)) {
    throw new Error(
      `Unknown device: "${device}". Supported: ${SUPPORTED_DEVICES.join(", ")}`
    );
  }
  if (device && chrome !== undefined) {
    const expanded = expandAutoChrome(chrome, device);
    return {
      device,
      chrome: expanded,
      safeArea: computeSafeArea(expanded, device),
      autoChrome: AUTO_CHROME_BY_DEVICE[device],
    };
  }
  if (device) {
    const expanded = AUTO_CHROME_BY_DEVICE[device];
    return {
      device,
      chrome: expanded,
      safeArea: computeSafeArea(expanded, device),
      autoChrome: expanded,
    };
  }
  return {
    devices: SUPPORTED_DEVICES.map((d) => ({
      device: d,
      autoChrome: AUTO_CHROME_BY_DEVICE[d],
      safeArea: computeSafeArea(AUTO_CHROME_BY_DEVICE[d], d),
    })),
    elements: Object.values(CHROME_ELEMENTS).map((e) => ({
      id: e.id,
      appliesTo: e.appliesTo,
      conflicts: e.conflicts,
    })),
  };
}

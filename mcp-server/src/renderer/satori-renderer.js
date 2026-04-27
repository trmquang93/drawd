import { readFileSync } from "node:fs";
import { resolveViewport, DEVICE_PRESETS } from "./device-presets.js";
import { getEmojiCode, loadEmojiSvg } from "./emoji-loader.js";
import { composeChromeSvg, expandAutoChrome } from "./chrome/index.js";

// Dynamic imports resolved at runtime to support esbuild bundling
let _satori = null;
let _html = null;
let _Resvg = null;

async function loadDeps() {
  if (_satori) return;
  const satoriMod = await import("satori");
  _satori = satoriMod.default;
  const satoriHtmlMod = await import("satori-html");
  _html = satoriHtmlMod.html;
  const resvgMod = await import("@resvg/resvg-js");
  _Resvg = resvgMod.Resvg;
}

// In dev: import.meta.url = .../src/renderer/satori-renderer.js -> ../../assets/ = mcp-server/assets/
// In prod bundle: import.meta.url = .../dist/index.js -> ../../assets/ = mcp-server/assets/
//   (build.js copies assets/ into dist/assets/ but also leaves original assets/ in place)
// Use path relative to the repo root that works in both contexts by resolving from project root.
// Detect bundled mode: when running from dist/, assets are at dist/assets/; otherwise at assets/.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

function resolveAssetsDir() {
  // When bundled, __filename is dist/index.js; assets are at dist/assets/
  const distAssets = new URL("../assets/", import.meta.url);
  if (existsSync(fileURLToPath(distAssets))) return distAssets;
  // Dev mode: src/renderer/satori-renderer.js -> ../../assets/
  return new URL("../../assets/", import.meta.url);
}

const ASSETS_DIR = resolveAssetsDir();

export class SatoriRenderer {
  constructor() {
    this.fonts = null;
    // Resolved on init() — passed to Resvg so the chrome layer's <text>
    // glyphs render with the same Inter family Satori uses.
    this.resvgFontPaths = [];
  }

  async init() {
    await loadDeps();

    const regularUrl = new URL("Inter-Regular.ttf", ASSETS_DIR);
    const boldUrl = new URL("Inter-Bold.ttf", ASSETS_DIR);

    const regularFont = readFileSync(regularUrl);
    const boldFont = readFileSync(boldUrl);

    this.fonts = [
      { name: "Inter", data: regularFont, weight: 400, style: "normal" },
      { name: "Inter", data: boldFont, weight: 700, style: "normal" },
    ];

    this.resvgFontPaths = [fileURLToPath(regularUrl), fileURLToPath(boldUrl)];
  }

  /**
   * Render HTML to a PNG, optionally composing device chrome on top.
   *
   * Chrome integration:
   *   - `device` (default "iphone") drives viewport sizing AND chrome
   *     auto-expansion.
   *   - `chrome` accepts: "auto" (default; expands per device), false
   *     (no chrome), or an explicit array of element ids.
   *   - `chromeStyle` is "light" (default) or "dark".
   *
   * Fallback: if chrome composition throws (bad geometry, Resvg config
   * mismatch, etc.) we still return a usable PNG — just without chrome
   * — and surface `chromeRenderError: true` so callers can flag it.
   */
  async render(htmlString, options = {}) {
    if (!this.fonts) {
      throw new Error("SatoriRenderer not initialized. Call init() first.");
    }

    const { device, width, height, chrome, chromeStyle = "light" } = options;
    const viewport = resolveViewport(device, width, height);
    // Resolved device id (or null when only custom width/height was given —
    // chrome only applies when we know which device we're targeting).
    const resolvedDevice = (width && height) ? null : (device || "iphone");

    // satori-html does not decode HTML entities. Agents frequently write
    // numeric entities (&#9679;, &#x25cf;) and safe named entities (&bull;,
    // &hellip;) — decode them before parsing so they render as glyphs, not
    // literal text.
    const decodedHtml = decodeSafeEntities(htmlString);

    // Wrap bare content in a full-page container if needed
    const wrappedHtml = ensureRootContainer(decodedHtml, viewport.width, viewport.height);

    // Satori requires every element with multiple children to have an explicit
    // display property. Auto-inject display:flex;flex-direction:column on any
    // block-level element whose style attribute is missing a display declaration.
    const fixedHtml = injectMissingDisplay(wrappedHtml);

    // HTML string -> VDOM
    const markup = _html(fixedHtml);

    // VDOM -> SVG string
    const satoriSvg = await _satori(markup, {
      width: viewport.width,
      height: viewport.height,
      fonts: this.fonts,
      loadAdditionalAsset: async (code, segment) => {
        if (code === "emoji") {
          return await loadEmojiSvg(getEmojiCode(segment));
        }
        return [];
      },
    });

    // Chrome composition. Wrap in try/catch so a bad geometry / chrome bug
    // never prevents the user from getting a PNG back.
    const expandedChrome = expandAutoChrome(chrome, resolvedDevice);
    let composed = { svgString: satoriSvg, safeArea: { top: 0, bottom: 0, left: 0, right: 0 } };
    let chromeRenderError = null;

    if (resolvedDevice && expandedChrome.length > 0) {
      try {
        composed = composeChromeSvg({
          baseSvg: satoriSvg,
          device: resolvedDevice,
          chrome: expandedChrome,
          chromeStyle,
          viewport: { width: viewport.width, height: viewport.height },
        });
      } catch (err) {
        chromeRenderError = err.message || String(err);
      }
    }

    // SVG -> PNG buffer at 2x (Retina). Pass the Inter font files so that
    // chrome <text> elements render with the same family as Satori uses.
    const resvgOptions = {
      fitTo: { mode: "width", value: viewport.width * viewport.deviceScaleFactor },
      font: {
        fontFiles: this.resvgFontPaths,
        loadSystemFonts: false,
        defaultFontFamily: "Inter",
      },
    };
    const resvg = new _Resvg(composed.svgString, resvgOptions);
    const rendered = resvg.render();
    const pngBuffer = rendered.asPng();

    return {
      pngBuffer,
      svgString: composed.svgString,
      width: viewport.width * viewport.deviceScaleFactor,
      height: viewport.height * viewport.deviceScaleFactor,
      device: resolvedDevice,
      chrome: chromeRenderError ? [] : expandedChrome,
      chromeStyle,
      safeArea: chromeRenderError ? { top: 0, bottom: 0, left: 0, right: 0 } : composed.safeArea,
      ...(chromeRenderError ? { chromeRenderError } : {}),
    };
  }

  toDataUri(pngBuffer) {
    return `data:image/png;base64,${Buffer.from(pngBuffer).toString("base64")}`;
  }

  // No-op: kept for interface compatibility with HtmlRenderer
  async close() {}

  getAvailableDevices() {
    return Object.entries(DEVICE_PRESETS).map(([key, val]) => ({
      id: key,
      label: val.label,
      width: val.width,
      height: val.height,
    }));
  }
}

/**
 * Compose chrome onto an existing image (universal path).
 *
 * Used by the `compose_chrome` tool to retroactively chrome an uploaded
 * PNG, Figma-pasted screen, or a screen that was previously rendered
 * with chrome disabled. Re-uses the same Resvg config as `render` so
 * font/output behaviour is consistent.
 *
 * Either `baseSvg` (preferred — fast path for code-rendered screens with
 * cached svgContent) or `baseImageDataUri` is required.
 *
 * @returns {{ pngBuffer, svgString, width, height, device, chrome, chromeStyle, safeArea, chromeRenderError? }}
 */
SatoriRenderer.prototype.composeChrome = async function composeChrome({
  baseSvg,
  baseImageDataUri,
  device,
  chrome,
  chromeStyle = "light",
}) {
  if (!this.fonts) {
    throw new Error("SatoriRenderer not initialized. Call init() first.");
  }
  if (!device) {
    throw new Error("composeChrome requires a device id");
  }

  const viewport = resolveViewport(device);
  const expanded = expandAutoChrome(chrome, device);

  let svgString;
  let safeArea;
  let chromeRenderError = null;
  try {
    const composed = composeChromeSvg({
      baseSvg,
      baseImageDataUri,
      device,
      chrome: expanded,
      chromeStyle,
      viewport: { width: viewport.width, height: viewport.height },
    });
    svgString = composed.svgString;
    safeArea = composed.safeArea;
  } catch (err) {
    chromeRenderError = err.message || String(err);
    // Fallback: re-emit the base layer with no chrome so the screen is still usable.
    const baseLayer = baseSvg
      ? baseSvg
      : `<svg xmlns="http://www.w3.org/2000/svg" width="${viewport.width}" height="${viewport.height}" viewBox="0 0 ${viewport.width} ${viewport.height}"><image href="${baseImageDataUri}" x="0" y="0" width="${viewport.width}" height="${viewport.height}" preserveAspectRatio="none"/></svg>`;
    svgString = baseLayer;
    safeArea = { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const resvg = new _Resvg(svgString, {
    fitTo: { mode: "width", value: viewport.width * viewport.deviceScaleFactor },
    font: {
      fontFiles: this.resvgFontPaths,
      loadSystemFonts: false,
      defaultFontFamily: "Inter",
    },
  });
  const pngBuffer = resvg.render().asPng();

  return {
    pngBuffer,
    svgString,
    width: viewport.width * viewport.deviceScaleFactor,
    height: viewport.height * viewport.deviceScaleFactor,
    device,
    chrome: chromeRenderError ? [] : expanded,
    chromeStyle,
    safeArea,
    ...(chromeRenderError ? { chromeRenderError } : {}),
  };
};

/**
 * Satori requires every element with more than one child to have an explicit
 * display property (flex, contents, or none). This function injects
 * display:flex;flex-direction:column on any div/section/header/footer/main/nav
 * whose style attribute exists but lacks a display declaration.
 * Elements without a style attribute get one added as well.
 * This is safe: flex with a single child renders identically to block.
 */
function injectMissingDisplay(html) {
  const BLOCK_TAGS = "div|section|header|footer|main|nav|article|aside";
  const tagRe = new RegExp(`<(${BLOCK_TAGS})(\\s[^>]*)?>`, "gi");

  return html.replace(tagRe, (match, tag, attrs) => {
    if (!attrs) {
      // No attributes at all — add style with display:flex
      return `<${tag} style="display:flex;flex-direction:column;">`;
    }

    const styleMatch = attrs.match(/\bstyle="([^"]*)"/i);
    if (!styleMatch) {
      // Has other attributes but no style — inject style
      return `<${tag}${attrs} style="display:flex;flex-direction:column;">`;
    }

    const styleValue = styleMatch[1];
    if (/\bdisplay\s*:/.test(styleValue)) {
      // Already has display — leave untouched
      return match;
    }

    // Prepend display to existing style
    const newStyle = attrs.replace(
      /\bstyle="([^"]*)"/i,
      `style="display:flex;flex-direction:column;${styleValue}"`
    );
    return `<${tag}${newStyle}>`;
  });
}

/**
 * Ensures the HTML has a single root div that fills the viewport.
 * Satori requires a single root element with explicit dimensions.
 */
function ensureRootContainer(htmlString, width, height) {
  const trimmed = htmlString.trim();

  // If the content starts with a full HTML document tag, extract the body
  if (trimmed.toLowerCase().startsWith("<!doctype") || trimmed.toLowerCase().startsWith("<html")) {
    const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : trimmed;
    return `<div style="width:${width}px;height:${height}px;overflow:hidden;font-family:Inter,sans-serif;display:flex;flex-direction:column;">${bodyContent}</div>`;
  }

  // If it already has a single root div with width/height, use as-is
  if ((trimmed.startsWith("<div") || trimmed.startsWith("<section")) && !trimmed.slice(1).includes("<html")) {
    return trimmed;
  }

  // Wrap in a root container
  return `<div style="width:${width}px;height:${height}px;overflow:hidden;font-family:Inter,sans-serif;display:flex;flex-direction:column;">${trimmed}</div>`;
}

// Named entities whose decoded form contains no HTML metacharacter
// (<, >, &, ", '). Safe to decode before HTML parsing because the result
// can never be mistaken for markup. Deliberately excludes &amp;/&lt;/&gt;/
// &quot;/&apos; — decoding those would break the parser.
const SAFE_NAMED_ENTITIES = {
  nbsp: "\u00a0", copy: "\u00a9", reg: "\u00ae", trade: "\u2122",
  hellip: "\u2026", mdash: "\u2014", ndash: "\u2013",
  laquo: "\u00ab", raquo: "\u00bb", middot: "\u00b7", bull: "\u2022",
  deg: "\u00b0", plusmn: "\u00b1", times: "\u00d7", divide: "\u00f7",
  para: "\u00b6", sect: "\u00a7", dagger: "\u2020", Dagger: "\u2021",
  spades: "\u2660", clubs: "\u2663", hearts: "\u2665", diams: "\u2666",
  larr: "\u2190", uarr: "\u2191", rarr: "\u2192", darr: "\u2193",
  harr: "\u2194", crarr: "\u21b5", lArr: "\u21d0", rArr: "\u21d2",
  check: "\u2713", cross: "\u2717",
  lsquo: "\u2018", rsquo: "\u2019", ldquo: "\u201c", rdquo: "\u201d",
  prime: "\u2032", Prime: "\u2033",
};

function decodeSafeEntities(html) {
  return html
    .replace(/&#(\d+);/g, (match, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    })
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (match, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    })
    .replace(/&([a-zA-Z]+);/g, (match, name) => SAFE_NAMED_ENTITIES[name] || match);
}

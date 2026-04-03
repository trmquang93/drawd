import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolveViewport, DEVICE_PRESETS } from "./device-presets.js";

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
  }

  async init() {
    await loadDeps();

    const regularFont = readFileSync(new URL("Inter-Regular.ttf", ASSETS_DIR));
    const boldFont = readFileSync(new URL("Inter-Bold.ttf", ASSETS_DIR));

    this.fonts = [
      { name: "Inter", data: regularFont, weight: 400, style: "normal" },
      { name: "Inter", data: boldFont, weight: 700, style: "normal" },
    ];
  }

  async render(htmlString, options = {}) {
    if (!this.fonts) {
      throw new Error("SatoriRenderer not initialized. Call init() first.");
    }

    const { device, width, height } = options;
    const viewport = resolveViewport(device, width, height);

    // Wrap bare content in a full-page container if needed
    const wrappedHtml = ensureRootContainer(htmlString, viewport.width, viewport.height);

    // Satori requires every element with multiple children to have an explicit
    // display property. Auto-inject display:flex;flex-direction:column on any
    // block-level element whose style attribute is missing a display declaration.
    const fixedHtml = injectMissingDisplay(wrappedHtml);

    // HTML string -> VDOM
    const markup = _html(fixedHtml);

    // VDOM -> SVG string
    const svgString = await _satori(markup, {
      width: viewport.width,
      height: viewport.height,
      fonts: this.fonts,
    });

    // SVG -> PNG buffer at 2x (Retina)
    const resvg = new _Resvg(svgString, {
      fitTo: { mode: "width", value: viewport.width * viewport.deviceScaleFactor },
    });
    const rendered = resvg.render();
    const pngBuffer = rendered.asPng();

    return {
      pngBuffer,
      svgString,
      width: viewport.width * viewport.deviceScaleFactor,
      height: viewport.height * viewport.deviceScaleFactor,
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

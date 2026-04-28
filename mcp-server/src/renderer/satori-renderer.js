import { readFileSync } from "node:fs";
import { resolveViewport, DEVICE_PRESETS } from "./device-presets.js";
import { getEmojiCode, loadEmojiSvg } from "./emoji-loader.js";
import { composeChromeSvg, expandAutoChrome } from "./chrome/index.js";
import { Cache } from "../asset-fetchers/cache.js";
import { fetchBinary } from "../asset-fetchers/http.js";

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

// ── Remote image inlining ─────────────────────────────────────────────────────
//
// Satori cannot fetch image URLs itself — the renderer pre-pass downloads
// each <img src="https://..."> referenced in the HTML and rewrites the src
// to a base64 data URI. Failures fall back to a transparent 1×1 PNG so a
// single bad URL never breaks the whole render.
//
// SECURITY: only hosts on this allowlist are fetched. Any other src= URL
// is replaced with the transparent placeholder. This prevents prompt-injected
// HTML (e.g. an attacker-supplied `<img src="https://attacker.example/...">`)
// from causing the MCP to make arbitrary outbound requests.

const ALLOWED_IMAGE_HOSTS = new Set([
  "api.iconify.design",
  "images.unsplash.com",
  "api.unsplash.com",
  "api.pexels.com",
  "images.pexels.com",
  "picsum.photos",
  "fastly.picsum.photos",
]);

const TRANSPARENT_PNG_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";

const _imageBytesCache = new Cache({
  subdir: "images",
  encoding: "binary",
  ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
});

const IMG_TAG_RE = /<img\b[^>]*?\bsrc\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;

function isAllowedImageHost(rawUrl) {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_IMAGE_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace every literal `src="<url>"` and `src='<url>'` for `url` with a
 * `src="<replacement>"` data URI. We rebuild the regex per-URL rather than
 * doing one pass over the whole document so we can keep the URL-to-data-URI
 * mapping cleanly per-unique URL.
 */
function swapSrc(html, url, replacement) {
  const re = new RegExp(
    `src\\s*=\\s*["']${escapeRegex(url)}["']`,
    "g",
  );
  return html.replace(re, `src="${replacement}"`);
}

/**
 * Pre-process HTML by downloading and inlining any remote `<img src>` URLs
 * that point at our allowlisted hosts. Anything outside the allowlist or
 * any failed fetch is replaced with a transparent 1×1 PNG.
 *
 * Concurrency is capped at 4 in-flight downloads.
 *
 * @param {string} html
 * @param {Cache} [imageCache]   Override the module-level cache (mostly for tests).
 * @returns {Promise<{html: string, warnings: string[]}>}
 */
export async function inlineRemoteImages(html, imageCache = _imageBytesCache) {
  if (typeof html !== "string" || !html.includes("<img")) return { html, warnings: [] };

  const matches = [...html.matchAll(IMG_TAG_RE)];
  if (matches.length === 0) return { html, warnings: [] };

  const uniqueUrls = [...new Set(matches.map((m) => m[1]))];
  const warnings = [];

  // Resolve each unique URL to a data URI. Cap concurrency at 4.
  const results = new Map();
  const queue = [...uniqueUrls];
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift();
      const { dataUri, warning } = await resolveImageToDataUri(url, imageCache);
      results.set(url, dataUri);
      if (warning) warnings.push(warning);
    }
  });
  await Promise.all(workers);

  let out = html;
  for (const [url, dataUri] of results) {
    out = swapSrc(out, url, dataUri);
  }
  return { html: out, warnings };
}

async function resolveImageToDataUri(url, imageCache) {
  if (!isAllowedImageHost(url)) {
    process.stderr.write(
      `[drawd-mcp] Rejecting <img src> outside allowlist: ${safeHostFor(url)}\n`,
    );
    return { dataUri: TRANSPARENT_PNG_DATA_URI, warning: `${url} rejected by remote-image allowlist, replaced with transparent fallback` };
  }
  try {
    const cached = await imageCache.getOrFetch(url, async () => {
      const { bytes, contentType } = await fetchBinary(url);
      // Pack bytes + content-type into a single Buffer for binary cache.
      // Format: [4-byte BE length of contentType][contentType][bytes]
      const ctBuf = Buffer.from(contentType, "utf8");
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(ctBuf.length, 0);
      return Buffer.concat([lenBuf, ctBuf, bytes]);
    });
    if (!Buffer.isBuffer(cached) || cached.length < 4) {
      return { dataUri: TRANSPARENT_PNG_DATA_URI, warning: `${url} returned empty response, replaced with transparent fallback` };
    }
    const ctLen = cached.readUInt32BE(0);
    const contentType = cached.slice(4, 4 + ctLen).toString("utf8");
    const bytes = cached.slice(4 + ctLen);
    return { dataUri: `data:${contentType};base64,${bytes.toString("base64")}` };
  } catch (err) {
    process.stderr.write(
      `[drawd-mcp] Failed to inline ${safeHostFor(url)}: ${err.message}\n`,
    );
    return { dataUri: TRANSPARENT_PNG_DATA_URI, warning: `${url} fetch failed (${err.message}), replaced with transparent fallback` };
  }
}

function safeHostFor(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "(unparseable url)";
  }
}

export const _imageInlineInternals = {
  ALLOWED_IMAGE_HOSTS,
  TRANSPARENT_PNG_DATA_URI,
  imageBytesCache: _imageBytesCache,
};

// ──────────────────────────────────────────────────────────────────────────────

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

    // Inline any remote <img src="https://..."> URLs into base64 data URIs
    // before any other preprocessing. Satori cannot fetch URLs itself, so
    // unresolved <img> elements would otherwise render as broken/missing.
    // Hostname allowlist is enforced inside inlineRemoteImages (SSRF guard).
    const { html: inlinedHtml, warnings: imageWarnings } = await inlineRemoteImages(htmlString);

    // satori-html does not decode HTML entities. Agents frequently write
    // numeric entities (&#9679;, &#x25cf;) and safe named entities (&bull;,
    // &hellip;) — decode them before parsing so they render as glyphs, not
    // literal text.
    const decodedHtml = decodeSafeEntities(inlinedHtml);

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
      warnings: imageWarnings,
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

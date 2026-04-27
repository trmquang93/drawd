/**
 * Iconify provider.
 *
 * Iconify exposes 275k+ icons across collections like mdi (Material Design),
 * ph (Phosphor), lucide, tabler, heroicons, solar, carbon. We hit two
 * endpoints:
 *   GET https://api.iconify.design/{collection}/{name}.svg?height=...&color=...
 *   GET https://api.iconify.design/search?query=...&limit=...&prefix=...
 *
 * No API key required. SVGs are immutable per (collection, name) so the
 * disk cache has no TTL. Search results have a 7-day TTL because Iconify's
 * ranking can drift.
 */

import { Cache } from "./cache.js";
import { fetchText, fetchJson } from "./http.js";

export const ICONIFY_HOST = "api.iconify.design";

/** Curated list of collections we recommend in tool descriptions. Advisory only. */
export const RECOMMENDED_COLLECTIONS = [
  "mdi",
  "ph",
  "lucide",
  "tabler",
  "heroicons",
  "solar",
  "carbon",
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const svgCache = new Cache({
  subdir: "icons",
  encoding: "text",
  extension: ".svg",
});

const searchCache = new Cache({
  subdir: "icon-search",
  encoding: "json",
  ttlMs: SEVEN_DAYS_MS,
});

/**
 * Validate a single iconify slug component (collection or icon name).
 * Iconify slugs are restricted to lowercase letters, digits, and hyphens.
 * Reject anything else to prevent path-traversal / SSRF via crafted names.
 */
function isSafeSlug(s) {
  return typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/.test(s);
}

/**
 * Fetch one icon by collection + name.
 *
 * @param {string} collection  e.g. "mdi"
 * @param {string} name        e.g. "home"
 * @param {object} [opts]
 * @param {number} [opts.size=24]
 * @param {string} [opts.color="currentColor"]
 * @returns {Promise<string>}  SVG text
 */
export async function fetchIcon(collection, name, opts = {}) {
  if (!isSafeSlug(collection)) {
    throw new Error(`Invalid iconify collection slug: ${collection}`);
  }
  if (!isSafeSlug(name)) {
    throw new Error(`Invalid iconify icon name: ${name}`);
  }

  const size = Number.isFinite(opts.size) ? Math.max(1, Math.min(512, opts.size)) : 24;
  const color = typeof opts.color === "string" && opts.color.length > 0
    ? opts.color
    : "currentColor";

  const url = `https://${ICONIFY_HOST}/${collection}/${encodeURIComponent(name)}.svg?height=${size}&color=${encodeURIComponent(color)}`;

  const cacheKey = `${collection}:${name}:${size}:${color}`;
  const filename = `${collection}__${name}__${size}__${encodeURIComponent(color)}`;

  return svgCache.getOrFetch(cacheKey, async () => {
    const text = await fetchText(url);
    // Iconify returns a 200 with an SVG containing `<g/>` for not-found
    // glyphs. Normalise that to a clear error.
    if (!text.includes("<svg") || /<svg[^>]*>\s*<\/svg>/.test(text)) {
      throw new Error(`Icon not found: ${collection}:${name}`);
    }
    return text;
  }, { filename });
}

/**
 * Search Iconify across all (or one) collections.
 *
 * @param {string} query
 * @param {object} [opts]
 * @param {string} [opts.prefix]   Restrict to one collection.
 * @param {number} [opts.limit=12] Max results (1..64).
 * @returns {Promise<{results: Array<{id:string, collection:string, name:string}>, total:number}>}
 */
export async function searchIcons(query, opts = {}) {
  if (typeof query !== "string" || query.trim() === "") {
    throw new Error("query is required");
  }
  const limit = Math.max(
    1,
    Math.min(64, Number.isFinite(opts.limit) ? opts.limit : 12),
  );
  const prefix = opts.prefix && isSafeSlug(opts.prefix) ? opts.prefix : null;

  const params = new URLSearchParams({
    query: query.trim(),
    limit: String(limit),
  });
  if (prefix) params.set("prefix", prefix);

  const url = `https://${ICONIFY_HOST}/search?${params.toString()}`;
  const cacheKey = `${query}|${prefix || ""}|${limit}`;

  return searchCache.getOrFetch(cacheKey, async () => {
    const json = await fetchJson(url);
    const icons = Array.isArray(json?.icons) ? json.icons : [];
    const results = icons.map((id) => {
      const [collection, ...rest] = String(id).split(":");
      return { id, collection, name: rest.join(":") };
    });
    return { results, total: results.length };
  });
}

// Exposed for tests.
export const _internal = { svgCache, searchCache };

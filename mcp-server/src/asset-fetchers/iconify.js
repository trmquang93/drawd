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
 * Low-level single-term Iconify search (cached).
 *
 * @param {string} term       Single keyword.
 * @param {object} params
 * @param {number} params.limit
 * @param {string|null} params.prefix
 * @returns {Promise<{results: Array<{id:string, collection:string, name:string}>, total:number}>}
 */
async function searchSingle(term, { limit, prefix }) {
  const params = new URLSearchParams({
    query: term,
    limit: String(limit),
  });
  if (prefix) params.set("prefix", prefix);

  const url = `https://${ICONIFY_HOST}/search?${params.toString()}`;
  const cacheKey = `${term}|${prefix || ""}|${limit}`;

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

/**
 * Search Iconify across all (or one) collections.
 *
 * Multi-word queries are automatically tokenized: each term is searched
 * independently and results are merged + ranked by overlap (number of terms
 * matched, then best individual rank). If no results match, returns
 * `suggestions[]` with the individual terms so the caller can retry.
 *
 * @param {string} query
 * @param {object} [opts]
 * @param {string} [opts.prefix]   Restrict to one collection.
 * @param {number} [opts.limit=12] Max results (1..64).
 * @returns {Promise<{results: Array<{id:string, collection:string, name:string}>, total:number, suggestions?:string[], message?:string}>}
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

  const terms = query.trim().split(/\s+/).filter(Boolean);

  // Single term: direct API search (backward-compatible path).
  if (terms.length === 1) {
    return searchSingle(terms[0], { limit, prefix });
  }

  // Multi-word: search each term, merge + rank by overlap.
  const perTerm = await Promise.all(
    terms.map((term) => searchSingle(term, { limit, prefix })),
  );

  // iconId → { icon, termCount, bestRank }
  const iconMap = new Map();
  for (let t = 0; t < perTerm.length; t++) {
    const { results } = perTerm[t];
    for (let rank = 0; rank < results.length; rank++) {
      const icon = results[rank];
      const existing = iconMap.get(icon.id);
      if (existing) {
        existing.termCount += 1;
        existing.bestRank = Math.min(existing.bestRank, rank);
      } else {
        iconMap.set(icon.id, { icon, termCount: 1, bestRank: rank });
      }
    }
  }

  const merged = [...iconMap.values()]
    .sort((a, b) => b.termCount - a.termCount || a.bestRank - b.bestRank)
    .slice(0, limit)
    .map((e) => e.icon);

  if (merged.length === 0) {
    return {
      results: [],
      total: 0,
      suggestions: terms,
      message:
        "No icons matched the full phrase. Try one of these single-keyword searches.",
    };
  }

  return { results: merged, total: merged.length };
}

// Exposed for tests.
export const _internal = { svgCache, searchCache };

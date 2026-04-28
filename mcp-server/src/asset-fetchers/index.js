/**
 * Stock-image orchestrator.
 *
 * Implements the fallback chain Unsplash → Pexels → Picsum. When the agent
 * picks an explicit `source`, we honour it and only fall back if the keyed
 * provider's env var is unset (MissingApiKeyError). All other failures
 * propagate up so the agent sees a real error message.
 *
 * The result envelope optionally carries a `warning` describing any
 * silent fallback that occurred — agents can surface it to the user.
 */

import * as unsplash from "./unsplash.js";
import * as pexels from "./pexels.js";
import * as picsum from "./picsum.js";
import { MissingApiKeyError } from "./errors.js";

export { MissingApiKeyError };

const PROVIDERS = {
  unsplash,
  pexels,
  picsum,
};

const DEFAULT_ORDER = ["unsplash", "pexels", "picsum"];

function hasKey(source) {
  if (source === "unsplash") return !!process.env.UNSPLASH_ACCESS_KEY;
  if (source === "pexels") return !!process.env.PEXELS_API_KEY;
  if (source === "picsum") return true;
  return false;
}

/**
 * @param {string} query
 * @param {object} [opts]
 * @param {"unsplash"|"pexels"|"picsum"} [opts.source]
 * @param {number} [opts.limit=5]
 * @returns {Promise<{results: Array<object>, source: string, warning?: string}>}
 */
export async function findStockImage(query, opts = {}) {
  if (typeof query !== "string" || query.trim() === "") {
    throw new Error("query is required");
  }
  const limit = Math.max(1, Math.min(20, Number.isFinite(opts.limit) ? opts.limit : 5));

  // Determine order: if source is given, try it first, then fall through
  // remaining providers in default order. Otherwise use default order.
  const order = opts.source
    ? [opts.source, ...DEFAULT_ORDER.filter((s) => s !== opts.source)]
    : [...DEFAULT_ORDER];

  const warnings = [];
  for (const source of order) {
    const provider = PROVIDERS[source];
    if (!provider) continue;
    try {
      const result = await Promise.resolve(provider.searchPhotos(query, { limit }));
      const out = { ...result, source };
      if (source === "picsum") {
        const picsumMsg = `RANDOM photos \u2014 Picsum ignores your query ("${query}"). For relevant results, set UNSPLASH_ACCESS_KEY.`;
        out.warning = warnings.length > 0
          ? warnings.join(" ") + " " + picsumMsg
          : picsumMsg;
      } else if (warnings.length > 0) {
        out.warning = warnings.join(" ");
      }
      return out;
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        warnings.push(
          `${err.envVar} is not set. Falling through to next provider.`,
        );
        continue;
      }
      throw err;
    }
  }

  // Should be unreachable since picsum is keyless and never throws,
  // but guard against it.
  throw new Error("No stock-image provider succeeded");
}

export { hasKey };

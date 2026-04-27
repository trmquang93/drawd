/**
 * Shared HTTP helper for asset providers (Iconify, Unsplash, Pexels, Picsum,
 * and the renderer's image-inlining pre-pass).
 *
 * Wraps native fetch() with AbortSignal.timeout() so callers don't have to
 * wire up the same boilerplate per call. Defaults are tuned for asset
 * fetches: 4 s for SVG/JSON, 8 s for binary photo downloads.
 */

export const DEFAULT_TIMEOUT_MS = 4000;
export const DEFAULT_BINARY_TIMEOUT_MS = 8000;

/**
 * @param {string} url
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]      Override per-call timeout.
 * @param {Record<string,string>} [opts.headers]
 * @param {string} [opts.method="GET"]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, opts = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    headers,
    method = "GET",
  } = opts;

  const res = await fetch(url, {
    method,
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res;
}

/**
 * Convenience: fetch a URL and return the body as text.
 * Throws on non-2xx with a message that includes the status code.
 */
export async function fetchText(url, opts = {}) {
  const res = await fetchWithTimeout(url, opts);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

/**
 * Convenience: fetch a URL and return the parsed JSON body.
 */
export async function fetchJson(url, opts = {}) {
  const res = await fetchWithTimeout(url, opts);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.json();
}

/**
 * Convenience: fetch a URL as raw bytes. Returns { bytes, contentType }.
 * Used by the image-inlining pre-pass.
 */
export async function fetchBinary(url, opts = {}) {
  const res = await fetchWithTimeout(url, {
    timeoutMs: DEFAULT_BINARY_TIMEOUT_MS,
    ...opts,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { bytes: buffer, contentType };
}

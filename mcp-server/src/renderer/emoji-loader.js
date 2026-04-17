import { readFile, writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const TWEMOJI_VERSION = "15.1.0";
const CDN_BASE = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_VERSION}/assets/svg`;
const CACHE_DIR = join(homedir(), ".cache", "drawd-mcp", "emoji");
const FETCH_TIMEOUT_MS = 3000;

const TRANSPARENT_SVG_DATA_URI =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"/>'
  ).toString("base64");

const resolvedCache = new Map();
const inFlight = new Map();
const warnedCodes = new Set();

let cacheDirEnsured = null;

async function ensureCacheDir() {
  if (!cacheDirEnsured) {
    cacheDirEnsured = mkdir(CACHE_DIR, { recursive: true }).catch(() => null);
  }
  return cacheDirEnsured;
}

function toDataUri(svgText) {
  return `data:image/svg+xml;base64,${Buffer.from(svgText, "utf8").toString("base64")}`;
}

function toCodePoint(rune, sep = "-") {
  const r = [];
  let p = 0;
  let i = 0;
  while (i < rune.length) {
    const c = rune.charCodeAt(i++);
    if (p) {
      r.push((0x10000 + ((p - 0xd800) << 10) + (c - 0xdc00)).toString(16));
      p = 0;
    } else if (c >= 0xd800 && c <= 0xdbff) {
      p = c;
    } else {
      r.push(c.toString(16));
    }
  }
  return r.join(sep);
}

// Returns [primary, fallback]. jdecked/twemoji asset names mostly follow
// Twemoji's canonical rule (strip U+FE0F unless the sequence contains U+200D),
// but there are inconsistencies — e.g. "eye in speech bubble" is stored without
// FE0F despite being a ZWJ sequence. We try the canonical name first and fall
// back to the fully-stripped variant so both patterns resolve.
export function getEmojiCode(segment) {
  const hasZwj = segment.includes("\u200d");
  const stripped = toCodePoint(segment.replace(/\ufe0f/g, ""));
  if (!hasZwj) return [stripped, null];
  const kept = toCodePoint(segment);
  return kept === stripped ? [kept, null] : [kept, stripped];
}

async function readDisk(code) {
  try {
    const svg = await readFile(join(CACHE_DIR, `${code}.svg`), "utf8");
    return toDataUri(svg);
  } catch {
    return null;
  }
}

async function writeDisk(code, svgText) {
  try {
    await ensureCacheDir();
    await writeFile(join(CACHE_DIR, `${code}.svg`), svgText, "utf8");
  } catch {
    // Silently ignore: read-only FS, permissions, etc.
  }
}

async function fetchFromCdn(code) {
  const url = `${CDN_BASE}/${code}.svg`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`Twemoji fetch ${code}: HTTP ${res.status}`);
  }
  return await res.text();
}

async function resolveOne(code) {
  const fromDisk = await readDisk(code);
  if (fromDisk) return fromDisk;

  const svgText = await fetchFromCdn(code);
  await writeDisk(code, svgText);
  return toDataUri(svgText);
}

async function resolveEmoji(primary, fallback) {
  try {
    return await resolveOne(primary);
  } catch (err) {
    if (!fallback) throw err;
    return await resolveOne(fallback);
  }
}

export async function loadEmojiSvg(codes) {
  const [primary, fallback] = Array.isArray(codes) ? codes : [codes, null];

  const cached = resolvedCache.get(primary);
  if (cached) return cached;

  const pending = inFlight.get(primary);
  if (pending) return pending;

  const promise = resolveEmoji(primary, fallback)
    .then((dataUri) => {
      resolvedCache.set(primary, dataUri);
      return dataUri;
    })
    .catch((err) => {
      if (!warnedCodes.has(primary)) {
        warnedCodes.add(primary);
        console.warn(`[drawd-mcp] emoji ${primary} unavailable: ${err.message}`);
      }
      resolvedCache.set(primary, TRANSPARENT_SVG_DATA_URI);
      return TRANSPARENT_SVG_DATA_URI;
    })
    .finally(() => {
      inFlight.delete(primary);
    });

  inFlight.set(primary, promise);
  return promise;
}

/**
 * Three-tier cache: in-flight Map → in-memory Map → on-disk file.
 *
 * The pattern is lifted directly from `renderer/emoji-loader.js` and
 * generalised so icons, search results, and image bytes can all share it.
 *
 * - In-flight: dedupes concurrent requests for the same key into one fetch.
 * - In-memory: process-lifetime cache for repeated lookups.
 * - On-disk: survives process restarts, stored under
 *   `~/.cache/drawd-mcp/<subdir>/<filename>`.
 *
 * Disk failures (read-only FS, permissions, ENOSPC) are silently ignored
 * — the in-memory tier still serves the value for the rest of the session.
 */

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = join(homedir(), ".cache", "drawd-mcp");

/**
 * Create a stable, filename-safe key from any string input.
 * Used by callers that want to cache by URL or query.
 */
export function hashKey(input) {
  return createHash("sha1").update(String(input)).digest("hex");
}

/**
 * Generic three-tier cache.
 *
 * @template T
 */
export class Cache {
  /**
   * @param {object} opts
   * @param {string} opts.subdir            Subdirectory under ~/.cache/drawd-mcp
   * @param {(filename: string) => Promise<T|null>} [opts.readDisk]
   * @param {(filename: string, value: T) => Promise<void>} [opts.writeDisk]
   * @param {string} [opts.extension=".bin"]  Used by the default disk readers/writers
   * @param {"text"|"binary"|"json"} [opts.encoding="text"]
   * @param {number|null} [opts.ttlMs=null]    Optional TTL for disk entries (search results)
   */
  constructor(opts) {
    this.subdir = opts.subdir;
    this.encoding = opts.encoding || "text";
    this.extension = opts.extension || (
      this.encoding === "binary" ? ".bin" :
      this.encoding === "json" ? ".json" :
      ".txt"
    );
    this.ttlMs = opts.ttlMs ?? null;
    this.readDiskFn = opts.readDisk;
    this.writeDiskFn = opts.writeDisk;

    this.dir = join(ROOT, this.subdir);
    this.memory = new Map();
    this.inFlight = new Map();
    this._dirEnsured = null;
  }

  async ensureDir() {
    if (!this._dirEnsured) {
      this._dirEnsured = mkdir(this.dir, { recursive: true }).catch(() => null);
    }
    return this._dirEnsured;
  }

  /** Resolve a key to an absolute disk path. */
  pathFor(filename) {
    return join(this.dir, filename + this.extension);
  }

  async readDisk(filename) {
    if (this.readDiskFn) return this.readDiskFn(filename, this);
    const file = this.pathFor(filename);
    try {
      if (this.ttlMs != null) {
        const s = await stat(file);
        if (Date.now() - s.mtimeMs > this.ttlMs) return null;
      }
      if (this.encoding === "binary") {
        return await readFile(file);
      } else if (this.encoding === "json") {
        const txt = await readFile(file, "utf8");
        return JSON.parse(txt);
      }
      return await readFile(file, "utf8");
    } catch {
      return null;
    }
  }

  async writeDisk(filename, value) {
    if (this.writeDiskFn) return this.writeDiskFn(filename, value, this);
    try {
      await this.ensureDir();
      const file = this.pathFor(filename);
      if (this.encoding === "binary") {
        await writeFile(file, value);
      } else if (this.encoding === "json") {
        await writeFile(file, JSON.stringify(value), "utf8");
      } else {
        await writeFile(file, value, "utf8");
      }
    } catch {
      // Silently ignore disk failures.
    }
  }

  /**
   * Get a value, falling back through tiers in order.
   *
   * @param {string} key                          Logical cache key (e.g. URL).
   * @param {() => Promise<T>} fetcher            Network fallback.
   * @param {object} [opts]
   * @param {string} [opts.filename=hashKey(key)] Custom on-disk filename (no extension).
   * @returns {Promise<T>}
   */
  async getOrFetch(key, fetcher, opts = {}) {
    if (this.memory.has(key)) return this.memory.get(key);

    const inFlight = this.inFlight.get(key);
    if (inFlight) return inFlight;

    const filename = opts.filename || hashKey(key);

    const promise = (async () => {
      const fromDisk = await this.readDisk(filename);
      if (fromDisk != null) {
        this.memory.set(key, fromDisk);
        return fromDisk;
      }
      const fresh = await fetcher();
      this.memory.set(key, fresh);
      // Fire-and-forget the disk write — never let cache writes block callers.
      this.writeDisk(filename, fresh).catch(() => {});
      return fresh;
    })()
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  /** Clear the in-memory tier (disk entries survive). Mostly used by tests. */
  clearMemory() {
    this.memory.clear();
    this.inFlight.clear();
  }
}

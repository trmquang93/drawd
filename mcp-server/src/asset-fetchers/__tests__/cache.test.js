// @vitest-environment node
//
// Cache uses real fs/promises, so use the node env (avoid jsdom intercepting node: imports).

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Cache, hashKey } from "../cache.js";

const uniqueSubdir = () =>
  `test-cache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe("hashKey", () => {
  it("produces a stable hex string", () => {
    expect(hashKey("foo")).toMatch(/^[0-9a-f]{40}$/);
    expect(hashKey("foo")).toBe(hashKey("foo"));
    expect(hashKey("foo")).not.toBe(hashKey("bar"));
  });
});

describe("Cache", () => {
  let cache;
  beforeEach(() => {
    cache = new Cache({ subdir: uniqueSubdir(), encoding: "text" });
  });

  it("caches the fetcher result in memory after first call", async () => {
    const fetcher = vi.fn(async () => "value-1");
    const r1 = await cache.getOrFetch("k", fetcher);
    const r2 = await cache.getOrFetch("k", fetcher);
    expect(r1).toBe("value-1");
    expect(r2).toBe("value-1");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent in-flight requests", async () => {
    let resolveOuter;
    const fetcher = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveOuter = resolve;
        })
    );
    // disable disk reads so the in-flight slot is set synchronously enough
    cache.readDisk = async () => null;
    const p1 = cache.getOrFetch("dup", fetcher);
    const p2 = cache.getOrFetch("dup", fetcher);
    // Yield microtasks so the readDisk(null) await resolves and the fetcher fires.
    await Promise.resolve();
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    resolveOuter("dup-value");
    const [v1, v2] = await Promise.all([p1, p2]);
    expect(v1).toBe("dup-value");
    expect(v2).toBe("dup-value");
  });

  it("falls back to fetcher again after clearMemory", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("v1")
      .mockResolvedValueOnce("v2");

    const r1 = await cache.getOrFetch("k", fetcher);
    cache.clearMemory();
    // disk write is fire-and-forget; it may or may not have landed before
    // the next call. To make this test deterministic, override readDisk.
    cache.readDisk = async () => null;
    const r2 = await cache.getOrFetch("k", fetcher);
    expect(r1).toBe("v1");
    expect(r2).toBe("v2");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("propagates fetcher errors and removes the in-flight slot", async () => {
    const err = new Error("boom");
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("recovered");

    await expect(cache.getOrFetch("err", fetcher)).rejects.toThrow("boom");
    cache.readDisk = async () => null;
    const r2 = await cache.getOrFetch("err", fetcher);
    expect(r2).toBe("recovered");
  });
});

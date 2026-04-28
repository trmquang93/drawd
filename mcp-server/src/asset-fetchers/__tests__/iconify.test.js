// @vitest-environment node

import { describe, it, expect, beforeEach, vi } from "vitest";
import { fetchIcon, searchIcons, _internal } from "../iconify.js";

function mockFetchOnce(body, { ok = true, status = 200 } = {}) {
  const res = {
    ok,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
    headers: new Map(),
  };
  global.fetch = vi.fn(async () => res);
}

describe("iconify.fetchIcon", () => {
  beforeEach(() => {
    _internal.svgCache.clearMemory();
    // disable disk reads so tests don't depend on fs state
    _internal.svgCache.readDisk = async () => null;
  });

  it("constructs the iconify URL with size and color params", async () => {
    mockFetchOnce("<svg xmlns=\"http://www.w3.org/2000/svg\"><path/></svg>");
    await fetchIcon("mdi", "home", { size: 32, color: "#ff0000" });
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("https://api.iconify.design/mdi/home.svg");
    expect(calledUrl).toContain("height=32");
    expect(calledUrl).toContain("color=%23ff0000");
  });

  it("rejects unsafe collection slugs", async () => {
    await expect(fetchIcon("../etc", "home")).rejects.toThrow(/Invalid iconify collection/);
  });

  it("rejects unsafe icon names", async () => {
    await expect(fetchIcon("mdi", "home/passwd")).rejects.toThrow(/Invalid iconify icon/);
  });

  it("rejects empty SVG bodies as not-found", async () => {
    mockFetchOnce("<svg></svg>");
    await expect(fetchIcon("mdi", "missing")).rejects.toThrow(/Icon not found/);
  });

  it("returns the SVG body verbatim on success", async () => {
    const body = "<svg xmlns=\"http://www.w3.org/2000/svg\"><circle r=\"4\"/></svg>";
    mockFetchOnce(body);
    const out = await fetchIcon("mdi", "home");
    expect(out).toBe(body);
  });

  it("uses cache on second lookup", async () => {
    const body = "<svg xmlns=\"http://www.w3.org/2000/svg\"><path/></svg>";
    mockFetchOnce(body);
    await fetchIcon("mdi", "home");
    await fetchIcon("mdi", "home");
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

/** Route fetch responses by query param in the URL. */
function mockFetchByQuery(map) {
  global.fetch = vi.fn(async (url) => {
    const u = new URL(url);
    const query = u.searchParams.get("query");
    const body = map[query] || { icons: [] };
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
      json: async () => body,
      headers: new Map(),
    };
  });
}

describe("iconify.searchIcons", () => {
  beforeEach(() => {
    _internal.searchCache.clearMemory();
    _internal.searchCache.readDisk = async () => null;
  });

  it("returns normalized {results,total} from iconify response", async () => {
    mockFetchOnce({ icons: ["mdi:home", "ph:house"] });
    const out = await searchIcons("home");
    expect(out.total).toBe(2);
    expect(out.results).toEqual([
      { id: "mdi:home", collection: "mdi", name: "home" },
      { id: "ph:house", collection: "ph", name: "house" },
    ]);
  });

  it("clamps limit between 1 and 64", async () => {
    mockFetchOnce({ icons: [] });
    await searchIcons("home", { limit: 9999 });
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("limit=64");
  });

  it("requires a non-empty query", async () => {
    await expect(searchIcons("")).rejects.toThrow(/query is required/);
  });

  it("passes prefix when provided", async () => {
    mockFetchOnce({ icons: [] });
    await searchIcons("home", { prefix: "mdi" });
    const calledUrl = global.fetch.mock.calls[0][0];
    expect(calledUrl).toContain("prefix=mdi");
  });
});

describe("iconify.searchIcons — multi-word queries", () => {
  beforeEach(() => {
    _internal.searchCache.clearMemory();
    _internal.searchCache.readDisk = async () => null;
  });

  it("merges results across terms, ranked by overlap then best rank", async () => {
    mockFetchByQuery({
      crown: { icons: ["mdi:crown", "ph:crown-fill", "mdi:chess-king"] },
      premium: { icons: ["mdi:star-circle", "ph:crown-fill", "mdi:crown"] },
    });

    const out = await searchIcons("crown premium");

    // ph:crown-fill and mdi:crown appear in both term results (termCount=2)
    // ph:crown-fill has bestRank=1 (from "crown"), mdi:crown has bestRank=0 (from "crown")
    // So mdi:crown should come first (termCount=2, bestRank=0), then ph:crown-fill (termCount=2, bestRank=1)
    expect(out.results[0].id).toBe("mdi:crown");
    expect(out.results[1].id).toBe("ph:crown-fill");
    // Remaining icons appear in only one term (termCount=1)
    expect(out.total).toBe(4);
    expect(out.suggestions).toBeUndefined();
  });

  it("returns suggestions when no results match any term", async () => {
    mockFetchByQuery({
      xyzzy: { icons: [] },
      plugh: { icons: [] },
    });

    const out = await searchIcons("xyzzy plugh");

    expect(out.results).toEqual([]);
    expect(out.total).toBe(0);
    expect(out.suggestions).toEqual(["xyzzy", "plugh"]);
    expect(out.message).toMatch(/single-keyword/i);
  });

  it("respects limit on merged results", async () => {
    mockFetchByQuery({
      home: { icons: ["mdi:home", "ph:house", "lucide:home"] },
      door: { icons: ["mdi:door", "ph:door-open", "lucide:door-closed"] },
    });

    const out = await searchIcons("home door", { limit: 3 });
    expect(out.results).toHaveLength(3);
    expect(out.total).toBe(3);
  });

  it("passes prefix to each per-term search", async () => {
    mockFetchByQuery({
      star: { icons: ["mdi:star"] },
      gold: { icons: ["mdi:gold"] },
    });

    await searchIcons("star gold", { prefix: "mdi" });

    for (const call of global.fetch.mock.calls) {
      expect(call[0]).toContain("prefix=mdi");
    }
  });

  it("single-word query still works (backward compat)", async () => {
    mockFetchOnce({ icons: ["mdi:menu", "ph:list"] });
    const out = await searchIcons("menu");
    expect(out.total).toBe(2);
    expect(out.results[0].id).toBe("mdi:menu");
    expect(out.suggestions).toBeUndefined();
  });
});

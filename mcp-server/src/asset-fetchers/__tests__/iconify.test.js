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

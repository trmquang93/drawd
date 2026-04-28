// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";
import { assetTools, handleAssetTool } from "../asset-tools.js";
import { _internal as iconifyInternal } from "../../asset-fetchers/iconify.js";

function mockFetch(body, { ok = true, status = 200 } = {}) {
  const res = {
    ok,
    status,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
    headers: new Map(),
  };
  global.fetch = vi.fn(async () => res);
}

describe("assetTools tool definitions", () => {
  it("declares 3 tools (icon-generate, icon-search, find-stock-image)", () => {
    const names = assetTools.map((t) => t.name).sort();
    expect(names).toEqual(["find_stock_image", "generate_icon", "search_icons"]);
  });

  it("each tool has a non-empty description and input schema", () => {
    for (const t of assetTools) {
      expect(t.description.length).toBeGreaterThan(20);
      expect(t.inputSchema.type).toBe("object");
      expect(t.inputSchema.properties).toBeTypeOf("object");
    }
  });
});

describe("handleAssetTool — generate_icon", () => {
  beforeEach(() => {
    iconifyInternal.svgCache.clearMemory();
    iconifyInternal.svgCache.readDisk = async () => null;
  });

  it("returns the SVG and echo of args", async () => {
    mockFetch("<svg xmlns=\"http://www.w3.org/2000/svg\"><path/></svg>");
    const out = await handleAssetTool(
      "generate_icon",
      { collection: "mdi", name: "home", size: 32 },
      {},
    );
    expect(out.svg).toContain("<svg");
    expect(out.collection).toBe("mdi");
    expect(out.name).toBe("home");
    expect(out.size).toBe(32);
    expect(out.color).toBe("currentColor");
  });

  it("requires collection and name", async () => {
    await expect(
      handleAssetTool("generate_icon", { name: "home" }, {}),
    ).rejects.toThrow(/collection is required/);
    await expect(
      handleAssetTool("generate_icon", { collection: "mdi" }, {}),
    ).rejects.toThrow(/name is required/);
  });
});

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

describe("handleAssetTool — search_icons", () => {
  beforeEach(() => {
    iconifyInternal.searchCache.clearMemory();
    iconifyInternal.searchCache.readDisk = async () => null;
  });

  it("returns normalized results", async () => {
    mockFetch({ icons: ["mdi:home"] });
    const out = await handleAssetTool("search_icons", { query: "home" }, {});
    expect(out.total).toBe(1);
    expect(out.results[0].id).toBe("mdi:home");
  });

  it("requires query", async () => {
    await expect(
      handleAssetTool("search_icons", {}, {}),
    ).rejects.toThrow(/query is required/);
  });

  it("merges multi-word query results", async () => {
    mockFetchByQuery({
      sparkle: { icons: ["mdi:sparkles", "ph:sparkle"] },
      star: { icons: ["mdi:star", "mdi:sparkles"] },
    });
    const out = await handleAssetTool("search_icons", { query: "sparkle star" }, {});
    // mdi:sparkles appears in both terms → ranked first
    expect(out.results[0].id).toBe("mdi:sparkles");
    expect(out.total).toBe(3);
  });

  it("returns suggestions when multi-word query yields no results", async () => {
    mockFetchByQuery({
      zzz: { icons: [] },
      qqq: { icons: [] },
    });
    const out = await handleAssetTool("search_icons", { query: "zzz qqq" }, {});
    expect(out.results).toEqual([]);
    expect(out.suggestions).toEqual(["zzz", "qqq"]);
    expect(out.message).toBeTruthy();
  });
});

describe("handleAssetTool — find_stock_image (zero config)", () => {
  it("falls back to Picsum with warning when no keys are set", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    delete process.env.PEXELS_API_KEY;
    const out = await handleAssetTool(
      "find_stock_image",
      { query: "kitchen", limit: 2 },
      {},
    );
    expect(out.source).toBe("picsum");
    expect(out.results).toHaveLength(2);
    expect(out.warning).toBeTruthy();
  });

  it("requires query", async () => {
    await expect(
      handleAssetTool("find_stock_image", {}, {}),
    ).rejects.toThrow(/query is required/);
  });
});

describe("handleAssetTool — unknown tool", () => {
  it("throws", async () => {
    await expect(
      handleAssetTool("nope", {}, {}),
    ).rejects.toThrow(/Unknown asset tool/);
  });
});

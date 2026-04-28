// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";
import { inlineRemoteImages, _imageInlineInternals } from "../satori-renderer.js";
import { Cache } from "../../asset-fetchers/cache.js";

function makeFreshCache() {
  const c = new Cache({ subdir: `inline-images-test-${Math.random().toString(36).slice(2, 8)}`, encoding: "binary" });
  c.readDisk = async () => null;
  c.writeDisk = async () => {};
  return c;
}

function mockFetchBinary(byteValue, contentType) {
  const arrayBuffer = new Uint8Array([byteValue]).buffer;
  const res = {
    ok: true,
    status: 200,
    arrayBuffer: async () => arrayBuffer,
    headers: { get: (k) => (k.toLowerCase() === "content-type" ? contentType : null) },
  };
  global.fetch = vi.fn(async () => res);
}

describe("inlineRemoteImages — passthrough", () => {
  it("returns input unchanged when no <img> tags exist", async () => {
    const html = "<div>no images here</div>";
    const result = await inlineRemoteImages(html);
    expect(result.html).toBe(html);
    expect(result.warnings).toEqual([]);
  });

  it("returns input unchanged for non-string input", async () => {
    const result = await inlineRemoteImages(undefined);
    expect(result.html).toBeUndefined();
    expect(result.warnings).toEqual([]);
  });
});

describe("inlineRemoteImages — allowlist enforcement", () => {
  beforeEach(() => {
    _imageInlineInternals.imageBytesCache.clearMemory();
  });

  it("replaces disallowed-host <img> with transparent PNG and emits a warning", async () => {
    const cache = makeFreshCache();
    global.fetch = vi.fn();
    const html = '<img src="https://evil.example.com/track.gif">';
    const result = await inlineRemoteImages(html, cache);
    expect(result.html).toContain(_imageInlineInternals.TRANSPARENT_PNG_DATA_URI);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("evil.example.com/track.gif");
    expect(result.warnings[0]).toContain("allowlist");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("replaces non-allowlisted hosts with transparent PNG and emits a warning", async () => {
    const cache = makeFreshCache();
    global.fetch = vi.fn();
    const html = '<img src="https://intranet.local/track.gif">';
    const result = await inlineRemoteImages(html, cache);
    expect(result.html).toContain(_imageInlineInternals.TRANSPARENT_PNG_DATA_URI);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("allowlist");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("inlineRemoteImages — happy path", () => {
  beforeEach(() => {
    _imageInlineInternals.imageBytesCache.clearMemory();
  });

  it("downloads and inlines an allowlisted picsum URL with no warnings", async () => {
    const cache = makeFreshCache();
    mockFetchBinary(0x42, "image/jpeg");
    const url = "https://picsum.photos/seed/test/100/100";
    const html = `<img src="${url}">`;
    const result = await inlineRemoteImages(html, cache);
    expect(result.html).toContain("data:image/jpeg;base64,");
    expect(result.html).not.toContain(url);
    expect(result.warnings).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("dedupes multiple references to the same URL", async () => {
    const cache = makeFreshCache();
    mockFetchBinary(0x42, "image/jpeg");
    const url = "https://images.unsplash.com/photo-abc";
    const html = `<div><img src="${url}"><img src="${url}"></div>`;
    const result = await inlineRemoteImages(html, cache);
    expect(result.warnings).toEqual([]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to transparent PNG and emits a warning when fetch fails", async () => {
    const cache = makeFreshCache();
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    const html = '<img src="https://images.unsplash.com/photo-bad">';
    const result = await inlineRemoteImages(html, cache);
    expect(result.html).toContain(_imageInlineInternals.TRANSPARENT_PNG_DATA_URI);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("network down");
    expect(result.warnings[0]).toContain("photo-bad");
  });

  it("handles a mix of allowed and disallowed URLs with correct warnings", async () => {
    const cache = makeFreshCache();
    let call = 0;
    global.fetch = vi.fn(async () => {
      call++;
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([call]).buffer,
        headers: { get: () => "image/png" },
      };
    });
    const html =
      '<div>' +
      '<img src="https://images.unsplash.com/p1">' +
      '<img src="https://attacker.example/bad">' +
      '</div>';
    const result = await inlineRemoteImages(html, cache);
    expect(result.html).toContain("data:image/png;base64,");
    expect(result.html).toContain(_imageInlineInternals.TRANSPARENT_PNG_DATA_URI);
    // Only the disallowed URL should produce a warning.
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("attacker.example/bad");
    expect(result.warnings[0]).toContain("allowlist");
    // Only the allowed URL should have triggered a network call.
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

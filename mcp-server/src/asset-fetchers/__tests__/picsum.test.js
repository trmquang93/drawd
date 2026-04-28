// @vitest-environment node

import { describe, it, expect } from "vitest";
import { searchPhotos } from "../picsum.js";

describe("picsum.searchPhotos", () => {
  it("returns exactly one placeholder result regardless of query", () => {
    const r = searchPhotos("kitchen");
    expect(r.results).toHaveLength(1);
  });

  it("produces deterministic URLs for the same query", () => {
    const a = searchPhotos("kitchen");
    const b = searchPhotos("kitchen");
    expect(a.results[0].url).toBe(b.results[0].url);
  });

  it("differs across queries", () => {
    const a = searchPhotos("kitchen");
    const b = searchPhotos("forest");
    expect(a.results[0].url).not.toBe(b.results[0].url);
  });

  it("uses picsum.photos host", () => {
    const r = searchPhotos("home");
    expect(r.results[0].url.startsWith("https://picsum.photos/")).toBe(true);
    expect(r.results[0].source).toBe("picsum");
  });

  it("alt text marks the image as a placeholder", () => {
    const r = searchPhotos("modern kitchen");
    expect(r.results[0].alt).toContain("Placeholder");
    expect(r.results[0].alt).toContain("modern kitchen");
  });
});

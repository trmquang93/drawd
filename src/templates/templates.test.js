import { describe, it, expect, beforeAll } from "vitest";
import { TEMPLATES } from "./index.js";

const REQUIRED_REGISTRY_FIELDS = ["id", "name", "description", "category", "screenCount", "getData"];
const REQUIRED_SCREEN_FIELDS = ["id", "name", "x", "y", "width", "hotspots"];
const REQUIRED_CONNECTION_FIELDS = ["id", "fromScreenId", "toScreenId"];

describe("TEMPLATES registry", () => {
  it("has at least 4 templates", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(4);
  });

  it("each template has required registry fields", () => {
    for (const tpl of TEMPLATES) {
      for (const field of REQUIRED_REGISTRY_FIELDS) {
        expect(tpl[field], `${tpl.id || "unknown"} missing ${field}`).toBeDefined();
      }
    }
  });

  it("has no duplicate template IDs", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getData is a function for each template", () => {
    for (const tpl of TEMPLATES) {
      expect(typeof tpl.getData).toBe("function");
    }
  });
});

describe("template data integrity", () => {
  const templateDataPairs = [];

  // Load all template data before tests
  beforeAll(async () => {
    for (const tpl of TEMPLATES) {
      const data = await tpl.getData();
      templateDataPairs.push({ meta: tpl, data });
    }
  });

  it("all templates load successfully", () => {
    expect(templateDataPairs.length).toBe(TEMPLATES.length);
  });

  it("each template has a screens array", () => {
    for (const { meta, data } of templateDataPairs) {
      expect(Array.isArray(data.screens), `${meta.id} screens should be array`).toBe(true);
      expect(data.screens.length, `${meta.id} should have screens`).toBeGreaterThan(0);
    }
  });

  it("screenCount matches actual screens array length", () => {
    for (const { meta, data } of templateDataPairs) {
      expect(data.screens.length, `${meta.id} screenCount mismatch`).toBe(meta.screenCount);
    }
  });

  it("each screen has required fields", () => {
    for (const { meta, data } of templateDataPairs) {
      for (const screen of data.screens) {
        for (const field of REQUIRED_SCREEN_FIELDS) {
          expect(screen[field], `${meta.id}/${screen.name || screen.id} missing ${field}`).toBeDefined();
        }
      }
    }
  });

  it("each screen has an imageData string", () => {
    for (const { meta, data } of templateDataPairs) {
      for (const screen of data.screens) {
        expect(typeof screen.imageData, `${meta.id}/${screen.name} imageData should be string`).toBe("string");
        expect(screen.imageData.length, `${meta.id}/${screen.name} imageData should not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it("no duplicate screen IDs within a template", () => {
    for (const { meta, data } of templateDataPairs) {
      const ids = data.screens.map((s) => s.id);
      expect(new Set(ids).size, `${meta.id} has duplicate screen IDs`).toBe(ids.length);
    }
  });

  it("no duplicate hotspot IDs within a template", () => {
    for (const { meta, data } of templateDataPairs) {
      const ids = data.screens.flatMap((s) => s.hotspots.map((h) => h.id));
      expect(new Set(ids).size, `${meta.id} has duplicate hotspot IDs`).toBe(ids.length);
    }
  });

  it("connections reference valid screen IDs within the template", () => {
    for (const { meta, data } of templateDataPairs) {
      const screenIds = new Set(data.screens.map((s) => s.id));
      for (const conn of (data.connections || [])) {
        expect(screenIds.has(conn.fromScreenId), `${meta.id} conn ${conn.id}: invalid fromScreenId ${conn.fromScreenId}`).toBe(true);
        expect(screenIds.has(conn.toScreenId), `${meta.id} conn ${conn.id}: invalid toScreenId ${conn.toScreenId}`).toBe(true);
      }
    }
  });

  it("connections have required fields", () => {
    for (const { meta, data } of templateDataPairs) {
      for (const conn of (data.connections || [])) {
        for (const field of REQUIRED_CONNECTION_FIELDS) {
          expect(conn[field], `${meta.id} conn missing ${field}`).toBeDefined();
        }
      }
    }
  });

  it("hotspot targetScreenId references valid screens or is null", () => {
    for (const { meta, data } of templateDataPairs) {
      const screenIds = new Set(data.screens.map((s) => s.id));
      for (const screen of data.screens) {
        for (const hs of screen.hotspots) {
          if (hs.targetScreenId) {
            expect(screenIds.has(hs.targetScreenId), `${meta.id}/${screen.name} hotspot ${hs.label}: invalid targetScreenId ${hs.targetScreenId}`).toBe(true);
          }
        }
      }
    }
  });

  it("each template has a connections array", () => {
    for (const { meta, data } of templateDataPairs) {
      expect(Array.isArray(data.connections), `${meta.id} connections should be array`).toBe(true);
    }
  });

  it("each template has a documents array", () => {
    for (const { meta, data } of templateDataPairs) {
      expect(Array.isArray(data.documents), `${meta.id} documents should be array`).toBe(true);
    }
  });
});

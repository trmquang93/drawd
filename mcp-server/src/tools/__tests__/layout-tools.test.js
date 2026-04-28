import { describe, it, expect } from "vitest";
import { handleLayoutTool } from "../layout-tools.js";

// Minimal mock state with helpers
function makeState(screens) {
  return {
    screens,
    getScreen(id) {
      return this.screens.find((s) => s.id === id) || null;
    },
  };
}

function screen(id, name, x, y, width = 220, imageHeight = 480) {
  return { id, name, x, y, width, imageHeight };
}

describe("find_empty_space_near", () => {
  describe("single anchor, no neighbors", () => {
    const state = makeState([screen("a", "Anchor", 100, 100)]);

    it("places to the right", () => {
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "right",
      }, state);
      // right edge of anchor = 100 + 220 = 320, plus default gap 80 = 400
      expect(res.x).toBe(400);
      expect(res.y).toBe(100);
      expect(res.collisions).toBeUndefined();
      expect(res.reasoning).toContain("right");
    });

    it("places to the left", () => {
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "left",
      }, state);
      // left edge of anchor = 100, minus default gap 80, minus default width 220 = -200
      expect(res.x).toBe(-200);
      expect(res.y).toBe(100);
      expect(res.collisions).toBeUndefined();
    });

    it("places below", () => {
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "below",
      }, state);
      // bottom edge = 100 + 480 = 580, plus gap 80 = 660
      expect(res.x).toBe(100);
      expect(res.y).toBe(660);
      expect(res.collisions).toBeUndefined();
    });

    it("places above", () => {
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "above",
      }, state);
      // top edge = 100, minus gap 80, minus default height 480 = -460
      expect(res.x).toBe(100);
      expect(res.y).toBe(-460);
      expect(res.collisions).toBeUndefined();
    });

    it("places with direction 'any' (picks right first)", () => {
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "any",
      }, state);
      expect(res.x).toBe(400);
      expect(res.y).toBe(100);
    });
  });

  describe("custom width, height, and gap", () => {
    it("honors custom dimensions", () => {
      const state = makeState([screen("a", "Anchor", 0, 0)]);
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "right",
        width: 390,
        height: 844,
        gap: 50,
      }, state);
      // right edge = 0 + 220 = 220, plus gap 50 = 270
      expect(res.x).toBe(270);
      expect(res.y).toBe(0);
    });
  });

  describe("dense neighbors — collision skipping", () => {
    it("skips a blocking screen to the right", () => {
      const state = makeState([
        screen("a", "Anchor", 0, 0),
        screen("b", "Blocker", 300, 0), // sits at x=300, blocks the first candidate
      ]);
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "right",
        gap: 20,
      }, state);
      // Must land past blocker's right edge (300+220=520) + gap (20) = 540
      expect(res.x).toBeGreaterThanOrEqual(540);
      expect(res.collisions).toBeDefined();
      expect(res.collisions.length).toBeGreaterThanOrEqual(1);
      expect(res.collisions[0].name).toBe("Blocker");
    });

    it("skips a blocking screen below", () => {
      const state = makeState([
        screen("a", "Anchor", 0, 0),
        screen("b", "Below Blocker", 0, 560), // blocks the first candidate below
      ]);
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "below",
        gap: 20,
      }, state);
      // Must land past blocker's bottom edge (560+480=1040) + gap (20) = 1060
      expect(res.y).toBeGreaterThanOrEqual(1060);
      expect(res.collisions).toBeDefined();
      expect(res.collisions.some((c) => c.name === "Below Blocker")).toBe(true);
    });
  });

  describe("boxed-in fallback", () => {
    it("falls back when all four directions are densely blocked", () => {
      // Surround anchor so tightly that the walk won't find space within MAX_STEPS
      // Use a gap=0 + tiny STEP_SIZE means 500*10 = 5000px scanned.
      // Fill in neighbors close in all directions, each very wide/tall.
      const bigW = 6000;
      const bigH = 6000;
      const state = makeState([
        screen("a", "Anchor", 5000, 5000, 220, 480),
        // Block right
        { id: "r", name: "R", x: 5220, y: 0, width: bigW, imageHeight: bigH },
        // Block left
        { id: "l", name: "L", x: -1000, y: 0, width: bigW, imageHeight: bigH },
        // Block below
        { id: "d", name: "D", x: 0, y: 5480, width: bigW * 3, imageHeight: bigH },
        // Block above
        { id: "u", name: "U", x: 0, y: -1000, width: bigW * 3, imageHeight: bigH },
      ]);
      const res = handleLayoutTool("find_empty_space_near", {
        screenId: "a",
        direction: "any",
        gap: 0,
      }, state);
      // Should get a result (fallback), placed far right
      expect(res.x).toBeDefined();
      expect(res.y).toBeDefined();
      expect(res.reasoning).toContain("fallback");
      expect(res.collisions).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("throws for unknown screen", () => {
      const state = makeState([]);
      expect(() =>
        handleLayoutTool("find_empty_space_near", {
          screenId: "missing",
          direction: "right",
        }, state),
      ).toThrow("Screen not found");
    });

    it("throws for unknown tool name", () => {
      const state = makeState([screen("a", "A", 0, 0)]);
      expect(() =>
        handleLayoutTool("nonexistent_tool", {}, state),
      ).toThrow("Unknown layout tool");
    });
  });
});

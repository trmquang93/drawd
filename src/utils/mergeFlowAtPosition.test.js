import { describe, it, expect } from "vitest";
import { mergeFlowAtPosition } from "./mergeFlowAtPosition.js";

const makeScreen = (id, name, x = 0, y = 0, overrides = {}) => ({
  id,
  name,
  x,
  y,
  width: 220,
  imageData: "data:image/png;base64,abc",
  hotspots: [],
  stateGroup: null,
  stateName: "",
  ...overrides,
});

const makeConn = (id, from, to, overrides = {}) => ({
  id,
  fromScreenId: from,
  toScreenId: to,
  hotspotId: null,
  connectionPath: "default",
  condition: "",
  conditionGroupId: null,
  ...overrides,
});

describe("mergeFlowAtPosition", () => {
  it("returns empty result for empty template", () => {
    const result = mergeFlowAtPosition([], [], [], 500, 300);
    expect(result.screens).toHaveLength(0);
    expect(result.connections).toHaveLength(0);
    expect(result.documents).toHaveLength(0);
  });

  it("centers a single screen at the target position", () => {
    const screens = [makeScreen("s1", "Login", 0, 0)];
    const result = mergeFlowAtPosition(screens, [], [], 500, 300);
    // Bounding box: x=[0,220], y=[0,389] -> center=(110,194.5)
    // Offset: (500-110, 300-194.5) = (390, 105.5)
    expect(result.screens[0].x).toBe(390);
    expect(result.screens[0].y).toBe(105.5);
  });

  it("preserves internal spacing between screens", () => {
    const screens = [
      makeScreen("s1", "A", 0, 0),
      makeScreen("s2", "B", 300, 0),
    ];
    const result = mergeFlowAtPosition(screens, [], [], 500, 300);
    const dx = result.screens[1].x - result.screens[0].x;
    expect(dx).toBe(300); // original spacing preserved
  });

  it("remaps all IDs to new values", () => {
    const screens = [makeScreen("s1", "A", 0, 0), makeScreen("s2", "B", 300, 0)];
    const conns = [makeConn("c1", "s1", "s2")];
    const result = mergeFlowAtPosition(screens, conns, [], 0, 0);

    expect(result.screens[0].id).not.toBe("s1");
    expect(result.screens[1].id).not.toBe("s2");
    expect(result.connections[0].id).not.toBe("c1");
    expect(result.connections[0].fromScreenId).toBe(result.screens[0].id);
    expect(result.connections[0].toScreenId).toBe(result.screens[1].id);
  });

  it("remaps hotspot IDs and targetScreenId", () => {
    const screens = [
      makeScreen("s1", "A", 0, 0, {
        hotspots: [{ id: "h1", label: "Go", targetScreenId: "s2", conditions: [] }],
      }),
      makeScreen("s2", "B", 300, 0),
    ];
    const result = mergeFlowAtPosition(screens, [], [], 500, 300);
    const hs = result.screens[0].hotspots[0];
    expect(hs.id).not.toBe("h1");
    expect(hs.targetScreenId).toBe(result.screens[1].id);
  });

  it("does not apply mergeFlow X offset (positions only from target)", () => {
    const screens = [makeScreen("s1", "A", 0, 0)];
    const result = mergeFlowAtPosition(screens, [], [], 500, 300);
    expect(result.screens[0].x).toBe(390);
  });

  it("handles negative target coordinates", () => {
    const screens = [makeScreen("s1", "A", 0, 0)];
    const result = mergeFlowAtPosition(screens, [], [], -200, -100);
    // center = (110, 194.5), offset = (-310, -294.5)
    expect(result.screens[0].x).toBe(-310);
    expect(result.screens[0].y).toBe(-294.5);
  });

  it("remaps document IDs", () => {
    const docs = [{ id: "d1", name: "API Spec", content: "test", createdAt: "2024-01-01" }];
    const screens = [
      makeScreen("s1", "A", 0, 0, {
        hotspots: [{ id: "h1", label: "API", targetScreenId: null, documentId: "d1", conditions: [] }],
      }),
    ];
    const result = mergeFlowAtPosition(screens, [], docs, 500, 300);
    expect(result.documents[0].id).not.toBe("d1");
    expect(result.screens[0].hotspots[0].documentId).toBe(result.documents[0].id);
  });
});

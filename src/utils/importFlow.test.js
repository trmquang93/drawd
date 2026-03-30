import { describe, it, expect } from "vitest";
import { importFlow } from "./importFlow.js";

const makeValidFile = (overrides = {}) =>
  JSON.stringify({
    version: 6,
    metadata: { name: "Test", exportedAt: new Date().toISOString() },
    screens: [],
    connections: [],
    documents: [],
    ...overrides,
  });

describe("importFlow", () => {
  // --- Error cases ---

  it("throws for invalid JSON string", () => {
    expect(() => importFlow("not json")).toThrow("not valid JSON");
  });

  it("throws for missing version field", () => {
    expect(() => importFlow(JSON.stringify({ screens: [], connections: [] }))).toThrow(
      "missing version"
    );
  });

  it("throws for future version > 11", () => {
    expect(() =>
      importFlow(JSON.stringify({ version: 12, screens: [], connections: [] }))
    ).toThrow("Unsupported file version");
  });

  it("throws for non-array screens", () => {
    expect(() =>
      importFlow(JSON.stringify({ version: 1, screens: "bad", connections: [] }))
    ).toThrow("screens must be an array");
  });

  it("throws for non-array connections", () => {
    expect(() =>
      importFlow(JSON.stringify({ version: 1, screens: [], connections: "bad" }))
    ).toThrow("connections must be an array");
  });

  // --- Screen defaults ---

  it("backfills stateGroup, stateName, and notes for screens missing them", () => {
    const file = makeValidFile({
      screens: [{ id: "s1", name: "Home", hotspots: [] }],
    });
    const result = importFlow(file);
    const screen = result.screens[0];
    expect(screen.stateGroup).toBeNull();
    expect(screen.stateName).toBe("");
    expect(screen.notes).toBe("");
  });

  it("backfills codeRef, status, and acceptanceCriteria for screens", () => {
    const file = makeValidFile({
      screens: [{ id: "s1", name: "Home", hotspots: [] }],
    });
    const result = importFlow(file);
    const screen = result.screens[0];
    expect(screen.codeRef).toBe("");
    expect(screen.status).toBe("new");
    expect(screen.acceptanceCriteria).toEqual([]);
  });

  // --- Hotspot defaults ---

  it("backfills elementType and conditions for hotspots", () => {
    const file = makeValidFile({
      screens: [
        {
          id: "s1",
          name: "Home",
          hotspots: [{ id: "h1", label: "Tap", action: "navigate" }],
        },
      ],
    });
    const result = importFlow(file);
    const hs = result.screens[0].hotspots[0];
    expect(hs.elementType).toBe("button");
    expect(hs.conditions).toEqual([]);
  });

  it("backfills api-related fields on hotspots", () => {
    const file = makeValidFile({
      screens: [
        {
          id: "s1",
          name: "Home",
          hotspots: [{ id: "h1", label: "Tap", action: "api" }],
        },
      ],
    });
    const result = importFlow(file);
    const hs = result.screens[0].hotspots[0];
    expect(hs.apiEndpoint).toBe("");
    expect(hs.apiMethod).toBe("");
    expect(hs.onSuccessAction).toBe("");
    expect(hs.onErrorAction).toBe("");
  });

  // --- v4 -> v5 migration ---

  it("promotes inline apiDocs to documents array and sets documentId on hotspot", () => {
    const file = JSON.stringify({
      version: 4,
      screens: [
        {
          id: "s1",
          name: "Home",
          hotspots: [
            {
              id: "h1",
              label: "Login",
              action: "api",
              apiDocs: "# Login API\nPOST /auth",
            },
          ],
        },
      ],
      connections: [],
    });
    const result = importFlow(file);
    const hs = result.screens[0].hotspots[0];
    expect(hs.apiDocs).toBeUndefined();
    expect(hs.documentId).toBeTruthy();
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].content).toBe("# Login API\nPOST /auth");
    expect(result.documents[0].id).toBe(hs.documentId);
  });

  it("sets documentId to null for v4 hotspots without apiDocs", () => {
    const file = JSON.stringify({
      version: 4,
      screens: [
        {
          id: "s1",
          name: "Home",
          hotspots: [{ id: "h1", label: "Tap", action: "navigate" }],
        },
      ],
      connections: [],
    });
    const result = importFlow(file);
    expect(result.screens[0].hotspots[0].documentId).toBeNull();
  });

  // --- Connection defaults ---

  it("backfills connectionPath, condition, and conditionGroupId for connections", () => {
    const file = makeValidFile({
      connections: [{ id: "c1", fromScreenId: "s1", toScreenId: "s2" }],
    });
    const result = importFlow(file);
    const conn = result.connections[0];
    expect(conn.connectionPath).toBe("default");
    expect(conn.condition).toBe("");
    expect(conn.conditionGroupId).toBeNull();
  });

  it("backfills transitionType and transitionLabel for connections", () => {
    const file = makeValidFile({
      connections: [{ id: "c1", fromScreenId: "s1", toScreenId: "s2" }],
    });
    const result = importFlow(file);
    const conn = result.connections[0];
    expect(conn.transitionType).toBeNull();
    expect(conn.transitionLabel).toBe("");
  });

  // --- Top-level defaults ---

  it("creates documents array when absent", () => {
    const file = JSON.stringify({
      version: 6,
      screens: [],
      connections: [],
    });
    const result = importFlow(file);
    expect(result.documents).toEqual([]);
  });

  it("creates metadata object when absent", () => {
    const file = JSON.stringify({
      version: 6,
      screens: [],
      connections: [],
    });
    const result = importFlow(file);
    expect(result.metadata).toBeDefined();
    expect(result.metadata.featureBrief).toBe("");
  });

  it("backfills dataModels, stickyNotes, and screenGroups arrays", () => {
    const file = makeValidFile();
    const result = importFlow(file);
    expect(result.dataModels).toEqual([]);
    expect(result.stickyNotes).toEqual([]);
    expect(result.screenGroups).toEqual([]);
  });

  // --- Valid file parsing ---

  it("parses valid v6 file without errors", () => {
    const file = makeValidFile({
      version: 6,
      screens: [
        {
          id: "s1",
          name: "Home",
          hotspots: [
            {
              id: "h1",
              label: "Tap",
              action: "navigate",
              elementType: "button",
              conditions: [],
            },
          ],
          stateGroup: null,
          stateName: "",
          notes: "",
        },
      ],
      connections: [
        {
          id: "c1",
          fromScreenId: "s1",
          toScreenId: "s2",
          connectionPath: "default",
          condition: "",
          conditionGroupId: null,
        },
      ],
    });
    const result = importFlow(file);
    expect(result.version).toBe(6);
    expect(result.screens).toHaveLength(1);
    expect(result.connections).toHaveLength(1);
  });

  it("parses valid v7 file without errors", () => {
    const file = makeValidFile({
      version: 7,
      screens: [
        {
          id: "s1",
          name: "Home",
          hotspots: [],
          stateGroup: null,
          stateName: "",
          notes: "Some implementation notes",
        },
      ],
    });
    const result = importFlow(file);
    expect(result.version).toBe(7);
    expect(result.screens[0].notes).toBe("Some implementation notes");
  });
});

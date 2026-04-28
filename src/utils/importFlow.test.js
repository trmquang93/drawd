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

  it("throws for future version > 15", () => {
    expect(() =>
      importFlow(JSON.stringify({ version: 16, screens: [], connections: [] }))
    ).toThrow("Unsupported file version");
  });

  // --- v14 -> v15 migration: device chrome metadata ---

  it("backfills screen.device to null on legacy files (v14 and earlier)", () => {
    const file = makeValidFile({
      version: 14,
      screens: [{ id: "s1", name: "Home", hotspots: [] }],
    });
    const result = importFlow(file);
    expect(result.screens[0].device).toBeNull();
  });

  it("preserves a persisted device block on v15 files", () => {
    const persisted = {
      preset: "iphone",
      chrome: ["status-bar-ios", "dynamic-island", "home-indicator"],
      chromeStyle: "light",
      safeArea: { top: 59, bottom: 34, left: 0, right: 0 },
    };
    const file = makeValidFile({
      version: 15,
      screens: [{ id: "s1", name: "Home", hotspots: [], device: persisted }],
    });
    const result = importFlow(file);
    expect(result.screens[0].device).toEqual(persisted);
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

  it("backfills accessibility to null for older hotspots", () => {
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
    expect(hs.accessibility).toBeNull();
  });

  it("preserves existing accessibility data on hotspots", () => {
    const file = makeValidFile({
      screens: [
        {
          id: "s1",
          name: "Home",
          hotspots: [{
            id: "h1",
            label: "Login",
            action: "navigate",
            accessibility: { label: "Sign in", role: "button", hint: "Double tap to sign in", traits: ["selected"] },
          }],
        },
      ],
    });
    const result = importFlow(file);
    const hs = result.screens[0].hotspots[0];
    expect(hs.accessibility).toEqual({
      label: "Sign in",
      role: "button",
      hint: "Double tap to sign in",
      traits: ["selected"],
    });
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

  it("backfills comments to [] when absent from the file", () => {
    const file = makeValidFile(); // no comments field
    const result = importFlow(file);
    expect(result.comments).toEqual([]);
  });

  it("preserves existing comments array when present in the file", () => {
    const existingComments = [{ id: "c1", text: "hi", resolved: false }];
    const file = makeValidFile({ comments: existingComments });
    const result = importFlow(file);
    expect(result.comments).toEqual(existingComments);
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

  // --- Conditional connector backfill (Backlog 8.1) ---
  // See src/utils/connectionHelpers.js — `conditionGroupId` is the canonical predicate.
  // These cases verify that legacy files with a mismatch between `connectionPath` and
  // `conditionGroupId` get healed during import so the renderer and the modal agree.

  describe("conditional connector backfill", () => {
    const makeConn = (overrides) => ({
      id: overrides.id,
      fromScreenId: "src",
      toScreenId: "dst",
      hotspotId: null,
      label: "",
      action: "navigate",
      connectionPath: "default",
      condition: "",
      conditionGroupId: null,
      transitionType: null,
      transitionLabel: "",
      dataFlow: [],
      ...overrides,
    });

    it("synthesizes a shared conditionGroupId for siblings sharing fromScreen+hotspot", () => {
      const file = makeValidFile({
        version: 5,
        connections: [
          makeConn({ id: "c0", connectionPath: "condition-0", toScreenId: "a" }),
          makeConn({ id: "c1", connectionPath: "condition-1", toScreenId: "b" }),
        ],
      });
      const result = importFlow(file);
      const [c0, c1] = result.connections;
      expect(c0.conditionGroupId).toBeTruthy();
      expect(c1.conditionGroupId).toBe(c0.conditionGroupId);
    });

    it("uses distinct synthesized group ids for connections from different sources", () => {
      const file = makeValidFile({
        version: 5,
        connections: [
          makeConn({ id: "c0", fromScreenId: "src1", connectionPath: "condition-0", toScreenId: "a" }),
          makeConn({ id: "c1", fromScreenId: "src2", connectionPath: "condition-0", toScreenId: "b" }),
        ],
      });
      const result = importFlow(file);
      const [c0, c1] = result.connections;
      expect(c0.conditionGroupId).toBeTruthy();
      expect(c1.conditionGroupId).toBeTruthy();
      expect(c0.conditionGroupId).not.toBe(c1.conditionGroupId);
    });

    it("keeps a coherent conditional connection unchanged", () => {
      const file = makeValidFile({
        version: 5,
        connections: [
          makeConn({
            id: "c0",
            connectionPath: "condition-0",
            conditionGroupId: "g-existing",
            toScreenId: "a",
          }),
        ],
      });
      const result = importFlow(file);
      expect(result.connections[0].connectionPath).toBe("condition-0");
      expect(result.connections[0].conditionGroupId).toBe("g-existing");
    });

    it("synthesizes a connectionPath when a connection has only a conditionGroupId", () => {
      const file = makeValidFile({
        version: 5,
        connections: [
          makeConn({
            id: "c0",
            connectionPath: "default",
            conditionGroupId: "g1",
            toScreenId: "a",
          }),
        ],
      });
      const result = importFlow(file);
      expect(result.connections[0].connectionPath).toBe("condition-0");
      expect(result.connections[0].conditionGroupId).toBe("g1");
    });

    it("picks a non-colliding condition index when synthesizing within an existing group", () => {
      const file = makeValidFile({
        version: 5,
        connections: [
          makeConn({
            id: "c0",
            connectionPath: "condition-0",
            conditionGroupId: "g1",
            toScreenId: "a",
          }),
          makeConn({
            id: "c1",
            connectionPath: "default",
            conditionGroupId: "g1",
            toScreenId: "b",
          }),
        ],
      });
      const result = importFlow(file);
      const paths = result.connections.map((c) => c.connectionPath).sort();
      expect(paths).toEqual(["condition-0", "condition-1"]);
    });

    it("does not merge a hotspot conditional with a plain conditional from the same screen", () => {
      const file = makeValidFile({
        version: 5,
        connections: [
          makeConn({ id: "c0", hotspotId: "h1", connectionPath: "condition-0", toScreenId: "a" }),
          makeConn({ id: "c1", hotspotId: null, connectionPath: "condition-0", toScreenId: "b" }),
        ],
      });
      const result = importFlow(file);
      const [c0, c1] = result.connections;
      expect(c0.conditionGroupId).toBeTruthy();
      expect(c1.conditionGroupId).toBeTruthy();
      expect(c0.conditionGroupId).not.toBe(c1.conditionGroupId);
    });

    it("is idempotent on a healed file (re-import produces no further changes)", () => {
      const initialFile = makeValidFile({
        version: 5,
        connections: [
          makeConn({ id: "c0", connectionPath: "condition-0", toScreenId: "a" }),
          makeConn({ id: "c1", connectionPath: "condition-1", toScreenId: "b" }),
        ],
      });
      const firstPass = importFlow(initialFile);
      // Re-stringify and re-import — should be a fixed point.
      const secondPass = importFlow(JSON.stringify({ ...firstPass, version: 5 }));
      expect(secondPass.connections).toEqual(firstPass.connections);
    });
  });

  // --- Instance-specific hotspots: round-trip persistence ---
  // Criterion 2 (success criteria): hotspots created on an instance live in
  // instance.hotspots[] and must survive auto-save -> reload. The validator/
  // normalizer in importFlow runs on every screen and must not strip or
  // reassign instance hotspots based on role.
  describe("instance-specific hotspots round-trip", () => {
    it("preserves instance.hotspots[] verbatim on a v15 file with a canonical + instance pair", () => {
      const localHotspot = {
        id: "h-local",
        label: "Skip",
        x: 50,
        y: 80,
        w: 30,
        h: 10,
        action: "navigate",
      };
      const file = makeValidFile({
        version: 15,
        screens: [
          {
            id: "s-canon",
            name: "LoginScreen",
            componentId: "c1",
            componentRole: "canonical",
            hotspots: [{ id: "h-canon", label: "Login", x: 0, y: 0, w: 10, h: 10, action: "navigate" }],
          },
          {
            id: "s-inst",
            name: "LoginScreen — Onboarding",
            componentId: "c1",
            componentRole: "instance",
            hotspots: [localHotspot],
          },
        ],
      });
      const result = importFlow(file);
      const instance = result.screens.find((s) => s.id === "s-inst");
      expect(instance).toBeTruthy();
      expect(instance.componentRole).toBe("instance");
      expect(instance.componentId).toBe("c1");
      expect(instance.hotspots).toHaveLength(1);
      expect(instance.hotspots[0].id).toBe("h-local");
      expect(instance.hotspots[0].label).toBe("Skip");
      // Position fields preserved (these are user data — never to be reset).
      expect(instance.hotspots[0].x).toBe(50);
      expect(instance.hotspots[0].y).toBe(80);
    });

    it("instance hotspots survive a stringify -> import round-trip (auto-save simulation)", () => {
      // Auto-save serializes the in-memory state to JSON and reload calls
      // importFlow on the saved string. A round-trip must be a fixed point
      // for instance.hotspots[].
      const file = makeValidFile({
        version: 15,
        screens: [
          {
            id: "s-canon",
            name: "Card",
            componentId: "c1",
            componentRole: "canonical",
            hotspots: [],
          },
          {
            id: "s-inst",
            name: "Card on Home",
            componentId: "c1",
            componentRole: "instance",
            hotspots: [
              { id: "h-local-1", label: "Tap A", x: 1, y: 2, w: 3, h: 4 },
              { id: "h-local-2", label: "Tap B", x: 5, y: 6, w: 7, h: 8 },
            ],
          },
        ],
      });
      const firstPass = importFlow(file);
      const secondPass = importFlow(JSON.stringify({ ...firstPass, version: 15 }));
      const inst1 = firstPass.screens.find((s) => s.id === "s-inst");
      const inst2 = secondPass.screens.find((s) => s.id === "s-inst");
      expect(inst2.hotspots.map((h) => h.id)).toEqual(inst1.hotspots.map((h) => h.id));
      expect(inst2.hotspots).toEqual(inst1.hotspots);
    });

    it("orphan instance (canonical missing) clears role/id but KEEPS its local hotspots", () => {
      // Defensive: even when the importer demotes an orphan instance (lines
      // 221-226 in importFlow.js), the placement-local hotspots are user data
      // and must not be stripped. The screen simply becomes a standalone
      // screen owning those hotspots.
      const file = makeValidFile({
        version: 15,
        screens: [
          {
            id: "s-orphan",
            name: "Was an instance",
            componentId: "c-missing",
            componentRole: "instance",
            hotspots: [{ id: "h-local", label: "Skip", x: 50, y: 50, w: 30, h: 10 }],
          },
        ],
      });
      const result = importFlow(file);
      const screen = result.screens[0];
      expect(screen.componentRole).toBeNull();
      expect(screen.componentId).toBeNull();
      expect(screen.hotspots).toHaveLength(1);
      expect(screen.hotspots[0].id).toBe("h-local");
    });
  });
});

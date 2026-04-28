// @vitest-environment node
//
// Tests for create_screen_with_hotspots — the transactional bundle tool (#9.9).
//
// Uses a mock renderer to avoid the Satori startup cost.  The real FlowState
// is used (with _autoSave mocked) so we exercise the actual mutation paths.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FlowState } from "../../state.js";
import { handleBundleTool } from "../bundle-tools.js";

// ── Minimal valid PNG buffer (just enough for readPngDimensions) ──────────
function makePng(width = 786, height = 1704) {
  const buf = Buffer.alloc(29);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  Buffer.from("IHDR").copy(buf, 12);
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  buf.writeUInt8(8, 24);  // bit depth
  buf.writeUInt8(6, 25);  // color type (RGBA)
  return buf;
}

// ── Mock renderer ────────────────────────────────────────────────────────
function mockRenderer(width = 786, height = 1704) {
  const png = makePng(width, height);
  return {
    render: vi.fn().mockResolvedValue({
      pngBuffer: png,
      width,
      height,
      svgString: "<svg></svg>",
      device: "iphone",
      chrome: ["status-bar-ios"],
      chromeStyle: "light",
      safeArea: { top: 59, bottom: 34, left: 0, right: 0 },
    }),
    toDataUri: vi.fn().mockReturnValue(
      `data:image/png;base64,${Buffer.from(png).toString("base64")}`,
    ),
  };
}

// ── State helper ─────────────────────────────────────────────────────────
function makeState() {
  const state = new FlowState();
  state._autoSave = vi.fn();
  return state;
}

const SIMPLE_HTML = '<div style="display:flex;width:393px;height:852px;"><div>Hello</div></div>';

// ── Happy path ───────────────────────────────────────────────────────────
describe("create_screen_with_hotspots", () => {
  let state;
  let renderer;

  beforeEach(() => {
    state = makeState();
    renderer = mockRenderer();
  });

  it("creates a screen with hotspots and connections in one call", async () => {
    // Pre-create a caller screen
    const caller = state.addScreen({ name: "Home" });

    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "Paywall", html: SIMPLE_HTML },
        hotspots: [
          { label: "Dismiss", x: 85, y: 4, w: 10, h: 6, action: "navigate", target: "@caller" },
          { label: "Purchase", x: 8, y: 82, w: 84, h: 8, action: "custom", customDescription: "Start purchase flow" },
        ],
        connections: [],
        callerScreenId: caller.id,
      },
      state,
      renderer,
    );

    expect(result.screenId).toBeDefined();
    expect(result.name).toBe("Paywall");
    expect(result.hotspotIds).toHaveLength(2);
    // "Dismiss" hotspot with navigate+target auto-creates one connection
    expect(result.connectionIds).toHaveLength(1);
    expect(result.imageWidth).toBe(786);
    expect(result.imageHeight).toBe(1704);

    // Verify state
    const screen = state.getScreen(result.screenId);
    expect(screen).not.toBeNull();
    expect(screen.hotspots).toHaveLength(2);
    expect(screen.hotspots[0].label).toBe("Dismiss");
    expect(screen.hotspots[0].targetScreenId).toBe(caller.id);
    expect(screen.hotspots[1].label).toBe("Purchase");
  });

  it("creates screen with no hotspots or connections", async () => {
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      { screen: { name: "Blank", html: SIMPLE_HTML } },
      state,
      renderer,
    );

    expect(result.screenId).toBeDefined();
    expect(result.hotspotIds).toEqual([]);
    expect(result.connectionIds).toEqual([]);
    expect(state.screens).toHaveLength(1);
  });

  it("accepts position via screen.x / screen.y shorthand", async () => {
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      { screen: { name: "Positioned", html: SIMPLE_HTML, x: 500, y: 1000 } },
      state,
      renderer,
    );

    const screen = state.getScreen(result.screenId);
    expect(screen.x).toBe(500);
    expect(screen.y).toBe(1000);
  });

  it("prefers screen.position over x/y shorthand", async () => {
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: {
          name: "P",
          html: SIMPLE_HTML,
          position: { x: 100, y: 200 },
          x: 999,
          y: 999,
        },
      },
      state,
      renderer,
    );

    const screen = state.getScreen(result.screenId);
    expect(screen.x).toBe(100);
    expect(screen.y).toBe(200);
  });

  // ── Placeholder resolution ─────────────────────────────────────────────

  it("resolves @self in hotspot target to the new screen", async () => {
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "Self-ref", html: SIMPLE_HTML },
        hotspots: [
          { label: "Reload", x: 50, y: 50, w: 10, h: 10, action: "navigate", target: "@self" },
        ],
      },
      state,
      renderer,
    );

    const screen = state.getScreen(result.screenId);
    expect(screen.hotspots[0].targetScreenId).toBe(result.screenId);
    // Auto-connection from self to self
    expect(result.connectionIds).toHaveLength(1);
    const conn = state.connections.find((c) => c.id === result.connectionIds[0]);
    expect(conn.fromScreenId).toBe(result.screenId);
    expect(conn.toScreenId).toBe(result.screenId);
  });

  it("resolves @caller in hotspot target to callerScreenId", async () => {
    const caller = state.addScreen({ name: "Caller" });
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "Modal", html: SIMPLE_HTML },
        hotspots: [
          { label: "Close", x: 90, y: 5, w: 10, h: 5, action: "navigate", target: "@caller" },
        ],
        callerScreenId: caller.id,
      },
      state,
      renderer,
    );

    const screen = state.getScreen(result.screenId);
    expect(screen.hotspots[0].targetScreenId).toBe(caller.id);
  });

  it("resolves @caller in connection target", async () => {
    const caller = state.addScreen({ name: "Caller" });
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "Detail", html: SIMPLE_HTML },
        hotspots: [
          { label: "Back", x: 0, y: 0, w: 10, h: 10, action: "custom", customDescription: "go back" },
        ],
        connections: [{ fromHotspot: "Back", to: "@caller", action: "back" }],
        callerScreenId: caller.id,
      },
      state,
      renderer,
    );

    expect(result.connectionIds).toHaveLength(1);
    const conn = state.connections.find((c) => c.id === result.connectionIds[0]);
    expect(conn.toScreenId).toBe(caller.id);
    expect(conn.hotspotId).toBeDefined();
    expect(conn.action).toBe("back");
  });

  it("resolves @self in connection target", async () => {
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "Loop", html: SIMPLE_HTML },
        connections: [{ to: "@self", label: "retry" }],
      },
      state,
      renderer,
    );

    expect(result.connectionIds).toHaveLength(1);
    const conn = state.connections.find((c) => c.id === result.connectionIds[0]);
    expect(conn.fromScreenId).toBe(result.screenId);
    expect(conn.toScreenId).toBe(result.screenId);
  });

  // ── Duplicate connection skipping ──────────────────────────────────────

  it("skips duplicate connections already auto-created by hotspots", async () => {
    const target = state.addScreen({ name: "Target" });
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "Src", html: SIMPLE_HTML },
        hotspots: [
          { label: "Go", x: 0, y: 0, w: 50, h: 50, action: "navigate", targetScreenId: target.id },
        ],
        connections: [
          // This duplicates the auto-created connection from the hotspot
          { fromHotspot: "Go", to: target.id },
        ],
      },
      state,
      renderer,
    );

    // Only one connection — the duplicate was skipped
    expect(result.connectionIds).toHaveLength(1);
    const touchingNew = state.connections.filter(
      (c) => c.fromScreenId === result.screenId || c.toScreenId === result.screenId,
    );
    expect(touchingNew).toHaveLength(1);
  });

  // ── Validation errors (no mutations) ───────────────────────────────────

  it("rejects duplicate hotspot labels", async () => {
    await expect(
      handleBundleTool(
        "create_screen_with_hotspots",
        {
          screen: { name: "Dup", html: SIMPLE_HTML },
          hotspots: [
            { label: "Btn", x: 0, y: 0, w: 10, h: 10, action: "navigate" },
            { label: "Btn", x: 50, y: 50, w: 10, h: 10, action: "navigate" },
          ],
        },
        state,
        renderer,
      ),
    ).rejects.toThrow('Duplicate hotspot label: "Btn"');
    // No screen was created
    expect(state.screens).toHaveLength(0);
  });

  it("rejects @caller when callerScreenId is not provided", async () => {
    await expect(
      handleBundleTool(
        "create_screen_with_hotspots",
        {
          screen: { name: "X", html: SIMPLE_HTML },
          hotspots: [
            { label: "Close", x: 0, y: 0, w: 10, h: 10, action: "navigate", target: "@caller" },
          ],
        },
        state,
        renderer,
      ),
    ).rejects.toThrow("callerScreenId is required");
    expect(state.screens).toHaveLength(0);
  });

  it("rejects @caller in connections when callerScreenId is not provided", async () => {
    await expect(
      handleBundleTool(
        "create_screen_with_hotspots",
        {
          screen: { name: "X", html: SIMPLE_HTML },
          connections: [{ to: "@caller" }],
        },
        state,
        renderer,
      ),
    ).rejects.toThrow("callerScreenId is required");
    expect(state.screens).toHaveLength(0);
  });

  it("rejects callerScreenId that references a nonexistent screen", async () => {
    await expect(
      handleBundleTool(
        "create_screen_with_hotspots",
        {
          screen: { name: "X", html: SIMPLE_HTML },
          hotspots: [
            { label: "Close", x: 0, y: 0, w: 10, h: 10, action: "navigate", target: "@caller" },
          ],
          callerScreenId: "nonexistent-id",
        },
        state,
        renderer,
      ),
    ).rejects.toThrow("Caller screen not found");
    expect(state.screens).toHaveLength(0);
  });

  it("rejects connection with unknown fromHotspot label", async () => {
    await expect(
      handleBundleTool(
        "create_screen_with_hotspots",
        {
          screen: { name: "X", html: SIMPLE_HTML },
          hotspots: [
            { label: "Go", x: 0, y: 0, w: 10, h: 10, action: "navigate" },
          ],
          connections: [{ fromHotspot: "DoesNotExist", to: "@self" }],
        },
        state,
        renderer,
      ),
    ).rejects.toThrow('unknown hotspot label: "DoesNotExist"');
    expect(state.screens).toHaveLength(0);
  });

  // ── Transactional rollback ─────────────────────────────────────────────

  it("rolls back the screen when hotspot creation fails", async () => {
    // Poison addHotspot on the second call
    const origAddHotspot = state.addHotspot.bind(state);
    let callCount = 0;
    vi.spyOn(state, "addHotspot").mockImplementation((...args) => {
      callCount++;
      if (callCount === 2) throw new Error("Simulated hotspot failure");
      return origAddHotspot(...args);
    });

    await expect(
      handleBundleTool(
        "create_screen_with_hotspots",
        {
          screen: { name: "Rollback", html: SIMPLE_HTML },
          hotspots: [
            { label: "OK", x: 0, y: 0, w: 10, h: 10, action: "navigate" },
            { label: "Fail", x: 50, y: 50, w: 10, h: 10, action: "navigate" },
          ],
        },
        state,
        renderer,
      ),
    ).rejects.toThrow("Simulated hotspot failure");

    // Screen was rolled back
    expect(state.screens).toHaveLength(0);
    expect(state.connections).toHaveLength(0);
  });

  it("rolls back everything when connection creation fails", async () => {
    const target = state.addScreen({ name: "Target" });

    // Poison addConnection to fail on explicit connections
    const origAddConnection = state.addConnection.bind(state);
    vi.spyOn(state, "addConnection").mockImplementation((...args) => {
      throw new Error("Simulated connection failure");
    });

    // The hotspot has action "custom" (no auto-connection), so the only
    // addConnection call will be the explicit one — which will fail.
    await expect(
      handleBundleTool(
        "create_screen_with_hotspots",
        {
          screen: { name: "Rollback2", html: SIMPLE_HTML },
          hotspots: [
            { label: "Go", x: 0, y: 0, w: 10, h: 10, action: "custom" },
          ],
          connections: [{ fromHotspot: "Go", to: target.id }],
        },
        state,
        renderer,
      ),
    ).rejects.toThrow("Simulated connection failure");

    // The new screen should be gone; only the pre-existing target remains
    expect(state.screens).toHaveLength(1);
    expect(state.screens[0].id).toBe(target.id);
  });

  // ── Render response fields passthrough ────────────────────────────────

  it("forwards device block from create_screen", async () => {
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      { screen: { name: "DeviceTest", html: SIMPLE_HTML } },
      state,
      renderer,
    );

    expect(result.device).toBeDefined();
    expect(result.device.preset).toBe("iphone");
    expect(result.device.safeArea).toBeDefined();
  });

  // ── Literal targetScreenId on hotspot (no placeholder) ─────────────────

  it("passes through literal targetScreenId on hotspot", async () => {
    const target = state.addScreen({ name: "Settings" });
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "Home", html: SIMPLE_HTML },
        hotspots: [
          { label: "Settings", x: 80, y: 5, w: 10, h: 10, action: "navigate", targetScreenId: target.id },
        ],
      },
      state,
      renderer,
    );

    const screen = state.getScreen(result.screenId);
    expect(screen.hotspots[0].targetScreenId).toBe(target.id);
    expect(result.connectionIds).toHaveLength(1);
  });

  // ── Connection with data_flow ──────────────────────────────────────────

  it("creates connections with data_flow", async () => {
    const target = state.addScreen({ name: "Detail" });
    const result = await handleBundleTool(
      "create_screen_with_hotspots",
      {
        screen: { name: "List", html: SIMPLE_HTML },
        hotspots: [
          { label: "Item", x: 0, y: 0, w: 100, h: 20, action: "custom" },
        ],
        connections: [
          {
            fromHotspot: "Item",
            to: target.id,
            action: "navigate",
            data_flow: [
              { name: "itemId", type: "String", description: "Selected item" },
            ],
          },
        ],
      },
      state,
      renderer,
    );

    expect(result.connectionIds).toHaveLength(1);
    const conn = state.connections.find((c) => c.id === result.connectionIds[0]);
    expect(conn.dataFlow).toHaveLength(1);
    expect(conn.dataFlow[0].name).toBe("itemId");
  });
});

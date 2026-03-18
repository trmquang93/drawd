import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCollaboration } from "./useCollaboration";

// ── Mock supabaseClient ─────────────────────────────────────────────
// We capture handlers registered via channel.on() so tests can fire them.
let channelHandlers;
let mockChannel;
let mockTrackPayload;

function createMockChannel() {
  channelHandlers = {};
  mockTrackPayload = null;

  mockChannel = {
    on(type, filter, cb) {
      const key = type === "broadcast"
        ? `broadcast:${filter.event}`
        : `presence:${filter.event}`;
      channelHandlers[key] = cb;
      return mockChannel; // chainable
    },
    subscribe(cb) {
      // Immediately invoke with "SUBSCRIBED"
      if (cb) Promise.resolve().then(() => cb("SUBSCRIBED"));
      return mockChannel;
    },
    track: vi.fn(async (payload) => { mockTrackPayload = payload; }),
    send: vi.fn(),
    unsubscribe: vi.fn(),
    presenceState: vi.fn(() => ({})),
  };

  return mockChannel;
}

vi.mock("../collab/supabaseClient", () => ({
  supabase: {
    channel: () => createMockChannel(),
  },
}));

// ── Helpers ─────────────────────────────────────────────────────────
const noop = () => {};
const defaultProps = () => ({
  screens: [],
  connections: [],
  documents: [],
  featureBrief: "",
  taskLink: "",
  techStack: "",
  dataModels: [],
  stickyNotes: [],
  screenGroups: [],
  applyRemoteState: noop,
  applyRemoteImage: noop,
  canvasRef: { current: null },
  pan: { x: 0, y: 0 },
  zoom: 1,
});

async function setupAndCreate(overrides = {}) {
  const props = { ...defaultProps(), ...overrides };
  const hook = renderHook(() => useCollaboration(props));

  // Create a room to wire up channel handlers
  await act(async () => {
    hook.result.current.createRoom("Alice", "#ff0000");
    // Let the microtask (subscribe callback) resolve
    await Promise.resolve();
  });
  return hook;
}

// ── Tests ───────────────────────────────────────────────────────────

describe("useCollaboration — cursor broadcast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── track() calls no longer include cursor fields ─────────────
  it("track() in createRoom does not include cursor fields", async () => {
    await setupAndCreate();
    expect(mockTrackPayload).toBeDefined();
    expect(mockTrackPayload).not.toHaveProperty("cursorX");
    expect(mockTrackPayload).not.toHaveProperty("cursorY");
    expect(mockTrackPayload).not.toHaveProperty("cursorTs");
    expect(mockTrackPayload).toHaveProperty("peerId");
    expect(mockTrackPayload).toHaveProperty("displayName", "Alice");
    expect(mockTrackPayload).toHaveProperty("role", "host");
  });

  // ── cursor-update broadcast adds a new cursor ─────────────────
  it("cursor-update broadcast adds a new remote cursor", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];
    expect(handler).toBeDefined();

    act(() => {
      handler({
        payload: {
          peerId: "peer-1",
          displayName: "Bob",
          color: "#00ff00",
          x: 100,
          y: 200,
          ts: 1000,
        },
      });
    });

    expect(result.current.remoteCursors).toHaveLength(1);
    expect(result.current.remoteCursors[0]).toMatchObject({
      id: "peer-1",
      displayName: "Bob",
      x: 100,
      y: 200,
      lastUpdate: 1000,
    });
  });

  // ── cursor-update broadcast updates an existing cursor ────────
  it("cursor-update broadcast updates existing cursor instead of duplicating", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];

    act(() => {
      handler({
        payload: { peerId: "peer-1", displayName: "Bob", color: "#00ff00", x: 100, y: 200, ts: 1000 },
      });
    });
    expect(result.current.remoteCursors).toHaveLength(1);

    act(() => {
      handler({
        payload: { peerId: "peer-1", displayName: "Bob", color: "#00ff00", x: 300, y: 400, ts: 2000 },
      });
    });
    expect(result.current.remoteCursors).toHaveLength(1);
    expect(result.current.remoteCursors[0].x).toBe(300);
    expect(result.current.remoteCursors[0].y).toBe(400);
    expect(result.current.remoteCursors[0].lastUpdate).toBe(2000);
  });

  // ── multiple peers tracked independently ──────────────────────
  it("tracks cursors from multiple peers independently", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];

    act(() => {
      handler({ payload: { peerId: "peer-1", displayName: "Bob", color: "#ff0000", x: 10, y: 20, ts: 100 } });
      handler({ payload: { peerId: "peer-2", displayName: "Eve", color: "#0000ff", x: 50, y: 60, ts: 200 } });
    });

    expect(result.current.remoteCursors).toHaveLength(2);
    expect(result.current.remoteCursors.map((c) => c.id)).toEqual(["peer-1", "peer-2"]);
  });

  // ── ignores payloads without peerId ───────────────────────────
  it("cursor-update broadcast ignores payload without peerId", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];

    act(() => {
      handler({ payload: { displayName: "Ghost", x: 0, y: 0, ts: 1 } });
    });
    expect(result.current.remoteCursors).toHaveLength(0);

    act(() => {
      handler({ payload: null });
    });
    expect(result.current.remoteCursors).toHaveLength(0);
  });

  // ── presence:sync removes cursors for disconnected peers ──────
  it("presence:sync removes cursors when peer leaves", async () => {
    const { result } = await setupAndCreate();
    const cursorHandler = channelHandlers["broadcast:cursor-update"];
    const syncHandler = channelHandlers["presence:sync"];

    // Add two cursors
    act(() => {
      cursorHandler({ payload: { peerId: "peer-1", displayName: "Bob", color: "#ff0000", x: 10, y: 20, ts: 100 } });
      cursorHandler({ payload: { peerId: "peer-2", displayName: "Eve", color: "#0000ff", x: 50, y: 60, ts: 200 } });
    });
    expect(result.current.remoteCursors).toHaveLength(2);

    // Simulate peer-2 leaving — only peer-1 remains in Presence
    mockChannel.presenceState.mockReturnValue({
      "key1": [{ peerId: "peer-1", displayName: "Bob", color: "#ff0000", role: "editor" }],
    });

    act(() => syncHandler());

    expect(result.current.remoteCursors).toHaveLength(1);
    expect(result.current.remoteCursors[0].id).toBe("peer-1");
  });

  // ── presence:sync keeps cursors for active peers ──────────────
  it("presence:sync keeps cursors when all peers are still present", async () => {
    const { result } = await setupAndCreate();
    const cursorHandler = channelHandlers["broadcast:cursor-update"];
    const syncHandler = channelHandlers["presence:sync"];

    act(() => {
      cursorHandler({ payload: { peerId: "peer-1", displayName: "Bob", color: "#ff0000", x: 10, y: 20, ts: 100 } });
    });

    mockChannel.presenceState.mockReturnValue({
      "key1": [{ peerId: "peer-1", displayName: "Bob", color: "#ff0000", role: "editor" }],
    });

    act(() => syncHandler());

    expect(result.current.remoteCursors).toHaveLength(1);
    expect(result.current.remoteCursors[0].id).toBe("peer-1");
  });

  // ── presence:sync still builds peer list without cursor fields ─
  it("presence:sync builds peer list without relying on cursor fields", async () => {
    const { result } = await setupAndCreate();
    const syncHandler = channelHandlers["presence:sync"];

    mockChannel.presenceState.mockReturnValue({
      "key1": [{ peerId: "peer-1", displayName: "Bob", color: "#ff0000", role: "editor" }],
      "key2": [{ peerId: "peer-2", displayName: "Eve", color: "#0000ff", role: "viewer" }],
    });

    act(() => syncHandler());

    expect(result.current.peers).toHaveLength(2);
    expect(result.current.peers[0]).toMatchObject({ id: "peer-1", displayName: "Bob", role: "editor" });
    expect(result.current.peers[1]).toMatchObject({ id: "peer-2", displayName: "Eve", role: "viewer" });
  });

  // ── leaveRoom clears remote cursors ───────────────────────────
  it("leaveRoom clears remoteCursors", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];

    act(() => {
      handler({ payload: { peerId: "peer-1", displayName: "Bob", color: "#ff0000", x: 10, y: 20, ts: 100 } });
    });
    expect(result.current.remoteCursors).toHaveLength(1);

    act(() => result.current.leaveRoom());

    expect(result.current.remoteCursors).toHaveLength(0);
    expect(result.current.isConnected).toBe(false);
  });

});

describe("useCollaboration — stale cursor cleanup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("removes stale cursors after CURSOR_STALE_MS", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];
    const now = Date.now();

    act(() => {
      handler({ payload: { peerId: "fresh", displayName: "Fresh", color: "#ff0000", x: 10, y: 20, ts: now } });
      handler({ payload: { peerId: "stale", displayName: "Stale", color: "#0000ff", x: 30, y: 40, ts: now - 5000 } });
    });
    expect(result.current.remoteCursors).toHaveLength(2);

    // Advance past the 1s interval tick
    act(() => vi.advanceTimersByTime(1100));

    expect(result.current.remoteCursors).toHaveLength(1);
    expect(result.current.remoteCursors[0].id).toBe("fresh");
  });

  it("does not filter when all cursors are fresh", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];
    const now = Date.now();

    act(() => {
      handler({ payload: { peerId: "a", displayName: "A", color: "#ff0000", x: 10, y: 20, ts: now } });
      handler({ payload: { peerId: "b", displayName: "B", color: "#0000ff", x: 30, y: 40, ts: now - 1000 } });
    });
    const before = result.current.remoteCursors;

    act(() => vi.advanceTimersByTime(1100));

    // All fresh — should retain both
    expect(result.current.remoteCursors).toHaveLength(2);
    // Same reference (no unnecessary state update)
    expect(result.current.remoteCursors).toBe(before);
  });

  it("cleanup does not run when not connected", () => {
    const props = defaultProps();
    const { result } = renderHook(() => useCollaboration(props));

    // Not connected — no interval should fire, no error
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.remoteCursors).toHaveLength(0);
  });

  it("cleanup fires repeatedly on each interval tick", async () => {
    const { result } = await setupAndCreate();
    const handler = channelHandlers["broadcast:cursor-update"];
    const now = Date.now();

    // Add a cursor that will go stale after first tick
    act(() => {
      handler({ payload: { peerId: "soon-stale", displayName: "X", color: "#ff0000", x: 10, y: 20, ts: now } });
    });
    expect(result.current.remoteCursors).toHaveLength(1);

    // First tick — still fresh (only 1.1s old vs 4s threshold)
    act(() => vi.advanceTimersByTime(1100));
    expect(result.current.remoteCursors).toHaveLength(1);

    // Advance enough for it to go stale (total ~5.1s elapsed)
    act(() => vi.advanceTimersByTime(4000));
    expect(result.current.remoteCursors).toHaveLength(0);
  });
});

import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function fireKey(key, extra = {}) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...extra }));
}

function makeProps(overrides = {}) {
  return {
    // modal state
    hotspotModal: null,
    connectionEditModal: null,
    renameModal: null,
    importConfirm: null,
    showInstructions: false,
    showDocuments: false,
    showShortcuts: false,
    setShowShortcuts: vi.fn(),
    conditionalPrompt: null,
    editingConditionGroup: null,
    // interaction state
    connecting: null,
    cancelConnecting: vi.fn(),
    hotspotInteraction: null,
    cancelHotspotInteraction: vi.fn(),
    selectedConnection: null,
    setSelectedConnection: vi.fn(),
    selectedHotspots: [],
    setSelectedHotspots: vi.fn(),
    // data & mutations
    connections: [],
    deleteHotspot: vi.fn(),
    deleteHotspots: vi.fn(),
    deleteConnection: vi.fn(),
    deleteConnectionGroup: vi.fn(),
    selectedScreen: null,
    removeScreen: vi.fn(),
    selectedStickyNote: null,
    setSelectedStickyNote: vi.fn(),
    deleteStickyNote: vi.fn(),
    selectedScreenGroup: null,
    setSelectedScreenGroup: vi.fn(),
    deleteScreenGroup: vi.fn(),
    // undo/redo
    undo: vi.fn(),
    redo: vi.fn(),
    // file actions
    saveNow: vi.fn().mockResolvedValue(true),
    isFileSystemSupported: false,
    onSaveAs: vi.fn(),
    onExport: vi.fn(),
    onOpen: vi.fn(),
    // canvas selection
    canvasSelection: [],
    clearSelection: vi.fn(),
    removeScreens: vi.fn(),
    addScreenGroup: vi.fn(),
    screens: [],
    // tool mode
    setActiveTool: vi.fn(),
    ...overrides,
  };
}

describe("useKeyboardShortcuts — Delete key", () => {
  it("deletes a single selected hotspot and cancels the interaction", () => {
    const props = makeProps({
      hotspotInteraction: { mode: "selected", screenId: "s1", hotspotId: "h1" },
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteHotspot).toHaveBeenCalledWith("s1", "h1");
    expect(props.cancelHotspotInteraction).toHaveBeenCalled();
  });

  it("does not delete hotspot when mode is not 'selected'", () => {
    const props = makeProps({
      hotspotInteraction: { mode: "reposition", screenId: "s1", hotspotId: "h1" },
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteHotspot).not.toHaveBeenCalled();
  });

  it("deletes selected sticky note and clears selection", () => {
    const props = makeProps({ selectedStickyNote: "note-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteStickyNote).toHaveBeenCalledWith("note-1");
    expect(props.setSelectedStickyNote).toHaveBeenCalledWith(null);
  });

  it("deletes selected screen group and clears selection", () => {
    const props = makeProps({ selectedScreenGroup: "group-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteScreenGroup).toHaveBeenCalledWith("group-1");
    expect(props.setSelectedScreenGroup).toHaveBeenCalledWith(null);
  });

  it("prefers hotspot delete over sticky note delete", () => {
    const props = makeProps({
      hotspotInteraction: { mode: "selected", screenId: "s1", hotspotId: "h1" },
      selectedStickyNote: "note-1",
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteHotspot).toHaveBeenCalled();
    expect(props.deleteStickyNote).not.toHaveBeenCalled();
  });

  it("prefers sticky note delete over screen group delete", () => {
    const props = makeProps({
      selectedStickyNote: "note-1",
      selectedScreenGroup: "group-1",
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteStickyNote).toHaveBeenCalled();
    expect(props.deleteScreenGroup).not.toHaveBeenCalled();
  });

  it("prefers screen group delete over screen delete", () => {
    const props = makeProps({
      selectedScreenGroup: "group-1",
      selectedScreen: "screen-1",
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteScreenGroup).toHaveBeenCalled();
    expect(props.removeScreen).not.toHaveBeenCalled();
  });

  it("Backspace also deletes selected sticky note", () => {
    const props = makeProps({ selectedStickyNote: "note-2" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Backspace");
    expect(props.deleteStickyNote).toHaveBeenCalledWith("note-2");
    expect(props.setSelectedStickyNote).toHaveBeenCalledWith(null);
  });

  // ── Regression: existing delete behaviors ────────────────────────────────

  it("deletes a selected connection", () => {
    const connId = "conn-1";
    const props = makeProps({
      selectedConnection: connId,
      connections: [{ id: connId }],
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteConnection).toHaveBeenCalledWith(connId);
    expect(props.setSelectedConnection).toHaveBeenCalledWith(null);
  });

  it("deletes a selected screen", () => {
    const props = makeProps({ selectedScreen: "screen-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.removeScreen).toHaveBeenCalledWith("screen-1");
  });

  it("deletes batch-selected hotspots", () => {
    const props = makeProps({
      selectedHotspots: [
        { screenId: "s1", hotspotId: "h1" },
        { screenId: "s1", hotspotId: "h2" },
      ],
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteHotspots).toHaveBeenCalledWith("s1", ["h1", "h2"]);
    expect(props.setSelectedHotspots).toHaveBeenCalledWith([]);
  });

  // ── Guards ────────────────────────────────────────────────────────────────

  it("is blocked when a modal is open", () => {
    const props = makeProps({
      selectedStickyNote: "note-1",
      hotspotModal: { screen: {}, hotspot: {} },
    });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteStickyNote).not.toHaveBeenCalled();
  });

  it("is blocked when focus is in an INPUT", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const props = makeProps({ selectedStickyNote: "note-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteStickyNote).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it("is blocked when focus is in a TEXTAREA", () => {
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    ta.focus();

    const props = makeProps({ selectedScreenGroup: "group-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Delete");
    expect(props.deleteScreenGroup).not.toHaveBeenCalled();

    document.body.removeChild(ta);
  });
});

describe("useKeyboardShortcuts — Escape key", () => {
  it("clears selected sticky note on Escape", () => {
    const props = makeProps({ selectedStickyNote: "note-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Escape");
    expect(props.setSelectedStickyNote).toHaveBeenCalledWith(null);
  });

  it("clears selected screen group on Escape", () => {
    const props = makeProps({ selectedScreenGroup: "group-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Escape");
    expect(props.setSelectedScreenGroup).toHaveBeenCalledWith(null);
  });

  it("clears selected connection on Escape", () => {
    const props = makeProps({ selectedConnection: "conn-1" });
    renderHook(() => useKeyboardShortcuts(props));
    fireKey("Escape");
    expect(props.setSelectedConnection).toHaveBeenCalledWith(null);
  });
});

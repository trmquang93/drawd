import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScreenManager } from "./useScreenManager";

const defaultPan = { x: 0, y: 0 };
const defaultZoom = 1;

function setup() {
  return renderHook(() => useScreenManager(defaultPan, defaultZoom));
}

describe("useScreenManager undo/redo", () => {
  it("starts with canUndo and canRedo false", () => {
    const { result } = setup();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("addScreen is undoable", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "Screen A"));
    expect(result.current.screens).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("redo restores undone addScreen", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "Screen A"));
    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(0);

    act(() => result.current.redo());
    expect(result.current.screens).toHaveLength(1);
    expect(result.current.screens[0].name).toBe("Screen A");
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("renameScreen is undoable", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "Original"));
    const screenId = result.current.screens[0].id;

    act(() => result.current.renameScreen(screenId, "Renamed"));
    expect(result.current.screens[0].name).toBe("Renamed");

    act(() => result.current.undo());
    expect(result.current.screens[0].name).toBe("Original");
  });

  it("removeScreen is undoable and restores connections", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.addConnection(idA, idB));
    expect(result.current.connections).toHaveLength(1);

    act(() => result.current.removeScreen(idA));
    expect(result.current.screens).toHaveLength(1);
    expect(result.current.connections).toHaveLength(0);

    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(2);
    expect(result.current.connections).toHaveLength(1);
  });

  it("deleteConnection is undoable", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    act(() => result.current.deleteConnection(connId));
    expect(result.current.connections).toHaveLength(0);

    act(() => result.current.undo());
    expect(result.current.connections).toHaveLength(1);
  });

  it("new mutation clears redo stack", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.addScreen(null, "B"));
    expect(result.current.canRedo).toBe(false);
  });

  it("replaceAll clears history", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.replaceAll([], [], 1));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.screens).toHaveLength(0);
  });

  it("mergeAll clears history", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.mergeAll([], []));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("captureDragSnapshot + commitDragSnapshot creates single undo step for drag", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "Draggable"));
    const screenId = result.current.screens[0].id;
    const origX = result.current.screens[0].x;

    // Simulate drag: capture, move multiple times, commit
    act(() => result.current.captureDragSnapshot());
    act(() => result.current.moveScreen(screenId, 100, 200));
    act(() => result.current.moveScreen(screenId, 150, 250));
    act(() => result.current.moveScreen(screenId, 200, 300));
    act(() => result.current.commitDragSnapshot());

    expect(result.current.screens[0].x).toBe(200);
    expect(result.current.screens[0].y).toBe(300);

    // Single undo should return to pre-drag position
    act(() => result.current.undo());
    expect(result.current.screens[0].x).toBe(origX);
  });

  it("saveHotspot is undoable", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "S1"));
    const screenId = result.current.screens[0].id;

    const hotspot = {
      id: "hs1",
      label: "Tap",
      x: 10, y: 10, w: 20, h: 20,
      action: "navigate",
      targetScreenId: null,
    };
    act(() => result.current.saveHotspot(screenId, hotspot));
    expect(result.current.screens[0].hotspots).toHaveLength(1);

    act(() => result.current.undo());
    expect(result.current.screens[0].hotspots).toHaveLength(0);
  });

  it("deleteHotspot is undoable and restores connections", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    const hotspot = {
      id: "hs1",
      label: "Go",
      x: 10, y: 10, w: 20, h: 20,
      action: "navigate",
      targetScreenId: idB,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.screens[0].hotspots).toHaveLength(1);
    expect(result.current.connections).toHaveLength(1);

    act(() => result.current.deleteHotspot(idA, "hs1"));
    expect(result.current.screens[0].hotspots).toHaveLength(0);
    expect(result.current.connections).toHaveLength(0);

    act(() => result.current.undo());
    expect(result.current.screens[0].hotspots).toHaveLength(1);
    expect(result.current.connections).toHaveLength(1);
  });

  it("updateScreenDescription is undoable", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "S1"));
    const screenId = result.current.screens[0].id;

    act(() => result.current.updateScreenDescription(screenId, "Hello"));
    expect(result.current.screens[0].description).toBe("Hello");

    act(() => result.current.undo());
    expect(result.current.screens[0].description).toBe("");
  });

  it("multiple undo/redo steps work correctly", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    expect(result.current.screens).toHaveLength(3);

    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(2);

    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(1);

    act(() => result.current.redo());
    expect(result.current.screens).toHaveLength(2);

    act(() => result.current.redo());
    expect(result.current.screens).toHaveLength(3);
  });

  it("undo with empty history is a no-op", () => {
    const { result } = setup();
    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
  });

  it("redo with empty future is a no-op", () => {
    const { result } = setup();
    act(() => result.current.redo());
    expect(result.current.screens).toHaveLength(0);
    expect(result.current.canRedo).toBe(false);
  });

  it("commitDragSnapshot without capture is a no-op", () => {
    const { result } = setup();

    act(() => result.current.addScreen(null, "A"));
    const undoBefore = result.current.canUndo;

    act(() => result.current.commitDragSnapshot());
    // canUndo should not change (no extra snapshot pushed)
    expect(result.current.canUndo).toBe(undoBefore);
  });
});

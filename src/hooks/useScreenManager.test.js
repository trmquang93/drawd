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

describe("saveHotspot connection management", () => {
  it("saving hotspot with action='navigate' and targetScreenId creates a connection", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    const hotspot = {
      id: "hs1", label: "Go", x: 10, y: 10, w: 20, h: 20,
      action: "navigate", targetScreenId: idB,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].fromScreenId).toBe(idA);
    expect(result.current.connections[0].toScreenId).toBe(idB);
    expect(result.current.connections[0].hotspotId).toBe("hs1");
    expect(result.current.connections[0].connectionPath).toBe("default");
  });

  it("saving hotspot with action='modal' and targetScreenId creates a connection", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    const hotspot = {
      id: "hs1", label: "Open", x: 10, y: 10, w: 20, h: 20,
      action: "modal", targetScreenId: idB,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].action).toBe("modal");
    expect(result.current.connections[0].toScreenId).toBe(idB);
  });

  it("saving hotspot with action='api' creates success and error connections when both provided", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    const hotspot = {
      id: "hs1", label: "Fetch", x: 10, y: 10, w: 20, h: 20,
      action: "api", targetScreenId: null,
      apiEndpoint: "/api/data", apiMethod: "GET",
      onSuccessAction: "navigate", onSuccessTargetId: idB,
      onErrorAction: "navigate", onErrorTargetId: idC,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(2);
    const success = result.current.connections.find((c) => c.connectionPath === "api-success");
    const error = result.current.connections.find((c) => c.connectionPath === "api-error");
    expect(success).toBeTruthy();
    expect(success.toScreenId).toBe(idB);
    expect(error).toBeTruthy();
    expect(error.toScreenId).toBe(idC);
  });

  it("saving hotspot with action='api' with only onSuccessTargetId creates 1 connection", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    const hotspot = {
      id: "hs1", label: "Fetch", x: 10, y: 10, w: 20, h: 20,
      action: "api", targetScreenId: null,
      apiEndpoint: "/api/data", apiMethod: "GET",
      onSuccessAction: "navigate", onSuccessTargetId: idB,
      onErrorAction: "", onErrorTargetId: null,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].connectionPath).toBe("api-success");
  });

  it("saving hotspot with action='conditional' with 2 conditions creates 2 connections", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    const hotspot = {
      id: "hs1", label: "Check", x: 10, y: 10, w: 20, h: 20,
      action: "conditional",
      conditions: [
        { id: "c1", label: "logged in", targetScreenId: idB },
        { id: "c2", label: "guest", targetScreenId: idC },
      ],
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(2);
    expect(result.current.connections[0].connectionPath).toBe("condition-0");
    expect(result.current.connections[1].connectionPath).toBe("condition-1");
  });

  it("saving hotspot with action='back' does NOT create a connection", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    const hotspot = {
      id: "hs1", label: "Back", x: 10, y: 10, w: 20, h: 20,
      action: "back", targetScreenId: null,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(0);
  });

  it("saving hotspot with action='custom' does NOT create a connection", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    const hotspot = {
      id: "hs1", label: "Custom", x: 10, y: 10, w: 20, h: 20,
      action: "custom", targetScreenId: null, customDescription: "do something",
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(0);
  });

  it("changing existing hotspot from navigate to back removes the old navigate connection", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    const hotspot = {
      id: "hs1", label: "Go", x: 10, y: 10, w: 20, h: 20,
      action: "navigate", targetScreenId: idB,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(1);

    const updated = { ...hotspot, action: "back", targetScreenId: null };
    act(() => result.current.saveHotspot(idA, updated));
    expect(result.current.connections).toHaveLength(0);
  });
});

describe("removeScreen stateGroup cleanup", () => {
  it("removing one of 3+ screens in a group preserves group on remaining screens", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    act(() => result.current.addState(idA));
    const idB = result.current.screens[1].id;
    act(() => result.current.addState(idA));
    // Now 3 screens in the group
    expect(result.current.screens).toHaveLength(3);
    const groupId = result.current.screens[0].stateGroup;

    act(() => result.current.removeScreen(idB));
    expect(result.current.screens).toHaveLength(2);
    // Both remaining screens still have the group
    expect(result.current.screens[0].stateGroup).toBe(groupId);
    expect(result.current.screens[1].stateGroup).toBe(groupId);
  });

  it("removing one screen when only 2 in group clears stateGroup on remaining", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    act(() => result.current.addState(idA));
    const idB = result.current.screens[1].id;
    expect(result.current.screens).toHaveLength(2);
    expect(result.current.screens[0].stateGroup).toBeTruthy();

    act(() => result.current.removeScreen(idB));
    expect(result.current.screens).toHaveLength(1);
    expect(result.current.screens[0].stateGroup).toBeNull();
    expect(result.current.screens[0].stateName).toBe("");
  });

  it("removing a screen removes all connections from/to it", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    act(() => result.current.addConnection(idA, idB));
    act(() => result.current.addConnection(idC, idB));
    expect(result.current.connections).toHaveLength(2);

    act(() => result.current.removeScreen(idB));
    expect(result.current.connections).toHaveLength(0);
  });
});

describe("addState", () => {
  it("new state screen has x = parent.x + 250", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const parentX = result.current.screens[0].x;
    const idA = result.current.screens[0].id;

    act(() => result.current.addState(idA));
    expect(result.current.screens[1].x).toBe(parentX + 250);
  });

  it("new state screen shares stateGroup with parent", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    act(() => result.current.addState(idA));
    expect(result.current.screens[0].stateGroup).toBeTruthy();
    expect(result.current.screens[1].stateGroup).toBe(result.current.screens[0].stateGroup);
  });

  it("parent screen gets stateName='Default' when it had none before", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;
    expect(result.current.screens[0].stateName).toBe("");

    act(() => result.current.addState(idA));
    expect(result.current.screens[0].stateName).toBe("Default");
  });

  it("calling addState on a screen already in a group reuses existing stateGroup", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    act(() => result.current.addState(idA));
    const groupId = result.current.screens[0].stateGroup;

    act(() => result.current.addState(idA));
    expect(result.current.screens).toHaveLength(3);
    expect(result.current.screens[2].stateGroup).toBe(groupId);
  });
});

describe("linkAsState", () => {
  it("links two screens into the same stateGroup", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.linkAsState(idB, idA));
    expect(result.current.screens[0].stateGroup).toBeTruthy();
    expect(result.current.screens[1].stateGroup).toBe(result.current.screens[0].stateGroup);
  });

  it("parent gets stateName='Default', target gets 'State 1'", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.linkAsState(idB, idA));
    expect(result.current.screens[0].stateName).toBe("Default");
    expect(result.current.screens[1].stateName).toBe("State 1");
  });

  it("does nothing when linking a screen to itself", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    act(() => result.current.linkAsState(idA, idA));
    expect(result.current.screens[0].stateGroup).toBeNull();
  });

  it("does nothing when both screens are already in the same group", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.linkAsState(idB, idA));
    const groupId = result.current.screens[0].stateGroup;

    act(() => result.current.linkAsState(idB, idA));
    expect(result.current.screens[0].stateGroup).toBe(groupId);
    expect(result.current.screens[1].stateGroup).toBe(groupId);
  });

  it("reuses existing stateGroup when parent already has one", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    act(() => result.current.addState(idA));
    const groupId = result.current.screens[0].stateGroup;

    act(() => result.current.linkAsState(idB, idA));
    expect(result.current.screens[1].stateGroup).toBe(groupId);

    act(() => result.current.linkAsState(idC, idA));
    expect(result.current.screens[2].stateGroup).toBe(groupId);
  });

  it("is undoable", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.linkAsState(idB, idA));
    expect(result.current.screens[0].stateGroup).toBeTruthy();

    act(() => result.current.undo());
    expect(result.current.screens[0].stateGroup).toBeNull();
    expect(result.current.screens[1].stateGroup).toBeNull();
  });

  it("preserves existing stateName on target screen", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.updateStateName(idB, "Loading"));
    act(() => result.current.linkAsState(idB, idA));
    expect(result.current.screens[1].stateName).toBe("Loading");
  });
});

describe("saveConnectionGroup", () => {
  it("navigate mode saves connection with fromScreenId, toScreenId, label", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    act(() => result.current.saveConnectionGroup(connId, {
      mode: "navigate",
      label: "Next",
      targetId: idB,
      fromScreenId: idA,
    }));
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].label).toBe("Next");
    expect(result.current.connections[0].fromScreenId).toBe(idA);
    expect(result.current.connections[0].toScreenId).toBe(idB);
  });

  it("conditional mode saves multiple connections with conditionGroupId", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    act(() => result.current.saveConnectionGroup(connId, {
      mode: "conditional",
      fromScreenId: idA,
      conditions: [
        { label: "yes", targetScreenId: idB },
        { label: "no", targetScreenId: idC },
      ],
    }));
    // Original replaced with 2 conditional connections
    expect(result.current.connections).toHaveLength(2);
    const groupId = result.current.connections[0].conditionGroupId;
    expect(groupId).toBeTruthy();
    expect(result.current.connections[1].conditionGroupId).toBe(groupId);
  });

  it("replacing existing group deletes old connections and creates new ones", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    act(() => result.current.addScreen(null, "D"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;
    const idD = result.current.screens[3].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    // Create initial conditional group
    act(() => result.current.saveConnectionGroup(connId, {
      mode: "conditional",
      fromScreenId: idA,
      conditions: [
        { label: "yes", targetScreenId: idB },
        { label: "no", targetScreenId: idC },
      ],
    }));
    const groupId = result.current.connections[0].conditionGroupId;
    expect(result.current.connections).toHaveLength(2);

    // Replace with new conditions
    act(() => result.current.saveConnectionGroup(null, {
      mode: "conditional",
      fromScreenId: idA,
      conditionGroupId: groupId,
      conditions: [
        { label: "a", targetScreenId: idB },
        { label: "b", targetScreenId: idC },
        { label: "c", targetScreenId: idD },
      ],
    }));
    expect(result.current.connections).toHaveLength(3);
    expect(result.current.connections.every((c) => c.conditionGroupId === groupId)).toBe(true);
  });
});

describe("convertToConditionalGroup", () => {
  it("creates two connections with connectionPath='condition-0' and 'condition-1'", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    act(() => result.current.convertToConditionalGroup(connId, idA, idC));
    expect(result.current.connections).toHaveLength(2);
    const paths = result.current.connections.map((c) => c.connectionPath).sort();
    expect(paths).toEqual(["condition-0", "condition-1"]);
  });

  it("both connections share the same conditionGroupId", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    act(() => result.current.convertToConditionalGroup(connId, idA, idC));
    const groupId = result.current.connections[0].conditionGroupId;
    expect(groupId).toBeTruthy();
    expect(result.current.connections[1].conditionGroupId).toBe(groupId);
  });
});

describe("addToConditionalGroup", () => {
  it("adds new connection with connectionPath='condition-N' where N is max+1", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    act(() => result.current.addScreen(null, "D"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;
    const idD = result.current.screens[3].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    let groupId;
    act(() => { groupId = result.current.convertToConditionalGroup(connId, idA, idC); });
    expect(result.current.connections).toHaveLength(2);

    act(() => result.current.addToConditionalGroup(idA, idD, groupId));
    expect(result.current.connections).toHaveLength(3);
    const newConn = result.current.connections[2];
    expect(newConn.connectionPath).toBe("condition-2");
  });

  it("new connection joins the existing conditionGroupId", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    act(() => result.current.addScreen(null, "D"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;
    const idD = result.current.screens[3].id;

    act(() => result.current.addConnection(idA, idB));
    const connId = result.current.connections[0].id;

    let groupId;
    act(() => { groupId = result.current.convertToConditionalGroup(connId, idA, idC); });

    act(() => result.current.addToConditionalGroup(idA, idD, groupId));
    expect(result.current.connections[2].conditionGroupId).toBe(groupId);
  });
});

describe("pasteHotspots", () => {
  it("pasted hotspots get new IDs (not the originals)", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    const origHotspots = [
      { id: "orig1", label: "Tap", x: 10, y: 10, w: 20, h: 20, action: "navigate", targetScreenId: "some-id" },
    ];
    act(() => result.current.pasteHotspots(idA, origHotspots));
    const pasted = result.current.screens[0].hotspots;
    expect(pasted).toHaveLength(1);
    expect(pasted[0].id).not.toBe("orig1");
  });

  it("pasted hotspots have x/y offset by +5% (or clamped to bounds)", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    const origHotspots = [
      { id: "orig1", label: "Tap", x: 10, y: 10, w: 20, h: 20, action: "navigate", targetScreenId: null },
    ];
    act(() => result.current.pasteHotspots(idA, origHotspots));
    const pasted = result.current.screens[0].hotspots[0];
    expect(pasted.x).toBe(15);
    expect(pasted.y).toBe(15);
  });

  it("pasted hotspots have targetScreenId cleared", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    const origHotspots = [
      { id: "orig1", label: "Tap", x: 10, y: 10, w: 20, h: 20, action: "navigate", targetScreenId: "some-target" },
    ];
    act(() => result.current.pasteHotspots(idA, origHotspots));
    expect(result.current.screens[0].hotspots[0].targetScreenId).toBeNull();
  });
});

describe("assignScreenImage (image replacement)", () => {
  it("replaces imageData on an existing screen", () => {
    const { result } = setup();
    act(() => result.current.addScreen("img-A", "Screen"));
    const id = result.current.screens[0].id;
    expect(result.current.screens[0].imageData).toBe("img-A");

    act(() => result.current.assignScreenImage(id, "img-B"));
    expect(result.current.screens[0].imageData).toBe("img-B");
  });

  it("clears imageWidth and imageHeight on replacement", () => {
    const { result } = setup();
    act(() => result.current.addScreen("img-A", "Screen"));
    const id = result.current.screens[0].id;

    act(() => result.current.updateScreenDimensions(id, 375, 812));
    expect(result.current.screens[0].imageWidth).toBe(375);
    expect(result.current.screens[0].imageHeight).toBe(812);

    act(() => result.current.assignScreenImage(id, "img-B"));
    expect(result.current.screens[0].imageWidth).toBeUndefined();
    expect(result.current.screens[0].imageHeight).toBeUndefined();
  });

  it("preserves hotspots when replacing image", () => {
    const { result } = setup();
    act(() => result.current.addScreen("img-A", "Screen"));
    const id = result.current.screens[0].id;

    const hotspot = {
      id: "hs1", label: "Tap", x: 10, y: 10, w: 20, h: 20,
      action: "navigate", targetScreenId: null,
    };
    act(() => result.current.saveHotspot(id, hotspot));
    expect(result.current.screens[0].hotspots).toHaveLength(1);

    act(() => result.current.assignScreenImage(id, "img-B"));
    expect(result.current.screens[0].hotspots).toHaveLength(1);
    expect(result.current.screens[0].hotspots[0].id).toBe("hs1");
  });

  it("preserves connections when replacing image", () => {
    const { result } = setup();
    act(() => result.current.addScreen("img-A", "A"));
    act(() => result.current.addScreen("img-B", "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    act(() => result.current.addConnection(idA, idB));
    expect(result.current.connections).toHaveLength(1);

    act(() => result.current.assignScreenImage(idA, "img-C"));
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0].fromScreenId).toBe(idA);
  });

  it("preserves screen name and position", () => {
    const { result } = setup();
    act(() => result.current.addScreen("img-A", "MyScreen"));
    const id = result.current.screens[0].id;
    const origX = result.current.screens[0].x;
    const origY = result.current.screens[0].y;

    act(() => result.current.assignScreenImage(id, "img-B"));
    expect(result.current.screens[0].name).toBe("MyScreen");
    expect(result.current.screens[0].x).toBe(origX);
    expect(result.current.screens[0].y).toBe(origY);
  });

  it("is undoable", () => {
    const { result } = setup();
    act(() => result.current.addScreen("img-A", "Screen"));
    const id = result.current.screens[0].id;

    act(() => result.current.assignScreenImage(id, "img-B"));
    expect(result.current.screens[0].imageData).toBe("img-B");

    act(() => result.current.undo());
    expect(result.current.screens[0].imageData).toBe("img-A");
  });
});

describe("document CRUD", () => {
  it("addDocument returns new document ID synchronously", () => {
    const { result } = setup();
    let docId;
    act(() => { docId = result.current.addDocument("API Spec", "content here"); });
    expect(docId).toBeTruthy();
    expect(typeof docId).toBe("string");
    expect(result.current.documents).toHaveLength(1);
    expect(result.current.documents[0].id).toBe(docId);
    expect(result.current.documents[0].name).toBe("API Spec");
  });

  it("updateDocument updates the document name", () => {
    const { result } = setup();
    let docId;
    act(() => { docId = result.current.addDocument("Old Name", "content"); });

    act(() => result.current.updateDocument(docId, { name: "New Name" }));
    expect(result.current.documents[0].name).toBe("New Name");
    expect(result.current.documents[0].content).toBe("content");
  });

  it("deleteDocument removes document from documents array", () => {
    const { result } = setup();
    let docId;
    act(() => { docId = result.current.addDocument("Doc", "content"); });
    expect(result.current.documents).toHaveLength(1);

    act(() => result.current.deleteDocument(docId));
    expect(result.current.documents).toHaveLength(0);
  });

  it("deleteDocument clears documentId on any hotspot that referenced it", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    const idA = result.current.screens[0].id;

    let docId;
    act(() => { docId = result.current.addDocument("API Spec", "content"); });

    const hotspot = {
      id: "hs1", label: "Fetch", x: 10, y: 10, w: 20, h: 20,
      action: "api", apiEndpoint: "/api", apiMethod: "GET",
      documentId: docId,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.screens[0].hotspots[0].documentId).toBe(docId);

    act(() => result.current.deleteDocument(docId));
    expect(result.current.screens[0].hotspots[0].documentId).toBeNull();
    expect(result.current.documents).toHaveLength(0);
  });
});

describe("addScreensBatch", () => {
  it("creates multiple screens at specified positions", () => {
    const { result } = setup();

    act(() =>
      result.current.addScreensBatch([
        { imageData: null, name: "A", x: 0, y: 0 },
        { imageData: null, name: "B", x: 300, y: 0 },
        { imageData: null, name: "C", x: 600, y: 0 },
      ])
    );

    expect(result.current.screens).toHaveLength(3);
    expect(result.current.screens[0].name).toBe("A");
    expect(result.current.screens[1].name).toBe("B");
    expect(result.current.screens[2].name).toBe("C");
    expect(result.current.screens[0].x).toBe(0);
    expect(result.current.screens[1].x).toBe(300);
    expect(result.current.screens[2].x).toBe(600);
  });

  it("single undo removes all screens from the batch", () => {
    const { result } = setup();

    act(() =>
      result.current.addScreensBatch([
        { imageData: null, name: "A", x: 0, y: 0 },
        { imageData: null, name: "B", x: 300, y: 0 },
      ])
    );
    expect(result.current.screens).toHaveLength(2);

    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(0);
  });

  it("redo restores all screens from the batch", () => {
    const { result } = setup();

    act(() =>
      result.current.addScreensBatch([
        { imageData: null, name: "A", x: 0, y: 0 },
        { imageData: null, name: "B", x: 300, y: 0 },
      ])
    );

    act(() => result.current.undo());
    expect(result.current.screens).toHaveLength(0);

    act(() => result.current.redo());
    expect(result.current.screens).toHaveLength(2);
    expect(result.current.screens[0].name).toBe("A");
    expect(result.current.screens[1].name).toBe("B");
  });

  it("selects the first screen in the batch", () => {
    const { result } = setup();

    act(() =>
      result.current.addScreensBatch([
        { imageData: null, name: "A", x: 0, y: 0 },
        { imageData: null, name: "B", x: 300, y: 0 },
      ])
    );

    expect(result.current.selectedScreen).toBe(result.current.screens[0].id);
  });

  it("returns 0 and does not push history for empty batch", () => {
    const { result } = setup();

    let count;
    act(() => { count = result.current.addScreensBatch([]); });
    expect(count).toBe(0);
    expect(result.current.screens).toHaveLength(0);
    expect(result.current.canUndo).toBe(false);
  });
});

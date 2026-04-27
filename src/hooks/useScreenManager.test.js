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

  it("conditional hotspot connections share a single non-null conditionGroupId", () => {
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

    const groupId = result.current.connections[0].conditionGroupId;
    expect(groupId).toBeTruthy();
    expect(result.current.connections[1].conditionGroupId).toBe(groupId);
    // Re-saving generates a fresh groupId (connections are wiped + recreated),
    // but every branch must still share whatever groupId is in effect.
    act(() => result.current.saveHotspot(idA, hotspot));
    const newGroupId = result.current.connections[0].conditionGroupId;
    expect(newGroupId).toBeTruthy();
    expect(result.current.connections[1].conditionGroupId).toBe(newGroupId);
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

  it("hotspot-backed conversion syncs hotspot.action='conditional' with conditions", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    // Seed a hotspot in a "navigate" state pointing at B (mirrors what
    // quickConnectHotspot leaves behind after the first drag from a hotspot).
    const hotspot = {
      id: "hs1", label: "Tap", x: 10, y: 10, w: 20, h: 20,
      action: "navigate", targetScreenId: idB,
    };
    act(() => result.current.saveHotspot(idA, hotspot));
    expect(result.current.connections).toHaveLength(1);
    const connId = result.current.connections[0].id;

    // Second drag from the same hotspot to C → convertToConditionalGroup with hotspotId.
    act(() => result.current.convertToConditionalGroup(connId, idA, idC, "hs1"));

    const updatedHotspot = result.current.screens[0].hotspots.find((h) => h.id === "hs1");
    expect(updatedHotspot.action).toBe("conditional");
    expect(updatedHotspot.targetScreenId).toBeNull();
    expect(updatedHotspot.conditions).toHaveLength(2);
    expect(updatedHotspot.conditions[0].targetScreenId).toBe(idB);
    expect(updatedHotspot.conditions[1].targetScreenId).toBe(idC);
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

  it("hotspot-backed addTo appends to hotspot.conditions", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    act(() => result.current.addScreen(null, "D"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;
    const idD = result.current.screens[3].id;

    // Seed: hotspot navigating to B (quickConnectHotspot output).
    act(() => result.current.saveHotspot(idA, {
      id: "hs1", label: "Tap", x: 10, y: 10, w: 20, h: 20,
      action: "navigate", targetScreenId: idB,
    }));
    const connId = result.current.connections[0].id;

    // Drag #2: convert to a conditional group (B + C).
    let groupId;
    act(() => { groupId = result.current.convertToConditionalGroup(connId, idA, idC, "hs1"); });

    // Drag #3: add D to the same hotspot's conditional group.
    act(() => result.current.addToConditionalGroup(idA, idD, groupId, "hs1"));

    const updatedHotspot = result.current.screens[0].hotspots.find((h) => h.id === "hs1");
    expect(updatedHotspot.action).toBe("conditional");
    expect(updatedHotspot.conditions).toHaveLength(3);
    expect(updatedHotspot.conditions.map((c) => c.targetScreenId)).toEqual([idB, idC, idD]);
  });
});

describe("deleteConnection hotspot sync", () => {
  it("deleting one of two hotspot conditional branches reverts hotspot to navigate", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;

    // Set up a hotspot-backed conditional group via the drag flow.
    act(() => result.current.saveHotspot(idA, {
      id: "hs1", label: "Tap", x: 10, y: 10, w: 20, h: 20,
      action: "navigate", targetScreenId: idB,
    }));
    const firstConnId = result.current.connections[0].id;
    act(() => result.current.convertToConditionalGroup(firstConnId, idA, idC, "hs1"));
    expect(result.current.connections).toHaveLength(2);

    // Delete the second branch (the C-bound one).
    const cConn = result.current.connections.find((c) => c.toScreenId === idC);
    act(() => result.current.deleteConnection(cConn.id));

    expect(result.current.connections).toHaveLength(1);
    const hotspot = result.current.screens[0].hotspots.find((h) => h.id === "hs1");
    expect(hotspot.action).toBe("navigate");
    expect(hotspot.targetScreenId).toBe(idB);
    expect(hotspot.conditions).toEqual([]);
  });

  it("deleting one of three hotspot conditional branches keeps conditional with two", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    act(() => result.current.addScreen(null, "D"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;
    const idD = result.current.screens[3].id;

    act(() => result.current.saveHotspot(idA, {
      id: "hs1", label: "Tap", x: 10, y: 10, w: 20, h: 20,
      action: "navigate", targetScreenId: idB,
    }));
    const firstConnId = result.current.connections[0].id;
    let groupId;
    act(() => { groupId = result.current.convertToConditionalGroup(firstConnId, idA, idC, "hs1"); });
    act(() => result.current.addToConditionalGroup(idA, idD, groupId, "hs1"));
    expect(result.current.connections).toHaveLength(3);

    // Delete the middle branch (the C-bound one).
    const cConn = result.current.connections.find((c) => c.toScreenId === idC);
    act(() => result.current.deleteConnection(cConn.id));

    expect(result.current.connections).toHaveLength(2);
    const hotspot = result.current.screens[0].hotspots.find((h) => h.id === "hs1");
    expect(hotspot.action).toBe("conditional");
    expect(hotspot.conditions).toHaveLength(2);
    expect(hotspot.conditions.map((c) => c.targetScreenId).sort()).toEqual([idB, idD].sort());
  });

  it("deleting a non-hotspot connection does not mutate any hotspot", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;

    // A hotspot in conditional state, untouched by the deletion under test.
    act(() => result.current.saveHotspot(idA, {
      id: "hs1", label: "Check", x: 10, y: 10, w: 20, h: 20,
      action: "conditional",
      conditions: [
        { id: "c1", label: "x", targetScreenId: idB },
        { id: "c2", label: "y", targetScreenId: idB },
      ],
    }));
    const hotspotBefore = result.current.screens[0].hotspots.find((h) => h.id === "hs1");

    // Add a plain (non-hotspot) connection and delete it.
    act(() => result.current.addConnection(idA, idB));
    const plainConn = result.current.connections.find((c) => !c.hotspotId);
    act(() => result.current.deleteConnection(plainConn.id));

    const hotspotAfter = result.current.screens[0].hotspots.find((h) => h.id === "hs1");
    expect(hotspotAfter).toEqual(hotspotBefore);
  });

  it("preserves rich per-condition data when shrinking from 3 → 2 branches", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "A"));
    act(() => result.current.addScreen(null, "B"));
    act(() => result.current.addScreen(null, "C"));
    act(() => result.current.addScreen(null, "D"));
    const idA = result.current.screens[0].id;
    const idB = result.current.screens[1].id;
    const idC = result.current.screens[2].id;
    const idD = result.current.screens[3].id;

    // Three rich conditions (each with a distinct label so label+target match
    // is unambiguous when we rebuild after the deletion).
    act(() => result.current.saveHotspot(idA, {
      id: "hs1", label: "Check", x: 10, y: 10, w: 20, h: 20,
      action: "conditional",
      conditions: [
        { id: "c1", label: "alpha", targetScreenId: idB, action: "navigate", dataFlow: [{ key: "u" }] },
        { id: "c2", label: "beta", targetScreenId: idC, action: "navigate", dataFlow: [{ key: "v" }] },
        { id: "c3", label: "gamma", targetScreenId: idD, action: "navigate", dataFlow: [{ key: "w" }] },
      ],
    }));
    expect(result.current.connections).toHaveLength(3);

    // Delete the C-bound branch.
    const cConn = result.current.connections.find((c) => c.toScreenId === idC);
    act(() => result.current.deleteConnection(cConn.id));

    const hotspot = result.current.screens[0].hotspots.find((h) => h.id === "hs1");
    expect(hotspot.conditions).toHaveLength(2);
    const labels = hotspot.conditions.map((c) => c.label);
    expect(labels).toEqual(["alpha", "gamma"]);
    // Original dataFlow objects should be carried over via the label+target match.
    expect(hotspot.conditions[0].dataFlow).toEqual([{ key: "u" }]);
    expect(hotspot.conditions[1].dataFlow).toEqual([{ key: "w" }]);
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

describe("useScreenManager component promotion", () => {
  it("removeScreen on canonical with two instances promotes first instance, merges hotspots, re-points connections", () => {
    // Build: canonical with hotspot hC1 (navigate -> targetScreen).
    // Instance 1 has its own local hI1.
    const { result } = setup();
    act(() => result.current.addScreen(null, "Target"));
    const targetId = result.current.screens[0].id;

    act(() => result.current.addScreen(null, "Canonical"));
    const canonicalId = result.current.screens[1].id;
    const canonicalHotspot = {
      id: "hC1",
      label: "CanTap",
      x: 0, y: 0, w: 10, h: 10,
      action: "navigate",
      targetScreenId: targetId,
    };
    act(() => result.current.saveHotspot(canonicalId, canonicalHotspot));
    act(() => result.current.setScreenComponent(canonicalId, "canonical"));
    const componentId = result.current.screens.find((s) => s.id === canonicalId).componentId;

    act(() => result.current.addScreen(null, "Instance 1"));
    const inst1Id = result.current.screens[result.current.screens.length - 1].id;
    act(() => result.current.setScreenComponent(inst1Id, "instance", { componentId }));
    const localHotspot = {
      id: "hI1",
      label: "LocalTap",
      x: 50, y: 50, w: 10, h: 10,
      action: "navigate",
      targetScreenId: null,
    };
    act(() => result.current.saveHotspot(inst1Id, localHotspot));

    act(() => result.current.addScreen(null, "Instance 2"));
    const inst2Id = result.current.screens[result.current.screens.length - 1].id;
    act(() => result.current.setScreenComponent(inst2Id, "instance", { componentId }));

    // Sanity: connection from canonical exists, keyed off hC1.
    const connBefore = result.current.connections.find(
      (c) => c.fromScreenId === canonicalId && c.hotspotId === "hC1"
    );
    expect(connBefore).toBeTruthy();

    // Delete canonical.
    act(() => result.current.removeScreen(canonicalId));

    // Canonical gone.
    expect(result.current.screens.find((s) => s.id === canonicalId)).toBeUndefined();
    // Instance 1 promoted.
    const promoted = result.current.screens.find((s) => s.id === inst1Id);
    expect(promoted.componentRole).toBe("canonical");
    // Hotspots merged: canonical's hC1 first, then instance's hI1.
    const ids = promoted.hotspots.map((h) => h.id);
    expect(ids).toContain("hC1");
    expect(ids).toContain("hI1");
    expect(promoted.hotspots).toHaveLength(2);
    // Instance 2 still an instance.
    const stillInstance = result.current.screens.find((s) => s.id === inst2Id);
    expect(stillInstance.componentRole).toBe("instance");

    // Connection re-pointed: now flows from promoted (inst1) instead of removed canonical.
    const connAfter = result.current.connections.find((c) => c.hotspotId === "hC1");
    expect(connAfter).toBeTruthy();
    expect(connAfter.fromScreenId).toBe(inst1Id);
    expect(connAfter.toScreenId).toBe(targetId);
  });

  it("removeScreens batch-deletes canonical with instances; promotes & re-points", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "Target"));
    const targetId = result.current.screens[0].id;

    act(() => result.current.addScreen(null, "Canonical"));
    const canonicalId = result.current.screens[1].id;
    act(() =>
      result.current.saveHotspot(canonicalId, {
        id: "hC1", label: "CanTap", x: 0, y: 0, w: 10, h: 10,
        action: "navigate", targetScreenId: targetId,
      })
    );
    act(() => result.current.setScreenComponent(canonicalId, "canonical"));
    const componentId = result.current.screens.find((s) => s.id === canonicalId).componentId;

    act(() => result.current.addScreen(null, "Instance 1"));
    const inst1Id = result.current.screens[result.current.screens.length - 1].id;
    act(() => result.current.setScreenComponent(inst1Id, "instance", { componentId }));
    act(() =>
      result.current.saveHotspot(inst1Id, {
        id: "hI1", label: "LocalTap", x: 50, y: 50, w: 10, h: 10,
        action: "navigate", targetScreenId: null,
      })
    );

    // Add an unrelated screen alongside the canonical in the batch removal.
    act(() => result.current.addScreen(null, "Other"));
    const otherId = result.current.screens[result.current.screens.length - 1].id;

    act(() => result.current.removeScreens([canonicalId, otherId]));

    expect(result.current.screens.find((s) => s.id === canonicalId)).toBeUndefined();
    expect(result.current.screens.find((s) => s.id === otherId)).toBeUndefined();
    const promoted = result.current.screens.find((s) => s.id === inst1Id);
    expect(promoted.componentRole).toBe("canonical");
    const ids = promoted.hotspots.map((h) => h.id);
    expect(ids).toContain("hC1");
    expect(ids).toContain("hI1");

    const connAfter = result.current.connections.find((c) => c.hotspotId === "hC1");
    expect(connAfter).toBeTruthy();
    expect(connAfter.fromScreenId).toBe(inst1Id);
  });

  it("setScreenComponent unlink on canonical with instances promotes first instance, merges hotspots, re-points", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "Target"));
    const targetId = result.current.screens[0].id;

    act(() => result.current.addScreen(null, "Canonical"));
    const canonicalId = result.current.screens[1].id;
    act(() =>
      result.current.saveHotspot(canonicalId, {
        id: "hC1", label: "CanTap", x: 0, y: 0, w: 10, h: 10,
        action: "navigate", targetScreenId: targetId,
      })
    );
    act(() => result.current.setScreenComponent(canonicalId, "canonical"));
    const componentId = result.current.screens.find((s) => s.id === canonicalId).componentId;

    act(() => result.current.addScreen(null, "Instance 1"));
    const inst1Id = result.current.screens[result.current.screens.length - 1].id;
    act(() => result.current.setScreenComponent(inst1Id, "instance", { componentId }));
    act(() =>
      result.current.saveHotspot(inst1Id, {
        id: "hI1", label: "LocalTap", x: 50, y: 50, w: 10, h: 10,
        action: "navigate", targetScreenId: null,
      })
    );

    act(() => result.current.setScreenComponent(canonicalId, "unlink"));

    const unlinked = result.current.screens.find((s) => s.id === canonicalId);
    expect(unlinked.componentRole).toBeNull();
    expect(unlinked.componentId).toBeNull();

    const promoted = result.current.screens.find((s) => s.id === inst1Id);
    expect(promoted.componentRole).toBe("canonical");
    const ids = promoted.hotspots.map((h) => h.id);
    expect(ids).toContain("hC1");
    expect(ids).toContain("hI1");

    // Re-point: connection from the (now-unlinked) canonical that referenced
    // hC1 should now flow from the promoted instance.
    const connRePointed = result.current.connections.find(
      (c) => c.hotspotId === "hC1" && c.fromScreenId === inst1Id
    );
    expect(connRePointed).toBeTruthy();
  });

  it("promotion dedupes by hotspot id (canonical wins on collision)", () => {
    const { result } = setup();
    act(() => result.current.addScreen(null, "Target"));
    const targetId = result.current.screens[0].id;

    act(() => result.current.addScreen(null, "Canonical"));
    const canonicalId = result.current.screens[1].id;
    const sharedId = "hSHARED";
    act(() =>
      result.current.saveHotspot(canonicalId, {
        id: sharedId, label: "Canonical version", x: 0, y: 0, w: 10, h: 10,
        action: "navigate", targetScreenId: targetId,
      })
    );
    act(() => result.current.setScreenComponent(canonicalId, "canonical"));
    const componentId = result.current.screens.find((s) => s.id === canonicalId).componentId;

    act(() => result.current.addScreen(null, "Instance 1"));
    const inst1Id = result.current.screens[result.current.screens.length - 1].id;
    act(() => result.current.setScreenComponent(inst1Id, "instance", { componentId }));
    act(() =>
      result.current.saveHotspot(inst1Id, {
        id: sharedId, label: "Instance version", x: 50, y: 50, w: 10, h: 10,
        action: "navigate", targetScreenId: null,
      })
    );

    act(() => result.current.removeScreen(canonicalId));

    const promoted = result.current.screens.find((s) => s.id === inst1Id);
    expect(promoted.hotspots).toHaveLength(1);
    // Canonical wins on collision — its label is preserved.
    expect(promoted.hotspots[0].id).toBe(sharedId);
    expect(promoted.hotspots[0].label).toBe("Canonical version");
  });
});

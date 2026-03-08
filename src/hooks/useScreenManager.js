import { useState, useRef, useCallback } from "react";
import { generateId } from "../utils/generateId";

export function useScreenManager(pan, zoom, canvasRef) {
  const [screens, setScreens] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedScreen, setSelectedScreen] = useState(null);

  const fileInputRef = useRef(null);
  const screenCounter = useRef(1);

  // Undo/redo history
  const historyRef = useRef({ past: [], future: [] });
  const dragSnapshotRef = useRef(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 0);
    setCanRedo(historyRef.current.future.length > 0);
  }, []);

  const pushHistory = useCallback((prevScreens, prevConnections) => {
    const snapshot = {
      screens: JSON.parse(JSON.stringify(prevScreens)),
      connections: JSON.parse(JSON.stringify(prevConnections)),
    };
    historyRef.current.past.push(snapshot);
    historyRef.current.future = [];
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const clearHistory = useCallback(() => {
    historyRef.current = { past: [], future: [] };
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const captureDragSnapshot = useCallback(() => {
    dragSnapshotRef.current = {
      screens: JSON.parse(JSON.stringify(screens)),
      connections: JSON.parse(JSON.stringify(connections)),
    };
  }, [screens, connections]);

  const commitDragSnapshot = useCallback(() => {
    if (dragSnapshotRef.current) {
      historyRef.current.past.push(dragSnapshotRef.current);
      historyRef.current.future = [];
      dragSnapshotRef.current = null;
      syncHistoryFlags();
    }
  }, [syncHistoryFlags]);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (past.length === 0) return;
    const current = {
      screens: JSON.parse(JSON.stringify(screens)),
      connections: JSON.parse(JSON.stringify(connections)),
    };
    future.push(current);
    const snapshot = past.pop();
    setScreens(snapshot.screens);
    setConnections(snapshot.connections);
    syncHistoryFlags();
  }, [screens, connections, syncHistoryFlags]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;
    const current = {
      screens: JSON.parse(JSON.stringify(screens)),
      connections: JSON.parse(JSON.stringify(connections)),
    };
    past.push(current);
    const snapshot = future.pop();
    setScreens(snapshot.screens);
    setConnections(snapshot.connections);
    syncHistoryFlags();
  }, [screens, connections, syncHistoryFlags]);

  const addScreen = useCallback((imageData = null, name = null) => {
    pushHistory(screens, connections);
    const count = screenCounter.current++;
    const offsetX = (screens.length % 4) * 280 + 60;
    const offsetY = Math.floor(screens.length / 4) * 420 + 60;
    const newScreen = {
      id: generateId(),
      name: name || `Screen ${count}`,
      x: (-pan.x + offsetX) / zoom,
      y: (-pan.y + offsetY) / zoom,
      width: 220,
      imageData,
      description: "",
      hotspots: [],
      stateGroup: null,
      stateName: "",
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, pushHistory, pan, zoom]);

  const addScreenAtCenter = useCallback((imageData = null, name = null, offset = 0) => {
    pushHistory(screens, connections);
    const count = screenCounter.current++;
    const screenWidth = 220;
    const screenHeight = 160;
    const el = canvasRef?.current;
    const vw = el ? el.clientWidth : 800;
    const vh = el ? el.clientHeight : 600;
    const cx = (-pan.x + vw / 2) / zoom - screenWidth / 2 + offset * 30;
    const cy = (-pan.y + vh / 2) / zoom - screenHeight / 2 + offset * 30;
    const newScreen = {
      id: generateId(),
      name: name || `Screen ${count}`,
      x: cx,
      y: cy,
      width: screenWidth,
      imageData,
      description: "",
      hotspots: [],
      stateGroup: null,
      stateName: "",
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, pushHistory, pan, zoom, canvasRef]);

  const removeScreen = useCallback((id) => {
    pushHistory(screens, connections);
    const removedScreen = screens.find((s) => s.id === id);
    setScreens((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      // Auto-cleanup: if only one screen left in the stateGroup, clear it
      if (removedScreen?.stateGroup) {
        const siblings = remaining.filter((s) => s.stateGroup === removedScreen.stateGroup);
        if (siblings.length === 1) {
          return remaining.map((s) =>
            s.stateGroup === removedScreen.stateGroup
              ? { ...s, stateGroup: null, stateName: "" }
              : s
          );
        }
      }
      return remaining;
    });
    setConnections((prev) =>
      prev.filter((c) => c.fromScreenId !== id && c.toScreenId !== id)
    );
    if (selectedScreen === id) setSelectedScreen(null);
  }, [selectedScreen, screens, connections, pushHistory]);

  const renameScreen = useCallback((id, name) => {
    pushHistory(screens, connections);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, [screens, connections, pushHistory]);

  const updateScreenDescription = useCallback((id, description) => {
    pushHistory(screens, connections);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, description } : s)));
  }, [screens, connections, pushHistory]);

  const assignScreenImage = useCallback((id, imageData) => {
    pushHistory(screens, connections);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, imageData } : s)));
  }, [screens, connections, pushHistory]);

  const moveScreen = useCallback((id, x, y) => {
    setScreens((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x, y } : s))
    );
  }, []);

  const handleImageUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        addScreen(ev.target.result, file.name.replace(/\.[^.]+$/, ""));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [addScreen]);

  const handlePaste = useCallback((e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter((item) => item.type.startsWith("image/"));
    if (imageItems.length === 0) return;
    e.preventDefault();

    // Single image pasted with a blank screen selected -> assign to that screen
    const sel = selectedScreen ? screens.find((s) => s.id === selectedScreen) : null;
    if (imageItems.length === 1 && sel && !sel.imageData) {
      const file = imageItems[0].getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        assignScreenImage(sel.id, ev.target.result);
      };
      reader.readAsDataURL(file);
      return;
    }

    imageItems.forEach((item, index) => {
      const file = item.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const count = screenCounter.current;
        addScreenAtCenter(ev.target.result, `Pasted Screen ${count}`, index);
      };
      reader.readAsDataURL(file);
    });
  }, [addScreenAtCenter, selectedScreen, screens, assignScreenImage]);

  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        addScreen(ev.target.result, file.name.replace(/\.[^.]+$/, ""));
      };
      reader.readAsDataURL(file);
    });
  }, [addScreen]);

  const saveHotspot = useCallback((screenId, hotspot) => {
    pushHistory(screens, connections);
    setScreens((prev) =>
      prev.map((s) => {
        if (s.id !== screenId) return s;
        const existing = s.hotspots.findIndex((h) => h.id === hotspot.id);
        const newHotspots = existing >= 0
          ? s.hotspots.map((h) => (h.id === hotspot.id ? hotspot : h))
          : [...s.hotspots, hotspot];
        return { ...s, hotspots: newHotspots };
      })
    );

    if (hotspot.targetScreenId && (hotspot.action === "navigate" || hotspot.action === "modal")) {
      setConnections((prev) => {
        // Remove any api-success/api-error connections when switching away from api
        const cleaned = prev.filter(
          (c) => !(c.hotspotId === hotspot.id && (c.connectionPath === "api-success" || c.connectionPath === "api-error"))
        );
        const exists = cleaned.some(
          (c) => c.fromScreenId === screenId && c.toScreenId === hotspot.targetScreenId && c.hotspotId === hotspot.id
        );
        if (exists) {
          return cleaned.map((c) =>
            c.fromScreenId === screenId && c.hotspotId === hotspot.id
              ? { ...c, toScreenId: hotspot.targetScreenId, label: hotspot.label, connectionPath: "default" }
              : c
          );
        }
        return [
          ...cleaned,
          {
            id: generateId(),
            fromScreenId: screenId,
            toScreenId: hotspot.targetScreenId,
            hotspotId: hotspot.id,
            label: hotspot.label || "",
            action: hotspot.action,
            connectionPath: "default",
          },
        ];
      });
    }

    if (hotspot.action === "api") {
      setConnections((prev) => {
        // Remove stale api-success/api-error connections for this hotspot
        let updated = prev.filter(
          (c) => !(c.hotspotId === hotspot.id && (c.connectionPath === "api-success" || c.connectionPath === "api-error"))
        );
        // Also remove any default connections for this hotspot (switching from navigate/modal to api)
        updated = updated.filter(
          (c) => !(c.hotspotId === hotspot.id && (!c.connectionPath || c.connectionPath === "default"))
        );

        // Create api-success connection if needed
        if (hotspot.onSuccessTargetId && (hotspot.onSuccessAction === "navigate" || hotspot.onSuccessAction === "modal")) {
          updated.push({
            id: generateId(),
            fromScreenId: screenId,
            toScreenId: hotspot.onSuccessTargetId,
            hotspotId: hotspot.id,
            label: hotspot.label ? `${hotspot.label} (success)` : "success",
            action: hotspot.onSuccessAction,
            connectionPath: "api-success",
          });
        }

        // Create api-error connection if needed
        if (hotspot.onErrorTargetId && (hotspot.onErrorAction === "navigate" || hotspot.onErrorAction === "modal")) {
          updated.push({
            id: generateId(),
            fromScreenId: screenId,
            toScreenId: hotspot.onErrorTargetId,
            hotspotId: hotspot.id,
            label: hotspot.label ? `${hotspot.label} (error)` : "error",
            action: hotspot.onErrorAction,
            connectionPath: "api-error",
          });
        }

        return updated;
      });
    }

    if (hotspot.action !== "api" && hotspot.action !== "navigate" && hotspot.action !== "modal") {
      // For back/custom actions, clean up all connections for this hotspot
      setConnections((prev) =>
        prev.filter((c) => c.hotspotId !== hotspot.id)
      );
    }
  }, [screens, connections, pushHistory]);

  const deleteHotspot = useCallback((screenId, hotspotId) => {
    pushHistory(screens, connections);
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) } : s
      )
    );
    setConnections((prev) => prev.filter((c) => c.hotspotId !== hotspotId));
  }, [screens, connections, pushHistory]);

  const moveHotspot = useCallback((screenId, hotspotId, newX, newY) => {
    setScreens((prev) =>
      prev.map((s) => {
        if (s.id !== screenId) return s;
        return {
          ...s,
          hotspots: s.hotspots.map((h) =>
            h.id === hotspotId ? { ...h, x: newX, y: newY } : h
          ),
        };
      })
    );
  }, []);

  const resizeHotspot = useCallback((screenId, hotspotId, newX, newY, newW, newH) => {
    setScreens((prev) =>
      prev.map((s) => {
        if (s.id !== screenId) return s;
        return {
          ...s,
          hotspots: s.hotspots.map((h) =>
            h.id === hotspotId ? { ...h, x: newX, y: newY, w: newW, h: newH } : h
          ),
        };
      })
    );
  }, []);

  const updateScreenDimensions = useCallback((screenId, imageWidth, imageHeight) => {
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, imageWidth, imageHeight } : s
      )
    );
  }, []);

  const quickConnectHotspot = useCallback((screenId, hotspotId, targetScreenId) => {
    pushHistory(screens, connections);
    setScreens((prev) =>
      prev.map((s) => {
        if (s.id !== screenId) return s;
        return {
          ...s,
          hotspots: s.hotspots.map((h) =>
            h.id === hotspotId
              ? { ...h, action: "navigate", targetScreenId }
              : h
          ),
        };
      })
    );
    setConnections((prev) => {
      const filtered = prev.filter(
        (c) => !(c.fromScreenId === screenId && c.hotspotId === hotspotId)
      );
      return [
        ...filtered,
        {
          id: generateId(),
          fromScreenId: screenId,
          toScreenId: targetScreenId,
          hotspotId,
          label: "",
          action: "navigate",
        },
      ];
    });
  }, [screens, connections, pushHistory]);

  const updateConnection = useCallback((connectionId, patch) => {
    pushHistory(screens, connections);
    setConnections((prev) =>
      prev.map((c) => (c.id === connectionId ? { ...c, ...patch } : c))
    );
  }, [screens, connections, pushHistory]);

  const deleteConnection = useCallback((connectionId) => {
    pushHistory(screens, connections);
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, [screens, connections, pushHistory]);

  const addConnection = useCallback((fromScreenId, toScreenId) => {
    pushHistory(screens, connections);
    setConnections((prev) => {
      const exists = prev.some(
        (c) => c.fromScreenId === fromScreenId && c.toScreenId === toScreenId && !c.hotspotId
      );
      if (exists) return prev;
      return [...prev, {
        id: generateId(),
        fromScreenId,
        toScreenId,
        hotspotId: null,
        label: "",
        action: "navigate",
      }];
    });
  }, [screens, connections, pushHistory]);

  const addState = useCallback((parentScreenId) => {
    pushHistory(screens, connections);
    const parent = screens.find((s) => s.id === parentScreenId);
    if (!parent) return;

    const groupId = parent.stateGroup || generateId();
    const siblings = screens.filter((s) => s.stateGroup === groupId);
    const stateNumber = siblings.length + (parent.stateGroup ? 1 : 2);

    // If parent doesn't have a stateGroup yet, assign one
    if (!parent.stateGroup) {
      setScreens((prev) =>
        prev.map((s) =>
          s.id === parentScreenId
            ? { ...s, stateGroup: groupId, stateName: "Default" }
            : s
        )
      );
    }

    const count = screenCounter.current++;
    const newScreen = {
      id: generateId(),
      name: parent.name,
      x: parent.x + 250,
      y: parent.y,
      width: parent.width || 220,
      imageData: null,
      description: "",
      hotspots: [],
      stateGroup: groupId,
      stateName: `State ${stateNumber - 1}`,
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, pushHistory]);

  const updateStateName = useCallback((screenId, stateName) => {
    pushHistory(screens, connections);
    setScreens((prev) => prev.map((s) => (s.id === screenId ? { ...s, stateName } : s)));
  }, [screens, connections, pushHistory]);

  const replaceAll = useCallback((newScreens, newConnections, newScreenCounter) => {
    clearHistory();
    setScreens(newScreens);
    setConnections(newConnections);
    screenCounter.current = newScreenCounter;
    setSelectedScreen(null);
  }, [clearHistory]);

  const mergeAll = useCallback((newScreens, newConnections) => {
    clearHistory();
    setScreens((prev) => [...prev, ...newScreens]);
    setConnections((prev) => [...prev, ...newConnections]);
  }, [clearHistory]);

  return {
    screens,
    connections,
    selectedScreen,
    setSelectedScreen,
    fileInputRef,
    addScreen,
    addScreenAtCenter,
    removeScreen,
    renameScreen,
    moveScreen,
    handleImageUpload,
    onFileChange,
    handlePaste,
    handleCanvasDrop,
    saveHotspot,
    deleteHotspot,
    moveHotspot,
    resizeHotspot,
    updateScreenDimensions,
    updateScreenDescription,
    assignScreenImage,
    quickConnectHotspot,
    updateConnection,
    deleteConnection,
    addConnection,
    addState,
    updateStateName,
    replaceAll,
    mergeAll,
    canUndo,
    canRedo,
    undo,
    redo,
    captureDragSnapshot,
    commitDragSnapshot,
  };
}

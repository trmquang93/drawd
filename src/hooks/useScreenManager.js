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
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, pushHistory, pan, zoom, canvasRef]);

  const removeScreen = useCallback((id) => {
    pushHistory(screens, connections);
    setScreens((prev) => prev.filter((s) => s.id !== id));
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
  }, [addScreenAtCenter]);

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
        const exists = prev.some(
          (c) => c.fromScreenId === screenId && c.toScreenId === hotspot.targetScreenId && c.hotspotId === hotspot.id
        );
        if (exists) {
          return prev.map((c) =>
            c.fromScreenId === screenId && c.hotspotId === hotspot.id
              ? { ...c, toScreenId: hotspot.targetScreenId, label: hotspot.label }
              : c
          );
        }
        return [
          ...prev,
          {
            id: generateId(),
            fromScreenId: screenId,
            toScreenId: hotspot.targetScreenId,
            hotspotId: hotspot.id,
            label: hotspot.label || "",
            action: hotspot.action,
          },
        ];
      });
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
    quickConnectHotspot,
    updateConnection,
    deleteConnection,
    addConnection,
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

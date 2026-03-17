import { useState, useRef, useCallback } from "react";
import { generateId } from "../utils/generateId";
import {
  DEFAULT_SCREEN_WIDTH,
  CENTER_HEIGHT_ESTIMATE,
  GRID_COLUMNS,
  GRID_COL_WIDTH,
  GRID_ROW_HEIGHT,
  GRID_MARGIN,
  PASTE_STAGGER,
  STATE_VARIANT_OFFSET,
  HOTSPOT_PASTE_OFFSET,
  VIEWPORT_FALLBACK_WIDTH,
  VIEWPORT_FALLBACK_HEIGHT,
  DEFAULT_STATE_NAME,
  SCREEN_NAME_TEMPLATE,
} from "../constants";

export function useScreenManager(pan, zoom, canvasRef) {
  const [screens, setScreens] = useState([]);
  const [connections, setConnections] = useState([]);
  const [documents, setDocuments] = useState([]);
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

  const pushHistory = useCallback((prevScreens, prevConnections, prevDocuments) => {
    const snapshot = {
      screens: JSON.parse(JSON.stringify(prevScreens)),
      connections: JSON.parse(JSON.stringify(prevConnections)),
      documents: JSON.parse(JSON.stringify(prevDocuments)),
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
      documents: JSON.parse(JSON.stringify(documents)),
    };
  }, [screens, connections, documents]);

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
      documents: JSON.parse(JSON.stringify(documents)),
    };
    future.push(current);
    const snapshot = past.pop();
    setScreens(snapshot.screens);
    setConnections(snapshot.connections);
    setDocuments(snapshot.documents || []);
    syncHistoryFlags();
  }, [screens, connections, documents, syncHistoryFlags]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (future.length === 0) return;
    const current = {
      screens: JSON.parse(JSON.stringify(screens)),
      connections: JSON.parse(JSON.stringify(connections)),
      documents: JSON.parse(JSON.stringify(documents)),
    };
    past.push(current);
    const snapshot = future.pop();
    setScreens(snapshot.screens);
    setConnections(snapshot.connections);
    setDocuments(snapshot.documents || []);
    syncHistoryFlags();
  }, [screens, connections, documents, syncHistoryFlags]);

  const addScreen = useCallback((imageData = null, name = null) => {
    pushHistory(screens, connections, documents);
    const count = screenCounter.current++;
    const offsetX = (screens.length % GRID_COLUMNS) * GRID_COL_WIDTH + GRID_MARGIN;
    const offsetY = Math.floor(screens.length / GRID_COLUMNS) * GRID_ROW_HEIGHT + GRID_MARGIN;
    const newScreen = {
      id: generateId(),
      name: name || SCREEN_NAME_TEMPLATE(count),
      x: (-pan.x + offsetX) / zoom,
      y: (-pan.y + offsetY) / zoom,
      width: DEFAULT_SCREEN_WIDTH,
      imageData,
      description: "",
      notes: "",
      codeRef: "",
      status: "new",
      acceptanceCriteria: [],
      hotspots: [],
      stateGroup: null,
      stateName: "",
      tbd: false,
      tbdNote: "",
      roles: [],
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, documents, pushHistory, pan, zoom]);

  const addScreenAtCenter = useCallback((imageData = null, name = null, offset = 0) => {
    pushHistory(screens, connections, documents);
    const count = screenCounter.current++;
    const el = canvasRef?.current;
    const vw = el ? el.clientWidth : VIEWPORT_FALLBACK_WIDTH;
    const vh = el ? el.clientHeight : VIEWPORT_FALLBACK_HEIGHT;
    const cx = (-pan.x + vw / 2) / zoom - DEFAULT_SCREEN_WIDTH / 2 + offset * PASTE_STAGGER;
    const cy = (-pan.y + vh / 2) / zoom - CENTER_HEIGHT_ESTIMATE / 2 + offset * PASTE_STAGGER;
    const newScreen = {
      id: generateId(),
      name: name || SCREEN_NAME_TEMPLATE(count),
      x: cx,
      y: cy,
      width: DEFAULT_SCREEN_WIDTH,
      imageData,
      description: "",
      notes: "",
      codeRef: "",
      status: "new",
      acceptanceCriteria: [],
      hotspots: [],
      stateGroup: null,
      stateName: "",
      tbd: false,
      tbdNote: "",
      roles: [],
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, documents, pushHistory, pan, zoom, canvasRef]);

  const removeScreen = useCallback((id) => {
    pushHistory(screens, connections, documents);
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
  }, [selectedScreen, screens, connections, documents, pushHistory]);

  const renameScreen = useCallback((id, name) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }, [screens, connections, documents, pushHistory]);

  const updateScreenDescription = useCallback((id, description) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, description } : s)));
  }, [screens, connections, documents, pushHistory]);

  const updateScreenNotes = useCallback((id, notes) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, notes } : s)));
  }, [screens, connections, documents, pushHistory]);

  const updateScreenTbd = useCallback((id, tbd, tbdNote) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, tbd, tbdNote } : s)));
  }, [screens, connections, documents, pushHistory]);

  const updateScreenRoles = useCallback((id, roles) => {
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, roles } : s)));
  }, []);

  const updateScreenCodeRef = useCallback((id, codeRef) => {
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, codeRef } : s)));
  }, []);

  const updateScreenCriteria = useCallback((id, acceptanceCriteria) => {
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, acceptanceCriteria } : s)));
  }, []);

  const updateScreenStatus = useCallback((id, status) => {
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  }, []);

  const markAllExisting = useCallback(() => {
    setScreens((prev) => prev.map((s) => ({ ...s, status: "existing" })));
  }, []);

  const assignScreenImage = useCallback((id, imageData) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, imageData } : s)));
  }, [screens, connections, documents, pushHistory]);

  const moveScreen = useCallback((id, x, y) => {
    setScreens((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x, y } : s))
    );
  }, []);

  const moveScreens = useCallback((moves) => {
    const moveMap = new Map(moves.map((m) => [m.id, m]));
    setScreens((prev) =>
      prev.map((s) => {
        const move = moveMap.get(s.id);
        return move ? { ...s, x: move.x, y: move.y } : s;
      })
    );
  }, []);

  const removeScreens = useCallback((ids) => {
    pushHistory(screens, connections, documents);
    const idSet = new Set(ids);
    setScreens((prev) => {
      const removedScreens = prev.filter((s) => idSet.has(s.id));
      let remaining = prev.filter((s) => !idSet.has(s.id));
      const affectedGroups = new Set(
        removedScreens.map((s) => s.stateGroup).filter(Boolean)
      );
      affectedGroups.forEach((groupId) => {
        const siblings = remaining.filter((s) => s.stateGroup === groupId);
        if (siblings.length === 1) {
          remaining = remaining.map((s) =>
            s.stateGroup === groupId ? { ...s, stateGroup: null, stateName: "" } : s
          );
        }
      });
      return remaining;
    });
    setConnections((prev) =>
      prev.filter((c) => !idSet.has(c.fromScreenId) && !idSet.has(c.toScreenId))
    );
    if (idSet.has(selectedScreen)) setSelectedScreen(null);
  }, [selectedScreen, screens, connections, documents, pushHistory]);

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
    pushHistory(screens, connections, documents);
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
            transitionType: null,
            transitionLabel: "",
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
            transitionType: null,
            transitionLabel: "",
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
            transitionType: null,
            transitionLabel: "",
          });
        }

        return updated;
      });
    }

    if (hotspot.action === "conditional") {
      setConnections((prev) => {
        // Remove all existing connections for this hotspot
        let updated = prev.filter((c) => c.hotspotId !== hotspot.id);
        // Create one connection per condition branch with a target
        (hotspot.conditions || []).forEach((cond, i) => {
          if (cond.targetScreenId) {
            updated.push({
              id: generateId(),
              fromScreenId: screenId,
              toScreenId: cond.targetScreenId,
              hotspotId: hotspot.id,
              label: hotspot.label ? `${hotspot.label} (${cond.label || `branch ${i + 1}`})` : (cond.label || `branch ${i + 1}`),
              action: "navigate",
              connectionPath: `condition-${i}`,
              condition: cond.label || "",
              transitionType: null,
              transitionLabel: "",
            });
          }
        });
        return updated;
      });
    }

    if (hotspot.action !== "api" && hotspot.action !== "navigate" && hotspot.action !== "modal" && hotspot.action !== "conditional") {
      // For back/custom actions, clean up all connections for this hotspot
      setConnections((prev) =>
        prev.filter((c) => c.hotspotId !== hotspot.id)
      );
    }
  }, [screens, connections, documents, pushHistory]);

  const deleteHotspot = useCallback((screenId, hotspotId) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) } : s
      )
    );
    setConnections((prev) => prev.filter((c) => c.hotspotId !== hotspotId));
  }, [screens, connections, documents, pushHistory]);

  const deleteHotspots = useCallback((screenId, hotspotIds) => {
    pushHistory(screens, connections, documents);
    const idSet = new Set(hotspotIds);
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, hotspots: s.hotspots.filter((h) => !idSet.has(h.id)) } : s
      )
    );
    setConnections((prev) => prev.filter((c) => !idSet.has(c.hotspotId)));
  }, [screens, connections, documents, pushHistory]);

  const pasteHotspots = useCallback((screenId, hotspots) => {
    pushHistory(screens, connections, documents);
    const newHotspots = hotspots.map((hs) => ({
      ...hs,
      id: generateId(),
      targetScreenId: null,
      x: Math.min(hs.x + HOTSPOT_PASTE_OFFSET, 100 - hs.w),
      y: Math.min(hs.y + HOTSPOT_PASTE_OFFSET, 100 - hs.h),
    }));
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, hotspots: [...s.hotspots, ...newHotspots] } : s
      )
    );
  }, [screens, connections, documents, pushHistory]);

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

  const moveHotspotToScreen = useCallback((fromScreenId, hotspotId, toScreenId, newX, newY) => {
    setScreens((prev) => {
      const sourceScreen = prev.find((s) => s.id === fromScreenId);
      const hotspot = sourceScreen?.hotspots.find((h) => h.id === hotspotId);
      if (!hotspot) return prev;
      const movedHotspot = { ...hotspot, x: newX, y: newY };
      return prev.map((s) => {
        if (s.id === fromScreenId) {
          return { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) };
        }
        if (s.id === toScreenId) {
          return { ...s, hotspots: [...s.hotspots, movedHotspot] };
        }
        return s;
      });
    });
    setConnections((prev) =>
      prev.map((c) =>
        c.hotspotId === hotspotId && c.fromScreenId === fromScreenId
          ? { ...c, fromScreenId: toScreenId }
          : c
      )
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
    pushHistory(screens, connections, documents);
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
          transitionType: null,
          transitionLabel: "",
        },
      ];
    });
  }, [screens, connections, documents, pushHistory]);

  const updateConnection = useCallback((connectionId, patch) => {
    pushHistory(screens, connections, documents);
    setConnections((prev) =>
      prev.map((c) => (c.id === connectionId ? { ...c, ...patch } : c))
    );
  }, [screens, connections, documents, pushHistory]);

  const deleteConnection = useCallback((connectionId) => {
    pushHistory(screens, connections, documents);
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, [screens, connections, documents, pushHistory]);

  const saveConnectionGroup = useCallback((originalConnId, payload) => {
    pushHistory(screens, connections, documents);
    const { mode, label, targetId, fromScreenId, conditions, conditionGroupId } = payload;

    setConnections((prev) => {
      // Remove the original connection and any group members
      let cleaned;
      if (conditionGroupId) {
        cleaned = prev.filter((c) => c.conditionGroupId !== conditionGroupId);
      } else {
        cleaned = prev.filter((c) => c.id !== originalConnId);
      }

      if (mode === "navigate") {
        if (!targetId) return cleaned;
        return [...cleaned, {
          id: generateId(),
          fromScreenId,
          toScreenId: targetId,
          hotspotId: null,
          label: label || "",
          action: "navigate",
          connectionPath: "default",
          condition: "",
          conditionGroupId: null,
          transitionType: payload.transitionType || null,
          transitionLabel: payload.transitionLabel || "",
        }];
      }

      if (mode === "conditional") {
        const groupId = conditionGroupId || generateId();
        const newConns = (conditions || [])
          .filter((cond) => cond.targetScreenId)
          .map((cond, i) => ({
            id: generateId(),
            fromScreenId,
            toScreenId: cond.targetScreenId,
            hotspotId: null,
            label: cond.label || `branch ${i + 1}`,
            action: "navigate",
            connectionPath: `condition-${i}`,
            condition: cond.label || "",
            conditionGroupId: groupId,
            transitionType: payload.transitionType || null,
            transitionLabel: payload.transitionLabel || "",
          }));
        return [...cleaned, ...newConns];
      }

      return cleaned;
    });
  }, [screens, connections, documents, pushHistory]);

  const deleteConnectionGroup = useCallback((conditionGroupId) => {
    pushHistory(screens, connections, documents);
    setConnections((prev) => prev.filter((c) => c.conditionGroupId !== conditionGroupId));
  }, [screens, connections, documents, pushHistory]);

  const convertToConditionalGroup = useCallback((existingConnId, fromScreenId, toScreenId) => {
    pushHistory(screens, connections, documents);
    const groupId = generateId();
    setConnections((prev) => {
      const updated = prev.map((c) =>
        c.id === existingConnId
          ? { ...c, connectionPath: "condition-0", condition: "", conditionGroupId: groupId }
          : c
      );
      return [...updated, {
        id: generateId(),
        fromScreenId,
        toScreenId,
        hotspotId: null,
        label: "",
        action: "navigate",
        connectionPath: "condition-1",
        condition: "",
        conditionGroupId: groupId,
        transitionType: null,
        transitionLabel: "",
      }];
    });
    return groupId;
  }, [screens, connections, documents, pushHistory]);

  const addToConditionalGroup = useCallback((fromScreenId, toScreenId, conditionGroupId) => {
    pushHistory(screens, connections, documents);
    setConnections((prev) => {
      const groupConns = prev.filter((c) => c.conditionGroupId === conditionGroupId);
      const maxIndex = groupConns.reduce((max, c) => {
        const match = c.connectionPath?.match(/^condition-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, -1);
      return [...prev, {
        id: generateId(),
        fromScreenId,
        toScreenId,
        hotspotId: null,
        label: "",
        action: "navigate",
        connectionPath: `condition-${maxIndex + 1}`,
        condition: "",
        conditionGroupId,
        transitionType: null,
        transitionLabel: "",
      }];
    });
  }, [screens, connections, documents, pushHistory]);

  const addConnection = useCallback((fromScreenId, toScreenId) => {
    pushHistory(screens, connections, documents);
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
        transitionType: null,
        transitionLabel: "",
      }];
    });
  }, [screens, connections, documents, pushHistory]);

  const addState = useCallback((parentScreenId) => {
    pushHistory(screens, connections, documents);
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
            ? { ...s, stateGroup: groupId, stateName: DEFAULT_STATE_NAME }
            : s
        )
      );
    }

    screenCounter.current++;
    const newScreen = {
      id: generateId(),
      name: parent.name,
      x: parent.x + STATE_VARIANT_OFFSET,
      y: parent.y,
      width: parent.width || DEFAULT_SCREEN_WIDTH,
      imageData: null,
      description: "",
      notes: "",
      codeRef: "",
      status: "new",
      acceptanceCriteria: [],
      hotspots: [],
      stateGroup: groupId,
      stateName: `State ${stateNumber - 1}`,
      tbd: false,
      tbdNote: "",
      roles: [],
    };
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, documents, pushHistory]);

  const updateStateName = useCallback((screenId, stateName) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === screenId ? { ...s, stateName } : s)));
  }, [screens, connections, documents, pushHistory]);

  const addDocument = useCallback((name, content) => {
    pushHistory(screens, connections, documents);
    const id = generateId();
    const doc = { id, name, content, createdAt: new Date().toISOString() };
    setDocuments((prev) => [...prev, doc]);
    return id;
  }, [screens, connections, documents, pushHistory]);

  const updateDocument = useCallback((docId, patch) => {
    pushHistory(screens, connections, documents);
    setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, ...patch } : d)));
  }, [screens, connections, documents, pushHistory]);

  const deleteDocument = useCallback((docId) => {
    pushHistory(screens, connections, documents);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    // Clear documentId from any hotspots referencing this document
    setScreens((prev) =>
      prev.map((s) => ({
        ...s,
        hotspots: s.hotspots.map((h) =>
          h.documentId === docId ? { ...h, documentId: null } : h
        ),
      }))
    );
  }, [screens, connections, documents, pushHistory]);

  const replaceAll = useCallback((newScreens, newConnections, newScreenCounter, newDocuments = []) => {
    clearHistory();
    setScreens(newScreens);
    setConnections(newConnections);
    setDocuments(newDocuments);
    screenCounter.current = newScreenCounter;
    setSelectedScreen(null);
  }, [clearHistory]);

  const mergeAll = useCallback((newScreens, newConnections, newDocuments = []) => {
    clearHistory();
    setScreens((prev) => [...prev, ...newScreens]);
    setConnections((prev) => [...prev, ...newConnections]);
    setDocuments((prev) => [...prev, ...newDocuments]);
  }, [clearHistory]);

  return {
    screens,
    connections,
    documents,
    selectedScreen,
    setSelectedScreen,
    fileInputRef,
    addScreen,
    addScreenAtCenter,
    removeScreen,
    removeScreens,
    renameScreen,
    moveScreen,
    moveScreens,
    handleImageUpload,
    onFileChange,
    handlePaste,
    handleCanvasDrop,
    saveHotspot,
    deleteHotspot,
    deleteHotspots,
    pasteHotspots,
    moveHotspot,
    moveHotspotToScreen,
    resizeHotspot,
    updateScreenDimensions,
    updateScreenDescription,
    updateScreenNotes,
    updateScreenTbd,
    updateScreenRoles,
    updateScreenCodeRef,
    updateScreenCriteria,
    updateScreenStatus,
    markAllExisting,
    assignScreenImage,
    quickConnectHotspot,
    updateConnection,
    deleteConnection,
    addConnection,
    convertToConditionalGroup,
    addToConditionalGroup,
    saveConnectionGroup,
    deleteConnectionGroup,
    addState,
    updateStateName,
    addDocument,
    updateDocument,
    deleteDocument,
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

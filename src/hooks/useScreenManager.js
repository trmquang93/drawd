import { useState, useRef, useCallback, useEffect } from "react";
import { generateId } from "../utils/generateId";
import { screenBounds } from "../utils/canvasMath";
import { filenameToScreenName, gridPositions, resolveOverlaps } from "../utils/dropImport";
import {
  DEFAULT_SCREEN_WIDTH,
  CENTER_HEIGHT_ESTIMATE,
  GRID_COLUMNS,
  GRID_COL_WIDTH,
  GRID_ROW_HEIGHT,
  GRID_MARGIN,
  PASTE_STAGGER,
  STATE_VARIANT_OFFSET,
  DUPLICATE_OFFSET,
  HOTSPOT_PASTE_OFFSET,
  VIEWPORT_FALLBACK_WIDTH,
  VIEWPORT_FALLBACK_HEIGHT,
  DEFAULT_STATE_NAME,
  SCREEN_NAME_TEMPLATE,
  HEADER_HEIGHT,
} from "../constants";

function makeScreen(overrides = {}) {
  return {
    id: generateId(),
    name: "",
    x: 0,
    y: 0,
    width: DEFAULT_SCREEN_WIDTH,
    imageData: null,
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
    figmaSource: null,
    svgContent: null,
    sourceHtml: null,
    sourceWidth: null,
    sourceHeight: null,
    wireframe: null,
    ...overrides,
  };
}

export function useScreenManager(pan, zoom, canvasRef, commentCallbacks = {}) {
  // Keep comment cleanup callbacks in a ref so they never invalidate memoized callbacks.
  const commentCallbacksRef = useRef(commentCallbacks);
  useEffect(() => { commentCallbacksRef.current = commentCallbacks; });
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
    const newScreen = makeScreen({
      name: name || SCREEN_NAME_TEMPLATE(count),
      x: (-pan.x + offsetX) / zoom,
      y: (-pan.y + offsetY) / zoom,
      imageData,
    });
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, documents, pushHistory, pan, zoom]);

  const addScreenAtCenter = useCallback((imageData = null, name = null, offset = 0, meta = {}) => {
    pushHistory(screens, connections, documents);
    const count = screenCounter.current++;
    const el = canvasRef?.current;
    const vw = el ? el.clientWidth : VIEWPORT_FALLBACK_WIDTH;
    const vh = el ? el.clientHeight : VIEWPORT_FALLBACK_HEIGHT;
    const cx = (-pan.x + vw / 2) / zoom - DEFAULT_SCREEN_WIDTH / 2 + offset * PASTE_STAGGER;
    const cy = (-pan.y + vh / 2) / zoom - CENTER_HEIGHT_ESTIMATE / 2 + offset * PASTE_STAGGER;
    const newScreen = makeScreen({
      name: name || SCREEN_NAME_TEMPLATE(count),
      x: cx,
      y: cy,
      imageData,
      ...meta,
    });
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, documents, pushHistory, pan, zoom, canvasRef]);

  const addScreensBatch = useCallback((screenDefs) => {
    if (screenDefs.length === 0) return 0;
    pushHistory(screens, connections, documents);
    const newScreens = screenDefs.map((def) => makeScreen({
      name: def.name,
      x: def.x,
      y: def.y,
      imageData: def.imageData,
    }));
    setScreens((prev) => [...prev, ...newScreens]);
    setSelectedScreen(newScreens[0].id);
    screenCounter.current += newScreens.length;
    return newScreens.length;
  }, [screens, connections, documents, pushHistory]);

  const removeScreen = useCallback((id) => {
    commentCallbacksRef.current.onDeleteCommentsForScreen?.(id);
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

  // Lightweight image patch for collab sync (no undo, no dimension clear)
  const patchScreenImage = useCallback((id, imageData) => {
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, imageData } : s)));
  }, []);

  const assignScreenImage = useCallback((id, imageData) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, imageData, imageWidth: undefined, imageHeight: undefined } : s)));
  }, [screens, connections, documents, pushHistory]);

  const updateWireframe = useCallback((id, wireframe, imageData) => {
    pushHistory(screens, connections, documents);
    setScreens((prev) => prev.map((s) => (s.id === id ? { ...s, wireframe, imageData, imageWidth: undefined, imageHeight: undefined } : s)));
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
    commentCallbacksRef.current.onDeleteCommentsForScreens?.(ids);
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
    if (imageItems.length === 1 && sel) {
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

  const handleCanvasDrop = useCallback((files, worldX, worldY) => {
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const dataUrl = ev.target.result;
              const img = new Image();
              img.onload = () => {
                const renderedHeight = (img.naturalHeight / img.naturalWidth) * DEFAULT_SCREEN_WIDTH;
                resolve({
                  imageData: dataUrl,
                  filename: file.name,
                  imageHeight: renderedHeight,
                });
              };
              img.onerror = () => {
                resolve({ imageData: dataUrl, filename: file.name, imageHeight: 120 });
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(file);
          })
      )
    ).then((results) => {
      const itemHeights = results.map((r) => r.imageHeight + HEADER_HEIGHT);
      const positions = gridPositions(itemHeights, worldX, worldY);
      const candidateRects = positions.map((pos, i) => ({
        x: pos.x,
        y: pos.y,
        width: DEFAULT_SCREEN_WIDTH,
        height: itemHeights[i],
      }));
      const existingRects = screens.map((s) => screenBounds(s, HEADER_HEIGHT));
      const adjusted = resolveOverlaps(candidateRects, existingRects);

      const screenDefs = results.map((r, i) => ({
        imageData: r.imageData,
        name: filenameToScreenName(r.filename),
        x: adjusted[i].x,
        y: adjusted[i].y,
      }));

      addScreensBatch(screenDefs);
    });
  }, [screens, addScreensBatch]);

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
              ? { ...c, toScreenId: hotspot.targetScreenId, label: hotspot.label, connectionPath: "default", dataFlow: hotspot.dataFlow || [] }
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
            dataFlow: hotspot.dataFlow || [],
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
            dataFlow: hotspot.onSuccessDataFlow || [],
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
            dataFlow: hotspot.onErrorDataFlow || [],
          });
        }

        return updated;
      });
    }

    if (hotspot.action === "conditional") {
      setConnections((prev) => {
        let updated = prev.filter((c) => c.hotspotId !== hotspot.id);
        (hotspot.conditions || []).forEach((cond, i) => {
          const branchAction = cond.action || "navigate";

          // Main branch connection (for navigate/modal with target)
          if ((branchAction === "navigate" || branchAction === "modal") && cond.targetScreenId) {
            updated.push({
              id: generateId(),
              fromScreenId: screenId,
              toScreenId: cond.targetScreenId,
              hotspotId: hotspot.id,
              label: hotspot.label
                ? `${hotspot.label} (${cond.label || `branch ${i + 1}`})`
                : (cond.label || `branch ${i + 1}`),
              action: branchAction,
              connectionPath: `condition-${i}`,
              condition: cond.label || "",
              transitionType: null,
              transitionLabel: "",
              dataFlow: cond.dataFlow || [],
            });
          }

          // API follow-up connections
          if (branchAction === "api") {
            const successAction = cond.onSuccessAction || "";
            if ((successAction === "navigate" || successAction === "modal") && cond.onSuccessTargetId) {
              updated.push({
                id: generateId(),
                fromScreenId: screenId,
                toScreenId: cond.onSuccessTargetId,
                hotspotId: hotspot.id,
                label: `${cond.label || `branch ${i + 1}`} (success)`,
                action: successAction,
                connectionPath: `condition-${i}-api-success`,
                condition: cond.label || "",
                transitionType: null,
                transitionLabel: "",
                dataFlow: cond.onSuccessDataFlow || [],
              });
            }
            const errorAction = cond.onErrorAction || "";
            if ((errorAction === "navigate" || errorAction === "modal") && cond.onErrorTargetId) {
              updated.push({
                id: generateId(),
                fromScreenId: screenId,
                toScreenId: cond.onErrorTargetId,
                hotspotId: hotspot.id,
                label: `${cond.label || `branch ${i + 1}`} (error)`,
                action: errorAction,
                connectionPath: `condition-${i}-api-error`,
                condition: cond.label || "",
                transitionType: null,
                transitionLabel: "",
                dataFlow: cond.onErrorDataFlow || [],
              });
            }
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
    commentCallbacksRef.current.onDeleteCommentsForHotspot?.(hotspotId);
    pushHistory(screens, connections, documents);
    setScreens((prev) =>
      prev.map((s) =>
        s.id === screenId ? { ...s, hotspots: s.hotspots.filter((h) => h.id !== hotspotId) } : s
      )
    );
    setConnections((prev) => prev.filter((c) => c.hotspotId !== hotspotId));
  }, [screens, connections, documents, pushHistory]);

  const deleteHotspots = useCallback((screenId, hotspotIds) => {
    commentCallbacksRef.current.onDeleteCommentsForHotspots?.(hotspotIds);
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
          dataFlow: [],
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
    commentCallbacksRef.current.onDeleteCommentsForConnection?.(connectionId);
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
          dataFlow: payload.dataFlow || [],
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
            dataFlow: cond.dataFlow || [],
          }));
        return [...cleaned, ...newConns];
      }

      return cleaned;
    });
  }, [screens, connections, documents, pushHistory]);

  const deleteConnectionGroup = useCallback((conditionGroupId) => {
    const groupConnIds = connections
      .filter((c) => c.conditionGroupId === conditionGroupId)
      .map((c) => c.id);
    if (groupConnIds.length > 0) commentCallbacksRef.current.onDeleteCommentsForConnections?.(groupConnIds);
    pushHistory(screens, connections, documents);
    setConnections((prev) => prev.filter((c) => c.conditionGroupId !== conditionGroupId));
  }, [screens, connections, documents, pushHistory]);

  const convertToConditionalGroup = useCallback((existingConnId, fromScreenId, toScreenId, hotspotId = null) => {
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
        hotspotId,
        label: "",
        action: "navigate",
        connectionPath: "condition-1",
        condition: "",
        conditionGroupId: groupId,
        transitionType: null,
        transitionLabel: "",
        dataFlow: [],
      }];
    });
    return groupId;
  }, [screens, connections, documents, pushHistory]);

  const addToConditionalGroup = useCallback((fromScreenId, toScreenId, conditionGroupId, hotspotId = null) => {
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
        hotspotId,
        label: "",
        action: "navigate",
        connectionPath: `condition-${maxIndex + 1}`,
        condition: "",
        conditionGroupId,
        transitionType: null,
        transitionLabel: "",
        dataFlow: [],
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
        dataFlow: [],
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
    const newScreen = makeScreen({
      name: parent.name,
      x: parent.x + STATE_VARIANT_OFFSET,
      y: parent.y,
      width: parent.width || DEFAULT_SCREEN_WIDTH,
      stateGroup: groupId,
      stateName: `State ${stateNumber - 1}`,
    });
    setScreens((prev) => [...prev, newScreen]);
    setSelectedScreen(newScreen.id);
  }, [screens, connections, documents, pushHistory]);

  const linkAsState = useCallback((screenId, parentScreenId) => {
    pushHistory(screens, connections, documents);
    const parent = screens.find((s) => s.id === parentScreenId);
    const target = screens.find((s) => s.id === screenId);
    if (!parent || !target) return;
    if (screenId === parentScreenId) return;
    if (parent.stateGroup && parent.stateGroup === target.stateGroup) return;

    const groupId = parent.stateGroup || generateId();
    const siblings = screens.filter((s) => s.stateGroup === groupId);
    const stateNumber = siblings.length + (parent.stateGroup ? 1 : 2);

    setScreens((prev) =>
      prev.map((s) => {
        if (s.id === parentScreenId && !s.stateGroup) {
          return { ...s, stateGroup: groupId, stateName: DEFAULT_STATE_NAME };
        }
        if (s.id === screenId) {
          return { ...s, stateGroup: groupId, stateName: s.stateName || `State ${stateNumber - 1}` };
        }
        return s;
      })
    );
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

  const replaceAll = useCallback((newScreens, newConnections, newScreenCounter, newDocuments = [], { preserveHistory = false } = {}) => {
    if (!preserveHistory) clearHistory();
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

  const duplicateSelection = useCallback((selectedScreenIds) => {
    if (!selectedScreenIds || selectedScreenIds.length === 0) return [];

    pushHistory(screens, connections, documents);

    const selectionSet = new Set(selectedScreenIds);

    // Build screen ID remap table
    const screenIdMap = new Map();
    selectedScreenIds.forEach((id) => screenIdMap.set(id, generateId()));

    // Build hotspot ID remap table
    const hotspotIdMap = new Map();
    screens.forEach((s) => {
      if (!selectionSet.has(s.id)) return;
      s.hotspots.forEach((h) => hotspotIdMap.set(h.id, generateId()));
    });

    // Build stateGroup remap table — only remap groups where ALL members are selected
    const stateGroupMembers = new Map(); // stateGroup -> Set of screen IDs
    screens.forEach((s) => {
      if (!s.stateGroup) return;
      if (!stateGroupMembers.has(s.stateGroup)) stateGroupMembers.set(s.stateGroup, new Set());
      stateGroupMembers.get(s.stateGroup).add(s.id);
    });
    const stateGroupMap = new Map();
    stateGroupMembers.forEach((members, groupId) => {
      const allSelected = [...members].every((id) => selectionSet.has(id));
      if (allSelected) stateGroupMap.set(groupId, generateId());
    });

    // Build conditionGroupId remap table from connections being duplicated
    const conditionGroupMap = new Map();
    connections.forEach((c) => {
      if (!c.conditionGroupId) return;
      if (!selectionSet.has(c.fromScreenId) || !selectionSet.has(c.toScreenId)) return;
      if (!conditionGroupMap.has(c.conditionGroupId)) {
        conditionGroupMap.set(c.conditionGroupId, generateId());
      }
    });

    // Helper to remap a target screen ID (only if it's in the selection)
    const remapTarget = (id) => (id && screenIdMap.has(id) ? screenIdMap.get(id) : id);

    // Clone screens
    const clonedScreens = screens
      .filter((s) => selectionSet.has(s.id))
      .map((s) => {
        const clonedHotspots = s.hotspots.map((h) => {
          const cloned = { ...h, id: hotspotIdMap.get(h.id) ?? generateId() };
          if (cloned.targetScreenId) cloned.targetScreenId = remapTarget(cloned.targetScreenId);
          if (cloned.onSuccessTargetId) cloned.onSuccessTargetId = remapTarget(cloned.onSuccessTargetId);
          if (cloned.onErrorTargetId) cloned.onErrorTargetId = remapTarget(cloned.onErrorTargetId);
          if (Array.isArray(cloned.conditions)) {
            cloned.conditions = cloned.conditions.map((cond) =>
              cond.targetScreenId
                ? { ...cond, targetScreenId: remapTarget(cond.targetScreenId) }
                : cond
            );
          }
          return cloned;
        });

        return {
          ...s,
          id: screenIdMap.get(s.id),
          name: s.name ? `${s.name} (copy)` : s.name,
          x: s.x + DUPLICATE_OFFSET,
          stateGroup: s.stateGroup && stateGroupMap.has(s.stateGroup)
            ? stateGroupMap.get(s.stateGroup)
            : null,
          stateName: s.stateGroup && stateGroupMap.has(s.stateGroup) ? s.stateName : "",
          hotspots: clonedHotspots,
        };
      });

    // Clone connections where both endpoints are in the selection
    const clonedConnections = connections
      .filter((c) => selectionSet.has(c.fromScreenId) && selectionSet.has(c.toScreenId))
      .map((c) => ({
        ...c,
        id: generateId(),
        fromScreenId: screenIdMap.get(c.fromScreenId),
        toScreenId: screenIdMap.get(c.toScreenId),
        hotspotId: c.hotspotId && hotspotIdMap.has(c.hotspotId)
          ? hotspotIdMap.get(c.hotspotId)
          : c.hotspotId,
        conditionGroupId: c.conditionGroupId && conditionGroupMap.has(c.conditionGroupId)
          ? conditionGroupMap.get(c.conditionGroupId)
          : c.conditionGroupId,
      }));

    setScreens((prev) => [...prev, ...clonedScreens]);
    setConnections((prev) => [...prev, ...clonedConnections]);

    return clonedScreens.map((s) => s.id);
  }, [screens, connections, documents, pushHistory]);

  return {
    screens,
    connections,
    documents,
    selectedScreen,
    setSelectedScreen,
    fileInputRef,
    addScreen,
    addScreenAtCenter,
    addScreensBatch,
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
    patchScreenImage,
    updateWireframe,
    quickConnectHotspot,
    updateConnection,
    deleteConnection,
    addConnection,
    convertToConditionalGroup,
    addToConditionalGroup,
    saveConnectionGroup,
    deleteConnectionGroup,
    addState,
    linkAsState,
    updateStateName,
    addDocument,
    updateDocument,
    deleteDocument,
    replaceAll,
    mergeAll,
    duplicateSelection,
    pushHistory,
    canUndo,
    canRedo,
    undo,
    redo,
    captureDragSnapshot,
    commitDragSnapshot,
  };
}

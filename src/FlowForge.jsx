import { useState, useRef, useCallback, useEffect } from "react";
import { COLORS, FONTS, FONT_LINK } from "./styles/theme";
import { generateInstructionFiles } from "./utils/generateInstructionFiles";
import { exportFlow } from "./utils/exportFlow";
import { importFlow } from "./utils/importFlow";
import { mergeFlow } from "./utils/mergeFlow";
import { useCanvas } from "./hooks/useCanvas";
import { useScreenManager } from "./hooks/useScreenManager";
import { useFilePersistence } from "./hooks/useFilePersistence";
import { ScreenNode } from "./components/ScreenNode";
import { ConnectionLines } from "./components/ConnectionLines";
import { HotspotModal } from "./components/HotspotModal";
import { InstructionsPanel } from "./components/InstructionsPanel";
import { DocumentsPanel } from "./components/DocumentsPanel";
import { RenameModal } from "./components/RenameModal";
import { ImportConfirmModal } from "./components/ImportConfirmModal";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { EmptyState } from "./components/EmptyState";

const HEADER_HEIGHT = 37;

export default function FlowForge() {
  const { pan, setPan, zoom, setZoom, isPanning, dragging, canvasRef, isSpaceHeld, spaceHeld, handleDragStart, handleMouseMove, handleMouseUp, handleCanvasMouseDown } = useCanvas();
  const {
    screens, connections, documents, selectedScreen, setSelectedScreen,
    fileInputRef, addScreen, addScreenAtCenter, removeScreen, renameScreen, moveScreen,
    handleImageUpload, onFileChange, handlePaste, handleCanvasDrop,
    saveHotspot, deleteHotspot, moveHotspot, resizeHotspot, updateScreenDimensions,
    updateScreenDescription, assignScreenImage, quickConnectHotspot, updateConnection, deleteConnection,
    addConnection, addState, updateStateName, addDocument, updateDocument, deleteDocument,
    replaceAll, mergeAll,
    canUndo, canRedo, undo, redo, captureDragSnapshot, commitDragSnapshot,
  } = useScreenManager(pan, zoom, canvasRef);

  const {
    connectedFileName, saveStatus, isFileSystemSupported,
    openFile, saveAs, saveNow, disconnect,
  } = useFilePersistence(screens, connections, pan, zoom, documents);

  const onOpen = useCallback(async () => {
    try {
      const payload = await openFile();
      if (!payload) return;
      replaceAll(payload.screens, payload.connections, payload.screens.length + 1, payload.documents || []);
      if (payload.viewport) {
        setPan(payload.viewport.pan);
        setZoom(payload.viewport.zoom);
      }
    } catch (err) {
      alert(err.message);
    }
  }, [openFile, replaceAll, setPan, setZoom]);

  const onSaveAs = useCallback(async () => {
    try {
      await saveAs();
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  }, [saveAs]);

  const onNew = useCallback(() => {
    if (screens.length > 0) {
      if (!window.confirm("You have unsaved changes. Start a new flow?")) return;
    }
    replaceAll([], [], 1, []);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    disconnect();
  }, [screens.length, replaceAll, setPan, setZoom, disconnect]);

  const [hotspotModal, setHotspotModal] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [importConfirm, setImportConfirm] = useState(null);
  const importFileRef = useRef(null);

  // Drag-to-connect state (right dot)
  const [connecting, setConnecting] = useState(null);
  const [hoverTarget, setHoverTarget] = useState(null);

  // Hotspot interaction state
  const [hotspotInteraction, setHotspotInteraction] = useState(null);

  // Selected connection state
  const [selectedConnection, setSelectedConnection] = useState(null);

  const cancelConnecting = useCallback(() => {
    setConnecting(null);
    setHoverTarget(null);
  }, []);

  const cancelHotspotInteraction = useCallback(() => {
    setHotspotInteraction(null);
    setHoverTarget(null);
  }, []);

  const onDotDragStart = useCallback((e, screenId) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    setConnecting({ fromScreenId: screenId, mode: "drag", mouseX, mouseY });
  }, [canvasRef, pan, zoom]);

  const onStartConnect = useCallback((screenId) => {
    const screen = screens.find((s) => s.id === screenId);
    if (!screen) return;
    const mouseX = screen.x + (screen.width || 220) + 40;
    const mouseY = screen.y + 100;
    setConnecting({ fromScreenId: screenId, mode: "click", mouseX, mouseY });
  }, [screens]);

  const onConnectComplete = useCallback((targetScreenId) => {
    // Handle hotspot-drag connect
    if (hotspotInteraction?.mode === "hotspot-drag") {
      if (targetScreenId !== hotspotInteraction.screenId) {
        quickConnectHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, targetScreenId);
      }
      setHotspotInteraction({
        mode: "selected",
        screenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
      });
      setHoverTarget(null);
      return;
    }

    if (!connecting) return;
    if (targetScreenId === connecting.fromScreenId) {
      cancelConnecting();
      return;
    }
    addConnection(connecting.fromScreenId, targetScreenId);
    cancelConnecting();
  }, [connecting, cancelConnecting, hotspotInteraction, quickConnectHotspot, addConnection]);

  // Hotspot mouse down: select or begin reposition
  const onHotspotMouseDown = useCallback((e, screenId, hotspotId) => {
    e.preventDefault();
    if (hotspotInteraction?.mode === "selected" && hotspotInteraction.hotspotId === hotspotId) {
      // Same hotspot selected again -> begin reposition
      const rect = canvasRef.current.getBoundingClientRect();
      const screen = screens.find((s) => s.id === screenId);
      const hs = screen?.hotspots.find((h) => h.id === hotspotId);
      if (!screen || !hs) return;
      captureDragSnapshot();
      setHotspotInteraction({
        mode: "reposition",
        screenId,
        hotspotId,
        offsetPct: { dx: 0, dy: 0 },
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: hs.x,
        startY: hs.y,
      });
    } else {
      // Select this hotspot
      setHotspotInteraction({ mode: "selected", screenId, hotspotId });
    }
  }, [hotspotInteraction, canvasRef, screens, captureDragSnapshot]);

  // Image area mouse down: begin draw
  const onImageAreaMouseDown = useCallback((e, screenId) => {
    if (hotspotInteraction?.mode === "selected") {
      // Clicking image area deselects hotspot
      setHotspotInteraction(null);
      return;
    }
    if (connecting) return;
    e.stopPropagation();
    e.preventDefault();

    const screen = screens.find((s) => s.id === screenId);
    if (!screen?.imageData || !screen.imageHeight) return;

    const imageAreaRect = e.currentTarget.getBoundingClientRect();
    setHotspotInteraction({
      mode: "draw",
      screenId,
      drawStart: { clientX: e.clientX, clientY: e.clientY },
      imageAreaRect,
      drawRect: null,
    });
  }, [hotspotInteraction, connecting, screens]);

  // Resize handle mouse down
  const onResizeHandleMouseDown = useCallback((e, screenId, hotspotId, handle) => {
    e.preventDefault();
    const screen = screens.find((s) => s.id === screenId);
    const hs = screen?.hotspots.find((h) => h.id === hotspotId);
    if (!screen || !hs) return;
    captureDragSnapshot();
    setHotspotInteraction({
      mode: "resize",
      screenId,
      hotspotId,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: { x: hs.x, y: hs.y, w: hs.w, h: hs.h },
    });
  }, [screens, captureDragSnapshot]);

  // Hotspot drag handle mouse down
  const onHotspotDragHandleMouseDown = useCallback((e, screenId, hotspotId) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    setHotspotInteraction({
      mode: "hotspot-drag",
      screenId,
      hotspotId,
      mouseX,
      mouseY,
    });
  }, [canvasRef, pan, zoom]);

  const onScreenDimensions = useCallback((screenId, imageWidth, imageHeight) => {
    updateScreenDimensions(screenId, imageWidth, imageHeight);
  }, [updateScreenDimensions]);

  const handleDropImage = useCallback((screenId, file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      assignScreenImage(screenId, ev.target.result);
    };
    reader.readAsDataURL(file);
  }, [assignScreenImage]);

  // Connection line interaction callbacks
  const onConnectionClick = useCallback((connId) => {
    setSelectedConnection(connId);
    setHotspotInteraction(null);
  }, []);

  const onConnectionDoubleClick = useCallback((connId) => {
    const conn = connections.find((c) => c.id === connId);
    if (!conn) return;
    const screen = screens.find((s) => s.id === conn.fromScreenId);
    if (!screen) return;
    const hotspot = conn.hotspotId
      ? screen.hotspots.find((h) => h.id === conn.hotspotId)
      : null;
    if (hotspot) {
      setHotspotModal({ screen, hotspot });
    }
  }, [connections, screens]);

  const onEndpointMouseDown = useCallback((e, connId, endpoint) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    setHotspotInteraction({
      mode: "conn-endpoint-drag",
      connectionId: connId,
      endpoint,
      mouseX,
      mouseY,
    });
  }, [canvasRef, pan, zoom]);

  const onCanvasMouseDown = useCallback((e) => {
    // Space+click: always pan, skip all interaction guards
    if (isSpaceHeld.current) {
      if (selectedConnection) setSelectedConnection(null);
      if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
        setHotspotInteraction(null);
      }
      handleCanvasMouseDown(e);
      return;
    }
    // Clear selected connection on canvas click
    if (selectedConnection) setSelectedConnection(null);
    // Cancel hotspot interaction on canvas click
    if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
      setHotspotInteraction(null);
    }
    if (connecting) {
      if (connecting.mode === "click") {
        cancelConnecting();
      }
      return;
    }
    if (hotspotInteraction?.mode === "draw" || hotspotInteraction?.mode === "reposition" || hotspotInteraction?.mode === "hotspot-drag" || hotspotInteraction?.mode === "resize" || hotspotInteraction?.mode === "conn-endpoint-drag") {
      return;
    }
    const wasPan = handleCanvasMouseDown(e);
    if (wasPan) setSelectedScreen(null);
  }, [handleCanvasMouseDown, setSelectedScreen, connecting, cancelConnecting, hotspotInteraction, selectedConnection, isSpaceHeld]);

  const onCanvasMouseMove = useCallback((e) => {
    // Handle hotspot interactions
    if (hotspotInteraction?.mode === "draw") {
      const { imageAreaRect } = hotspotInteraction;
      if (!imageAreaRect) return;

      const startPctX = ((hotspotInteraction.drawStart.clientX - imageAreaRect.left) / imageAreaRect.width) * 100;
      const startPctY = ((hotspotInteraction.drawStart.clientY - imageAreaRect.top) / imageAreaRect.height) * 100;
      const curPctX = ((e.clientX - imageAreaRect.left) / imageAreaRect.width) * 100;
      const curPctY = ((e.clientY - imageAreaRect.top) / imageAreaRect.height) * 100;

      const x = Math.max(0, Math.min(100, Math.min(startPctX, curPctX)));
      const y = Math.max(0, Math.min(100, Math.min(startPctY, curPctY)));
      const x2 = Math.max(0, Math.min(100, Math.max(startPctX, curPctX)));
      const y2 = Math.max(0, Math.min(100, Math.max(startPctY, curPctY)));

      setHotspotInteraction((prev) => ({
        ...prev,
        drawRect: {
          screenId: hotspotInteraction.screenId,
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          w: Math.round((x2 - x) * 10) / 10,
          h: Math.round((y2 - y) * 10) / 10,
        },
      }));
      return;
    }

    if (hotspotInteraction?.mode === "reposition") {
      const screen = screens.find((s) => s.id === hotspotInteraction.screenId);
      if (!screen || !screen.imageHeight) return;
      const screenW = screen.width || 220;
      const hs = screen.hotspots.find((h) => h.id === hotspotInteraction.hotspotId);
      if (!hs) return;

      const dxPx = (e.clientX - hotspotInteraction.startClientX) / zoom;
      const dyPx = (e.clientY - hotspotInteraction.startClientY) / zoom;
      const dxPct = (dxPx / screenW) * 100;
      const dyPct = (dyPx / screen.imageHeight) * 100;

      let newX = hotspotInteraction.startX + dxPct;
      let newY = hotspotInteraction.startY + dyPct;
      newX = Math.max(0, Math.min(100 - hs.w, newX));
      newY = Math.max(0, Math.min(100 - hs.h, newY));

      moveHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, Math.round(newX * 10) / 10, Math.round(newY * 10) / 10);
      return;
    }

    if (hotspotInteraction?.mode === "resize") {
      const screen = screens.find((s) => s.id === hotspotInteraction.screenId);
      if (!screen || !screen.imageHeight) return;
      const screenW = screen.width || 220;
      const { handle, startClientX, startClientY, startRect } = hotspotInteraction;

      const dxPct = ((e.clientX - startClientX) / zoom / screenW) * 100;
      const dyPct = ((e.clientY - startClientY) / zoom / screen.imageHeight) * 100;

      let { x, y, w, h } = startRect;
      const MIN = 2;

      if (handle.includes("e")) {
        w = Math.max(MIN, Math.min(100 - x, startRect.w + dxPct));
      }
      if (handle.includes("w")) {
        const dx = Math.min(dxPct, startRect.w - MIN);
        const clampedDx = Math.max(-startRect.x, dx);
        x = startRect.x + clampedDx;
        w = startRect.w - clampedDx;
      }
      if (handle.includes("s")) {
        h = Math.max(MIN, Math.min(100 - y, startRect.h + dyPct));
      }
      if (handle.includes("n")) {
        const dy = Math.min(dyPct, startRect.h - MIN);
        const clampedDy = Math.max(-startRect.y, dy);
        y = startRect.y + clampedDy;
        h = startRect.h - clampedDy;
      }

      const round = (v) => Math.round(v * 10) / 10;
      resizeHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, round(x), round(y), round(w), round(h));
      return;
    }

    if (hotspotInteraction?.mode === "conn-endpoint-drag") {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setHotspotInteraction((prev) => ({ ...prev, mouseX, mouseY }));
      return;
    }

    if (hotspotInteraction?.mode === "hotspot-drag") {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setHotspotInteraction((prev) => ({ ...prev, mouseX, mouseY }));
      return;
    }

    if (connecting) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setConnecting((prev) => ({ ...prev, mouseX, mouseY }));
      return;
    }
    const result = handleMouseMove(e);
    if (result?.type === "drag") {
      moveScreen(result.id, result.x, result.y);
    }
  }, [handleMouseMove, moveScreen, connecting, canvasRef, pan, zoom, hotspotInteraction, screens, moveHotspot, resizeHotspot]);

  const onCanvasMouseUp = useCallback((e) => {
    // Handle connection endpoint drag completion
    if (hotspotInteraction?.mode === "conn-endpoint-drag") {
      const { connectionId, endpoint, mouseX, mouseY } = hotspotInteraction;
      const hitScreen = screens.find((s) => {
        const sw = s.width || 220;
        const sh = (s.imageHeight || 120) + HEADER_HEIGHT;
        return mouseX >= s.x && mouseX <= s.x + sw && mouseY >= s.y && mouseY <= s.y + sh;
      });
      if (hitScreen) {
        const patch = endpoint === "from"
          ? { fromScreenId: hitScreen.id }
          : { toScreenId: hitScreen.id };
        updateConnection(connectionId, patch);
      }
      setHotspotInteraction(null);
      return;
    }

    // Handle draw completion
    if (hotspotInteraction?.mode === "draw") {
      const dr = hotspotInteraction.drawRect;
      if (dr && dr.w >= 2 && dr.h >= 2) {
        const screen = screens.find((s) => s.id === hotspotInteraction.screenId);
        if (screen) {
          setHotspotModal({
            screen,
            hotspot: null,
            prefilledRect: { x: dr.x, y: dr.y, w: dr.w, h: dr.h },
          });
        }
      }
      setHotspotInteraction(null);
      return;
    }

    // Handle resize completion
    if (hotspotInteraction?.mode === "resize") {
      commitDragSnapshot();
      setHotspotInteraction({
        mode: "selected",
        screenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
      });
      return;
    }

    // Handle reposition completion
    if (hotspotInteraction?.mode === "reposition") {
      commitDragSnapshot();
      setHotspotInteraction({
        mode: "selected",
        screenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
      });
      return;
    }

    // Handle hotspot-drag completion (drop on empty canvas)
    if (hotspotInteraction?.mode === "hotspot-drag") {
      setHotspotInteraction({
        mode: "selected",
        screenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
      });
      setHoverTarget(null);
      return;
    }

    if (connecting) {
      cancelConnecting();
      return;
    }
    const wasDragging = !!dragging;
    handleMouseUp(e);
    if (wasDragging) commitDragSnapshot();
  }, [connecting, cancelConnecting, handleMouseUp, hotspotInteraction, screens, updateConnection, dragging, commitDragSnapshot]);

  const onCanvasMouseLeave = useCallback((e) => {
    if (hotspotInteraction?.mode === "conn-endpoint-drag") {
      setHotspotInteraction(null);
      return;
    }
    if (hotspotInteraction?.mode === "reposition" || hotspotInteraction?.mode === "resize") {
      commitDragSnapshot();
      setHotspotInteraction({
        mode: "selected",
        screenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
      });
      return;
    }
    if (hotspotInteraction?.mode === "draw") {
      setHotspotInteraction({
        mode: "selected",
        screenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
      });
      return;
    }
    if (hotspotInteraction?.mode === "hotspot-drag") {
      setHotspotInteraction({
        mode: "selected",
        screenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
      });
      setHoverTarget(null);
      return;
    }
    if (connecting) {
      cancelConnecting();
      return;
    }
    handleMouseUp(e);
  }, [connecting, cancelConnecting, handleMouseUp, hotspotInteraction, commitDragSnapshot]);

  const onDragStart = useCallback((e, screenId) => {
    captureDragSnapshot();
    handleDragStart(e, screenId, screens);
  }, [handleDragStart, screens, captureDragSnapshot]);

  const addHotspot = useCallback((screenId) => {
    const screen = screens.find((s) => s.id === screenId);
    setHotspotModal({ screen, hotspot: null });
  }, [screens]);

  const addHotspotViaConnect = useCallback((screenId) => {
    onStartConnect(screenId);
  }, [onStartConnect]);

  const onExport = useCallback(() => {
    exportFlow(screens, connections, pan, zoom, documents);
  }, [screens, connections, documents, pan, zoom]);

  const onImport = useCallback(() => {
    importFileRef.current?.click();
  }, []);

  const onImportFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const payload = importFlow(ev.target.result);
        setImportConfirm(payload);
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const onImportReplace = useCallback(() => {
    if (!importConfirm) return;
    replaceAll(importConfirm.screens, importConfirm.connections, importConfirm.screens.length + 1, importConfirm.documents || []);
    if (importConfirm.viewport) {
      setPan(importConfirm.viewport.pan);
      setZoom(importConfirm.viewport.zoom);
    }
    setImportConfirm(null);
  }, [importConfirm, replaceAll, setPan, setZoom]);

  const onImportMerge = useCallback(() => {
    if (!importConfirm) return;
    const { screens: newScreens, connections: newConns, documents: newDocs } = mergeFlow(
      importConfirm.screens, importConfirm.connections, screens, importConfirm.documents || []
    );
    mergeAll(newScreens, newConns, newDocs);
    setImportConfirm(null);
  }, [importConfirm, screens, mergeAll]);

  const onGenerate = useCallback(() => {
    if (screens.length === 0) return;
    const result = generateInstructionFiles(screens, connections, { platform: "auto", documents });
    setInstructions(result);
    setShowInstructions(true);
  }, [screens, connections, documents]);

  // Keyboard shortcuts: Escape cancels, Delete/Backspace removes selected connection
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (hotspotInteraction?.mode === "conn-endpoint-drag") {
          setHotspotInteraction(null);
          return;
        }
        if (connecting) cancelConnecting();
        if (hotspotInteraction) cancelHotspotInteraction();
        if (selectedConnection) setSelectedConnection(null);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (hotspotModal || renameModal || importConfirm || showInstructions || showDocuments) return;
        if (selectedConnection) {
          e.preventDefault();
          deleteConnection(selectedConnection);
          setSelectedConnection(null);
        } else if (selectedScreen) {
          e.preventDefault();
          removeScreen(selectedScreen);
        }
      }
      // Save shortcut (Cmd+S)
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveNow().then((saved) => {
          if (!saved && isFileSystemSupported) {
            onSaveAs();
          } else if (!saved) {
            onExport();
          }
        });
        return;
      }
      // Open shortcut (Cmd+O)
      if ((e.metaKey || e.ctrlKey) && e.key === "o" && isFileSystemSupported) {
        e.preventDefault();
        onOpen();
        return;
      }
      // Undo/Redo shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (hotspotModal || renameModal || importConfirm || showInstructions || showDocuments) return;
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (hotspotModal || renameModal || importConfirm || showInstructions || showDocuments) return;
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [connecting, cancelConnecting, hotspotInteraction, cancelHotspotInteraction, selectedConnection, deleteConnection, selectedScreen, removeScreen, hotspotModal, renameModal, importConfirm, showInstructions, showDocuments, undo, redo, saveNow, isFileSystemSupported, onSaveAs, onExport, onOpen]);

  useEffect(() => {
    const onPaste = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      handlePaste(e);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePaste]);

  const selectedScreenData = screens.find((s) => s.id === selectedScreen);

  const previewLine = connecting
    ? { fromScreenId: connecting.fromScreenId, toX: connecting.mouseX, toY: connecting.mouseY }
    : null;

  const hotspotPreviewLine = hotspotInteraction?.mode === "hotspot-drag"
    ? {
        fromScreenId: hotspotInteraction.screenId,
        hotspotId: hotspotInteraction.hotspotId,
        toX: hotspotInteraction.mouseX,
        toY: hotspotInteraction.mouseY,
      }
    : null;

  const isHotspotDragging = hotspotInteraction?.mode === "hotspot-drag";

  const endpointDragPreview = hotspotInteraction?.mode === "conn-endpoint-drag"
    ? {
        connectionId: hotspotInteraction.connectionId,
        endpoint: hotspotInteraction.endpoint,
        mouseX: hotspotInteraction.mouseX,
        mouseY: hotspotInteraction.mouseY,
      }
    : null;

  const resizeCursors = { nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize", se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize" };
  const isEndpointDragging = hotspotInteraction?.mode === "conn-endpoint-drag";
  const canvasCursor = connecting || isHotspotDragging || isEndpointDragging
    ? "crosshair"
    : hotspotInteraction?.mode === "draw"
      ? "crosshair"
      : hotspotInteraction?.mode === "resize"
        ? (resizeCursors[hotspotInteraction.handle] || "default")
        : hotspotInteraction?.mode === "reposition"
          ? "grabbing"
          : (spaceHeld && isPanning) ? "grabbing"
            : spaceHeld ? "grab"
              : isPanning ? "grabbing" : "default";

  const selectedHotspotId = hotspotInteraction?.hotspotId || null;
  const drawRect = hotspotInteraction?.mode === "draw" ? hotspotInteraction.drawRect : null;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONTS.ui,
        overflow: "hidden",
      }}
    >
      <link href={FONT_LINK} rel="stylesheet" />

      <TopBar
        screenCount={screens.length}
        connectionCount={connections.length}
        documentCount={documents.length}
        onUpload={handleImageUpload}
        onAddBlank={() => addScreenAtCenter()}
        onExport={onExport}
        onImport={onImport}
        onGenerate={onGenerate}
        onDocuments={() => setShowDocuments(true)}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        connectedFileName={connectedFileName}
        saveStatus={saveStatus}
        isFileSystemSupported={isFileSystemSupported}
        onNew={onNew}
        onOpen={onOpen}
        onSaveAs={onSaveAs}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background: COLORS.canvasBg,
            cursor: canvasCursor,
            backgroundImage: `radial-gradient(circle, ${COLORS.canvasDot} 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <div
            className="canvas-inner"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {screens.map((screen) => (
              <ScreenNode
                key={screen.id}
                screen={screen}
                selected={selectedScreen === screen.id}
                onSelect={setSelectedScreen}
                onDragStart={onDragStart}
                isSpaceHeld={isSpaceHeld}
                onAddHotspot={addHotspotViaConnect}
                onRemoveScreen={removeScreen}
                onDotDragStart={onDotDragStart}
                onConnectTarget={onConnectComplete}
                onHoverTarget={setHoverTarget}
                isConnectHoverTarget={hoverTarget === screen.id}
                isConnecting={!!connecting}
                selectedHotspotId={hotspotInteraction?.screenId === screen.id ? selectedHotspotId : null}
                onHotspotMouseDown={onHotspotMouseDown}
                onImageAreaMouseDown={onImageAreaMouseDown}
                onHotspotDragHandleMouseDown={onHotspotDragHandleMouseDown}
                onResizeHandleMouseDown={onResizeHandleMouseDown}
                onScreenDimensions={onScreenDimensions}
                drawRect={drawRect}
                isHotspotDragging={isHotspotDragging}
                onUpdateDescription={updateScreenDescription}
                onAddState={addState}
                onDropImage={handleDropImage}
              />
            ))}
            <ConnectionLines
              screens={screens}
              connections={connections}
              previewLine={previewLine}
              hotspotPreviewLine={hotspotPreviewLine}
              selectedConnectionId={selectedConnection}
              onConnectionClick={onConnectionClick}
              onConnectionDoubleClick={onConnectionDoubleClick}
              onEndpointMouseDown={onEndpointMouseDown}
              endpointDragPreview={endpointDragPreview}
            />
          </div>

          {screens.length === 0 && <EmptyState />}

          {/* Zoom indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 11,
              color: COLORS.textDim,
              fontFamily: FONTS.mono,
            }}
          >
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {selectedScreenData && (
          <Sidebar
            screen={selectedScreenData}
            screens={screens}
            connections={connections}
            onClose={() => setSelectedScreen(null)}
            onRename={() => setRenameModal(selectedScreenData)}
            onAddHotspot={addHotspot}
            onEditHotspot={(hs) => setHotspotModal({ screen: selectedScreenData, hotspot: hs })}
            onAddState={addState}
            onSelectScreen={setSelectedScreen}
            onUpdateStateName={updateStateName}
          />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <input
        ref={importFileRef}
        type="file"
        accept=".flowforge"
        style={{ display: "none" }}
        onChange={onImportFileChange}
      />

      {hotspotModal && (
        <HotspotModal
          screen={hotspotModal.screen}
          hotspot={hotspotModal.hotspot}
          screens={screens}
          documents={documents}
          onAddDocument={addDocument}
          prefilledTarget={hotspotModal.prefilledTarget || null}
          prefilledRect={hotspotModal.prefilledRect || null}
          onSave={(hs) => { saveHotspot(hotspotModal.screen.id, hs); setHotspotModal(null); }}
          onDelete={(id) => { deleteHotspot(hotspotModal.screen.id, id); setHotspotModal(null); }}
          onClose={() => setHotspotModal(null)}
        />
      )}

      {showDocuments && (
        <DocumentsPanel
          documents={documents}
          onAddDocument={addDocument}
          onUpdateDocument={updateDocument}
          onDeleteDocument={deleteDocument}
          onClose={() => setShowDocuments(false)}
        />
      )}

      {showInstructions && (
        <InstructionsPanel
          instructions={instructions}
          onClose={() => setShowInstructions(false)}
        />
      )}

      {renameModal && (
        <RenameModal
          screen={renameModal}
          onSave={(name) => { renameScreen(renameModal.id, name); setRenameModal(null); }}
          onClose={() => setRenameModal(null)}
        />
      )}

      {importConfirm && (
        <ImportConfirmModal
          payload={importConfirm}
          canvasEmpty={screens.length === 0}
          onReplace={onImportReplace}
          onMerge={onImportMerge}
          onClose={() => setImportConfirm(null)}
        />
      )}
    </div>
  );
}

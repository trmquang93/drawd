import { useState, useCallback, useEffect } from "react";
import { COLORS, FONTS, FONT_LINK, Z_INDEX } from "./styles/theme";
import { HEADER_HEIGHT, DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT, FILE_EXTENSION, LEGACY_FILE_EXTENSION } from "./constants";
import { generateInstructionFiles } from "./utils/generateInstructionFiles";
import { validateInstructions } from "./utils/validateInstructions";
import { useCanvas } from "./hooks/useCanvas";
import { useScreenManager } from "./hooks/useScreenManager";
import { useFilePersistence } from "./hooks/useFilePersistence";
import { useConnectionInteraction } from "./hooks/useConnectionInteraction";
import { useHotspotInteraction } from "./hooks/useHotspotInteraction";
import { useCanvasMouseHandlers } from "./hooks/useCanvasMouseHandlers";
import { useImportExport } from "./hooks/useImportExport";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useCanvasSelection } from "./hooks/useCanvasSelection";
import { ScreenNode } from "./components/ScreenNode";
import { ConnectionLines } from "./components/ConnectionLines";
import { HotspotModal } from "./components/HotspotModal";
import { ConnectionEditModal } from "./components/ConnectionEditModal";
import { InstructionsPanel } from "./components/InstructionsPanel";
import { DocumentsPanel } from "./components/DocumentsPanel";
import { DataModelsPanel } from "./components/DataModelsPanel";
import { RenameModal } from "./components/RenameModal";
import { ImportConfirmModal } from "./components/ImportConfirmModal";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { EmptyState } from "./components/EmptyState";
import { ConditionalPrompt } from "./components/ConditionalPrompt";
import { InlineConditionLabels } from "./components/InlineConditionLabels";
import { ShortcutsPanel } from "./components/ShortcutsPanel";
import { ScreensPanel } from "./components/ScreensPanel";
import { SelectionOverlay } from "./components/SelectionOverlay";
import { ToolBar } from "./components/ToolBar";
import { StickyNote } from "./components/StickyNote";
import { StickyNoteSidebar } from "./components/StickyNoteSidebar";
import { ScreenGroup } from "./components/ScreenGroup";
import { generateId } from "./utils/generateId";


export default function Drawd() {
  // ── Active tool ──────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState("select");

  // ── Core hooks ──────────────────────────────────────────────
  const {
    pan, setPan, zoom, setZoom, isPanning, dragging, multiDragging, canvasRef,
    isSpaceHeld, spaceHeld, handleDragStart, handleMultiDragStart, handleMouseMove, handleMouseUp, handleCanvasMouseDown,
  } = useCanvas(activeTool);

  const {
    screens, connections, documents, selectedScreen, setSelectedScreen,
    fileInputRef, addScreen, addScreenAtCenter, removeScreen, removeScreens, renameScreen, moveScreen, moveScreens,
    handleImageUpload, onFileChange, handlePaste, handleCanvasDrop,
    saveHotspot, deleteHotspot, deleteHotspots, moveHotspot, moveHotspotToScreen, resizeHotspot, updateScreenDimensions,
    updateScreenDescription, updateScreenNotes, updateScreenTbd, updateScreenRoles, updateScreenCodeRef, updateScreenCriteria, assignScreenImage, quickConnectHotspot,
    updateConnection, deleteConnection,
    addConnection, convertToConditionalGroup, addToConditionalGroup, saveConnectionGroup, deleteConnectionGroup,
    addState, updateStateName, addDocument, updateDocument, deleteDocument,
    replaceAll, mergeAll,
    canUndo, canRedo, undo, redo, captureDragSnapshot, commitDragSnapshot,
    updateScreenStatus, markAllExisting,
  } = useScreenManager(pan, zoom, canvasRef);

  // ── Canvas multi-object selection ────────────────────────────────────────
  const {
    canvasSelection, setCanvasSelection,
    rubberBand, rubberBandRect,
    toggleSelection, clearSelection,
    startRubberBand, updateRubberBand, completeRubberBand,
  } = useCanvasSelection();

  // ── Feature brief + scope ─────────────────────────────────────────────────
  const [featureBrief, setFeatureBrief] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [techStack, setTechStack] = useState({});
  const [scopeRoot, setScopeRoot] = useState(null);

  // ── Data models ───────────────────────────────────────────────────────────
  const [dataModels, setDataModels] = useState([]);
  const [showDataModels, setShowDataModels] = useState(false);

  // ── Sticky notes ──────────────────────────────────────────────────────────
  const [stickyNotes, setStickyNotes] = useState([]);
  const [selectedStickyNote, setSelectedStickyNote] = useState(null);

  // ── Screen groups ─────────────────────────────────────────────────────────
  const [screenGroups, setScreenGroups] = useState([]);
  const [selectedScreenGroup, setSelectedScreenGroup] = useState(null);

  // ── Screen group callbacks ────────────────────────────────────────────────
  const addScreenGroup = useCallback((name, screenIds = [], color = COLORS.accent008) => {
    const group = { id: generateId(), name, screenIds, color, folderHint: "" };
    setScreenGroups((prev) => [...prev, group]);
    return group.id;
  }, []);

  const updateScreenGroup = useCallback((id, patch) => {
    setScreenGroups((prev) => prev.map((g) => g.id === id ? { ...g, ...patch } : g));
  }, []);

  const deleteScreenGroup = useCallback((id) => {
    setScreenGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addScreenToGroup = useCallback((groupId, screenId) => {
    setScreenGroups((prev) => prev.map((g) =>
      g.id === groupId && !g.screenIds.includes(screenId)
        ? { ...g, screenIds: [...g.screenIds, screenId] }
        : g
    ));
  }, []);

  const removeScreenFromGroup = useCallback((screenId) => {
    setScreenGroups((prev) => prev.map((g) => ({
      ...g,
      screenIds: g.screenIds.filter((id) => id !== screenId),
    })));
  }, []);

  const addStickyNote = useCallback((x, y) => {
    const note = { id: generateId(), x, y, width: DEFAULT_SCREEN_WIDTH, content: "", color: "yellow", author: "" };
    setStickyNotes((prev) => [...prev, note]);
  }, []);

  const updateStickyNote = useCallback((id, patch) => {
    setStickyNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const deleteStickyNote = useCallback((id) => {
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addDataModel = useCallback((name, schema) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setDataModels((prev) => [...prev, { id, name, schema, createdAt: new Date().toISOString() }]);
    return id;
  }, []);
  const updateDataModel = useCallback((id, patch) => {
    setDataModels((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);
  const deleteDataModel = useCallback((id) => {
    setDataModels((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // BFS forward from scopeRoot following connections
  const scopeScreenIds = scopeRoot ? (() => {
    const visited = new Set([scopeRoot]);
    const queue = [scopeRoot];
    while (queue.length > 0) {
      const id = queue.shift();
      for (const conn of connections) {
        if (conn.fromScreenId === id && !visited.has(conn.toScreenId)) {
          visited.add(conn.toScreenId);
          queue.push(conn.toScreenId);
        }
      }
    }
    return visited;
  })() : null;

  const {
    connectedFileName, saveStatus, isFileSystemSupported,
    openFile, saveAs, saveNow, disconnect,
  } = useFilePersistence(screens, connections, pan, zoom, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups);

  // ── File actions ───────────────────────────────────────────────────
  const onOpen = useCallback(async () => {
    try {
      const payload = await openFile();
      if (!payload) return;
      replaceAll(payload.screens, payload.connections, payload.screens.length + 1, payload.documents || []);
      if (payload.viewport) { setPan(payload.viewport.pan); setZoom(payload.viewport.zoom); }
      setFeatureBrief(payload.metadata?.featureBrief || "");
      setTaskLink(payload.metadata?.taskLink || "");
      setTechStack(payload.metadata?.techStack || {});
      setDataModels(payload.dataModels || []);
      setStickyNotes(payload.stickyNotes || []);
      setScreenGroups(payload.screenGroups || []);
      setScopeRoot(null);
    } catch (err) { alert(err.message); }
  }, [openFile, replaceAll, setPan, setZoom]);

  const onSaveAs = useCallback(async () => {
    try { await saveAs(); } catch (err) { alert("Save failed: " + err.message); }
  }, [saveAs]);

  const onNew = useCallback(() => {
    if (screens.length > 0) {
      if (!window.confirm("You have unsaved changes. Start a new flow?")) return;
    }
    replaceAll([], [], 1, []);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setFeatureBrief("");
    setTaskLink("");
    setTechStack({});
    setDataModels([]);
    setStickyNotes([]);
    setScreenGroups([]);
    setScopeRoot(null);
    disconnect();
  }, [screens.length, replaceAll, setPan, setZoom, disconnect]);

  // ── Modal state ────────────────────────────────────────────────────────
  const [hotspotModal, setHotspotModal] = useState(null);
  const [connectionEditModal, setConnectionEditModal] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [groupContextMenu, setGroupContextMenu] = useState(null); // { screenId, x, y }
  const [instructions, setInstructions] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ── Interaction hooks ────────────────────────────────────────────────────────
  const connInteraction = useConnectionInteraction({
    screens, connections, canvasRef, pan, zoom,
    addConnection, addToConditionalGroup, convertToConditionalGroup,
  });

  const {
    connecting, setConnecting, cancelConnecting,
    hoverTarget, setHoverTarget,
    selectedConnection, setSelectedConnection,
    conditionalPrompt, setConditionalPrompt,
    editingConditionGroup, setEditingConditionGroup,
    onDotDragStart, onStartConnect,
    onConditionalPromptConfirm, onConditionalPromptCancel,
  } = connInteraction;

  const hsInteraction = useHotspotInteraction({
    screens, canvasRef, pan, zoom,
    connecting, setSelectedConnection,
    captureDragSnapshot, commitDragSnapshot,
    moveHotspot, resizeHotspot, updateScreenDimensions, assignScreenImage,
    activeTool,
  });

  const {
    hotspotInteraction, setHotspotInteraction,
    selectedHotspots, setSelectedHotspots,
    cancelHotspotInteraction,
    onHotspotMouseDown, onImageAreaMouseDown,
    onResizeHandleMouseDown, onHotspotDragHandleMouseDown,
    onEndpointMouseDown, onScreenDimensions, handleDropImage,
  } = hsInteraction;

  // ── Cross-concern callbacks ──────────────────────────────────────────────────────────
  const onConnectionClick = useCallback((connId) => {
    setSelectedConnection(connId);
    setHotspotInteraction(null);
  }, [setSelectedConnection, setHotspotInteraction]);

  const onConnectionDoubleClick = useCallback((connId) => {
    const conn = connections.find((c) => c.id === connId);
    if (!conn) return;
    const screen = screens.find((s) => s.id === conn.fromScreenId);
    if (!screen) return;
    if (conn.hotspotId) {
      const hotspot = screen.hotspots.find((h) => h.id === conn.hotspotId);
      if (hotspot) setHotspotModal({ screen, hotspot, connection: conn });
    } else {
      const groupConns = conn.conditionGroupId
        ? connections.filter((c) => c.conditionGroupId === conn.conditionGroupId)
        : [conn];
      setConnectionEditModal({ connection: conn, groupConnections: groupConns, fromScreen: screen });
    }
  }, [connections, screens]);

  const onConnectComplete = useCallback((targetScreenId) => {
    // Handle hotspot-drag connect
    if (hotspotInteraction?.mode === "hotspot-drag") {
      if (targetScreenId !== hotspotInteraction.screenId) {
        quickConnectHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, targetScreenId);
      }
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      setHoverTarget(null);
      return;
    }

    if (!connecting) return;
    const fromId = connecting.fromScreenId;
    if (targetScreenId === fromId) { cancelConnecting(); return; }

    const existingPlain = connections.filter((c) => c.fromScreenId === fromId && !c.hotspotId);

    // Scenario 2: existing conditional group — auto-join
    const existingGroup = existingPlain.find((c) => c.conditionGroupId);
    if (existingGroup) {
      addToConditionalGroup(fromId, targetScreenId, existingGroup.conditionGroupId);
      setEditingConditionGroup(existingGroup.conditionGroupId);
      cancelConnecting();
      return;
    }

    // Scenario 1: existing non-grouped connection — show prompt
    if (existingPlain.length > 0) {
      const isDuplicate = existingPlain.some((c) => c.toScreenId === targetScreenId);
      if (isDuplicate) { cancelConnecting(); return; }
      const fromScreen = screens.find((s) => s.id === fromId);
      const promptX = fromScreen ? fromScreen.x + (fromScreen.width || DEFAULT_SCREEN_WIDTH) + 20 : 0;
      const promptY = fromScreen ? fromScreen.y : 0;
      setConditionalPrompt({ fromId, targetScreenId, existingConnId: existingPlain[0].id, x: promptX, y: promptY });
      cancelConnecting();
      return;
    }

    addConnection(fromId, targetScreenId);
    cancelConnecting();
  }, [connecting, cancelConnecting, hotspotInteraction, setHotspotInteraction, quickConnectHotspot, addConnection, connections, screens, addToConditionalGroup, setEditingConditionGroup, setHoverTarget, setConditionalPrompt]);

  // Open hotspot modal when a draw gesture completes
  useEffect(() => {
    if (hotspotInteraction?.mode === "draw-complete") {
      const screen = screens.find((s) => s.id === hotspotInteraction.screenId);
      if (screen) {
        const { x, y, w, h } = hotspotInteraction.drawRect;
        setHotspotModal({ screen, hotspot: null, prefilledRect: { x, y, w, h } });
      }
      setHotspotInteraction(null);
    }
  }, [hotspotInteraction, screens, setHotspotInteraction]);

  // ── Canvas event handlers ──────────────────────────────────────────────────────────
  const { onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp, onCanvasMouseLeave, canvasCursor } =
    useCanvasMouseHandlers({
      hotspotInteraction, setHotspotInteraction, captureDragSnapshot, commitDragSnapshot,
      screens, moveHotspot, moveHotspotToScreen, resizeHotspot, updateConnection,
      connecting, setConnecting, cancelConnecting,
      selectedConnection, setSelectedConnection,
      conditionalPrompt, onConditionalPromptCancel,
      editingConditionGroup, setEditingConditionGroup,
      selectedHotspots, setSelectedHotspots,
      handleCanvasMouseDown, handleMouseMove, handleMouseUp,
      isSpaceHeld, spaceHeld, isPanning, dragging, multiDragging,
      setSelectedScreen, moveScreen, moveScreens,
      updateStickyNote, stickyNotes,
      canvasSelection, clearSelection,
      startRubberBand, updateRubberBand, completeRubberBand,
      rubberBand, setCanvasSelection,
      pan, zoom, canvasRef,
      activeTool,
      setSelectedStickyNote,
      setSelectedScreenGroup,
    });

  // ── Import / export ────────────────────────────────────────────────────────────────
  const { importConfirm, setImportConfirm, importFileRef, onExport, onImport, onImportFileChange, onImportReplace, onImportMerge } =
    useImportExport({ screens, connections, documents, dataModels, stickyNotes, screenGroups, pan, zoom, featureBrief, taskLink, techStack, replaceAll, mergeAll, setPan, setZoom, setStickyNotes, setScreenGroups });

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────────────
  useKeyboardShortcuts({
    hotspotModal, connectionEditModal, renameModal, importConfirm,
    showInstructions, showDocuments, showShortcuts, setShowShortcuts,
    conditionalPrompt, editingConditionGroup,
    connecting, cancelConnecting,
    hotspotInteraction, cancelHotspotInteraction,
    selectedConnection, setSelectedConnection,
    selectedHotspots, setSelectedHotspots,
    canvasSelection, clearSelection, removeScreens, deleteStickyNote, addScreenGroup, screens,
    connections, deleteHotspot, deleteHotspots, deleteConnection, deleteConnectionGroup,
    selectedScreen, removeScreen,
    selectedStickyNote, setSelectedStickyNote,
    selectedScreenGroup, setSelectedScreenGroup, deleteScreenGroup,
    undo, redo, saveNow, isFileSystemSupported, onSaveAs, onExport, onOpen,
    setActiveTool,
  });

  // ── Paste handler ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onPaste = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      handlePaste(e);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePaste]);

  // ── Misc callbacks ──────────────────────────────────────────────────────────────────
  const onDragStart = useCallback((e, screenId) => {
    if (activeTool === "pan") return;
    captureDragSnapshot();
    handleDragStart(e, screenId, screens);
  }, [handleDragStart, screens, captureDragSnapshot, activeTool]);

  const onMultiDragStart = useCallback((e) => {
    if (activeTool === "pan") return;
    captureDragSnapshot();
    handleMultiDragStart(e, canvasSelection, screens, stickyNotes);
  }, [activeTool, captureDragSnapshot, handleMultiDragStart, canvasSelection, screens, stickyNotes]);

  const addHotspot = useCallback((screenId) => {
    const screen = screens.find((s) => s.id === screenId);
    setHotspotModal({ screen, hotspot: null });
  }, [screens]);

  const onHotspotDoubleClick = useCallback((_e, screenId, hotspotId) => {
    const screen = screens.find((s) => s.id === screenId);
    if (!screen) return;
    const hotspot = screen.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot) return;
    setHotspotInteraction(null);
    setHotspotModal({ screen, hotspot });
  }, [screens, setHotspotInteraction]);

  const addHotspotViaConnect = useCallback((screenId) => {
    onStartConnect(screenId);
  }, [onStartConnect]);

  const buildInstructionResult = useCallback((warnings) => {
    const scopedScreens = scopeScreenIds
      ? screens.filter((s) => scopeScreenIds.has(s.id))
      : screens;
    return generateInstructionFiles(scopedScreens, connections, {
      platform: "auto",
      documents,
      featureBrief,
      taskLink,
      techStack,
      dataModels,
      screenGroups,
      scopeScreenIds,
      allScreens: screens,
      warnings,
    });
  }, [screens, connections, documents, featureBrief, scopeScreenIds, taskLink, techStack, dataModels, screenGroups]);

  const onGenerate = useCallback(() => {
    if (screens.length === 0) return;
    const scopedScreens = scopeScreenIds
      ? screens.filter((s) => scopeScreenIds.has(s.id))
      : screens;
    const warnings = validateInstructions(scopedScreens, connections, { documents });
    const errors = warnings.filter((w) => w.level === "error");
    if (
      errors.length > 0 &&
      !window.confirm(
        `Found ${errors.length} issue(s) that may affect generated output:\n\n${errors.map((e) => `\u2022 ${e.message}`).join("\n")}\n\nGenerate anyway?`
      )
    ) return;
    const result = buildInstructionResult(warnings);
    setInstructions(result);
    setShowInstructions(true);
  }, [screens, connections, documents, scopeScreenIds, buildInstructionResult]);

  const onScreensPanelClick = useCallback((screenId) => {
    clearSelection();
    setSelectedScreen(screenId);
    const screen = screens.find((s) => s.id === screenId);
    if (!screen || !canvasRef.current) return;
    const vw = canvasRef.current.clientWidth;
    const vh = canvasRef.current.clientHeight;
    const screenW = screen.width || DEFAULT_SCREEN_WIDTH;
    const screenH = screen.imageHeight ? screen.imageHeight + HEADER_HEIGHT : DEFAULT_SCREEN_HEIGHT;
    const centerX = screen.x + screenW / 2;
    const centerY = screen.y + screenH / 2;
    setPan({ x: vw / 2 - centerX * zoom, y: vh / 2 - centerY * zoom });
  }, [screens, zoom, canvasRef, setPan, setSelectedScreen, clearSelection]);

  // ── Derived values ──────────────────────────────────────────────────────────────────
  const selectedScreenData = screens.find((s) => s.id === selectedScreen);
  const selectedStickyNoteData = stickyNotes.find((n) => n.id === selectedStickyNote);

  const previewLine = connecting
    ? { fromScreenId: connecting.fromScreenId, toX: connecting.mouseX, toY: connecting.mouseY }
    : null;

  const hotspotPreviewLine = hotspotInteraction?.mode === "hotspot-drag"
    ? { fromScreenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId, toX: hotspotInteraction.mouseX, toY: hotspotInteraction.mouseY }
    : null;

  const endpointDragPreview = hotspotInteraction?.mode === "conn-endpoint-drag"
    ? { connectionId: hotspotInteraction.connectionId, endpoint: hotspotInteraction.endpoint, mouseX: hotspotInteraction.mouseX, mouseY: hotspotInteraction.mouseY }
    : null;

  const selectedHotspotId = hotspotInteraction?.hotspotId || null;
  const drawRect = hotspotInteraction?.mode === "draw" ? hotspotInteraction.drawRect : null;

  // Ghost preview showing where the hotspot will land during reposition drag
  const repositionGhost = (() => {
    if (hotspotInteraction?.mode !== "reposition" || hotspotInteraction.worldX == null) return null;
    const srcScreen = screens.find((s) => s.id === hotspotInteraction.screenId);
    if (!srcScreen) return null;
    const hs = srcScreen.hotspots.find((h) => h.id === hotspotInteraction.hotspotId);
    if (!hs) return null;
    const pixelW = (hs.w / 100) * (srcScreen.width || DEFAULT_SCREEN_WIDTH);
    const pixelH = (hs.h / 100) * (srcScreen.imageHeight || DEFAULT_SCREEN_HEIGHT);
    return {
      x: hotspotInteraction.worldX - pixelW / 2,
      y: hotspotInteraction.worldY - pixelH / 2,
      width: pixelW,
      height: pixelH,
    };
  })();

  // ── Render ────────────────────────────────────────────────────────────────────────────
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
        dataModelCount={dataModels.length}
        onExport={onExport}
        onImport={onImport}
        onGenerate={onGenerate}
        onDocuments={() => setShowDocuments(true)}
        onDataModels={() => setShowDataModels(true)}
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
        <ScreensPanel
          screens={screens}
          selectedScreen={selectedScreen}
          onScreenClick={onScreensPanelClick}
          onUpdateStatus={updateScreenStatus}
          onMarkAllExisting={markAllExisting}
          scopeRoot={scopeRoot}
          onSetScopeRoot={setScopeRoot}
          scopeScreenIds={scopeScreenIds}
          featureBrief={featureBrief}
          onFeatureBriefChange={setFeatureBrief}
          taskLink={taskLink}
          onTaskLinkChange={setTaskLink}
          techStack={techStack}
          onTechStackChange={setTechStack}
        />

        {/* Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={onCanvasMouseLeave}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          onClick={() => { if (groupContextMenu) setGroupContextMenu(null); }}
          onDoubleClick={(e) => {
            if (e.target !== canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const worldX = (e.clientX - rect.left - pan.x) / zoom;
            const worldY = (e.clientY - rect.top - pan.y) / zoom;
            addStickyNote(worldX, worldY);
          }}
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
            {screenGroups.map((group) => (
              <ScreenGroup
                key={group.id}
                group={group}
                screens={screens}
                onUpdate={updateScreenGroup}
                onDelete={deleteScreenGroup}
                selected={selectedScreenGroup === group.id}
                onSelect={(id) => {
                  setSelectedScreenGroup(id);
                  setSelectedStickyNote(null);
                  setSelectedScreen(null);
                  setSelectedConnection(null);
                  setHotspotInteraction(null);
                }}
              />
            ))}
            {screens.map((screen) => (
              <ScreenNode
                key={screen.id}
                screen={screen}
                selected={selectedScreen === screen.id}
                onSelect={(id) => { clearSelection(); setSelectedScreen(id); setSelectedStickyNote(null); }}
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
                selectedHotspotIds={selectedHotspots.length > 0 && selectedHotspots[0].screenId === screen.id
                  ? new Set(selectedHotspots.map((h) => h.hotspotId))
                  : null}
                onHotspotMouseDown={onHotspotMouseDown}
                onHotspotDoubleClick={onHotspotDoubleClick}
                onImageAreaMouseDown={onImageAreaMouseDown}
                onHotspotDragHandleMouseDown={onHotspotDragHandleMouseDown}
                onResizeHandleMouseDown={onResizeHandleMouseDown}
                onScreenDimensions={onScreenDimensions}
                drawRect={drawRect}
                isHotspotDragging={hotspotInteraction?.mode === "hotspot-drag"}
                onUpdateDescription={updateScreenDescription}
                onAddState={addState}
                onDropImage={handleDropImage}
                activeTool={activeTool}
                scopeRoot={scopeRoot}
                isInScope={scopeScreenIds ? scopeScreenIds.has(screen.id) : undefined}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = canvasRef.current?.getBoundingClientRect();
                  setGroupContextMenu({ screenId: screen.id, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                }}
                isMultiSelected={canvasSelection.some((i) => i.type === "screen" && i.id === screen.id)}
                onToggleSelect={toggleSelection}
                onMultiDragStart={onMultiDragStart}
              />
            ))}
            {stickyNotes.map((note) => (
              <StickyNote
                key={note.id}
                note={note}
                zoom={zoom}
                onUpdate={updateStickyNote}
                onDelete={deleteStickyNote}
                selected={selectedStickyNote === note.id}
                onSelect={(id) => {
                  setSelectedStickyNote(id);
                  setSelectedScreen(null);
                  setSelectedConnection(null);
                  setHotspotInteraction(null);
                  setSelectedScreenGroup(null);
                }}
                isMultiSelected={canvasSelection.some((i) => i.type === "sticky" && i.id === note.id)}
                onToggleSelect={toggleSelection}
                onMultiDragStart={onMultiDragStart}
                onDragStart={(e, id) => {
                  e.stopPropagation();
                  const startX = e.clientX;
                  const startY = e.clientY;
                  const origX = note.x;
                  const origY = note.y;
                  const onMove = (me) => {
                    const dx = (me.clientX - startX) / zoom;
                    const dy = (me.clientY - startY) / zoom;
                    updateStickyNote(id, { x: origX + dx, y: origY + dy });
                  };
                  const onUp = () => {
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                }}
              />
            ))}
            <SelectionOverlay rubberBandRect={rubberBandRect} />
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
            {repositionGhost && (
              <div
                style={{
                  position: "absolute",
                  left: repositionGhost.x,
                  top: repositionGhost.y,
                  width: repositionGhost.width,
                  height: repositionGhost.height,
                  border: `2px dashed ${COLORS.accent}`,
                  borderRadius: 6,
                  background: COLORS.accent01,
                  pointerEvents: "none",
                  opacity: 0.8,
                }}
              />
            )}
            {conditionalPrompt && (
              <ConditionalPrompt
                x={conditionalPrompt.x}
                y={conditionalPrompt.y}
                onConfirm={onConditionalPromptConfirm}
                onCancel={onConditionalPromptCancel}
              />
            )}
            {editingConditionGroup && (
              <InlineConditionLabels
                connections={connections}
                screens={screens}
                conditionGroupId={editingConditionGroup}
                onUpdateLabel={updateConnection}
                onDone={() => setEditingConditionGroup(null)}
              />
            )}
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

          {/* Screen group context menu */}
          {groupContextMenu && (
            <div
              style={{
                position: "absolute",
                left: groupContextMenu.x,
                top: groupContextMenu.y,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: 8,
                padding: "6px 0",
                zIndex: Z_INDEX.contextMenu,
                minWidth: 180,
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              }}
              onMouseLeave={() => setGroupContextMenu(null)}
            >
              <div style={{
                fontSize: 9,
                color: COLORS.textDim,
                fontFamily: FONTS.mono,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "4px 14px 6px",
              }}>
                Add to Group
              </div>
              {screenGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    addScreenToGroup(g.id, groupContextMenu.screenId);
                    setGroupContextMenu(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "6px 14px",
                    background: "none",
                    border: "none",
                    color: COLORS.text,
                    fontFamily: FONTS.mono,
                    fontSize: 12,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  {g.name}
                </button>
              ))}
              <div style={{ height: 1, background: COLORS.border, margin: "4px 0" }} />
              <button
                onClick={() => {
                  const name = prompt("New group name:");
                  if (!name?.trim()) return;
                  const gid = addScreenGroup(name.trim(), [groupContextMenu.screenId]);
                  setGroupContextMenu(null);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 14px",
                  background: "none",
                  border: "none",
                  color: COLORS.accentLight,
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                + Create new group…
              </button>
              <button
                onClick={() => {
                  removeScreenFromGroup(groupContextMenu.screenId);
                  setGroupContextMenu(null);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 14px",
                  background: "none",
                  border: "none",
                  color: COLORS.textDim,
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Remove from group
              </button>
            </div>
          )}

          {/* Tool switcher */}
          <ToolBar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onUpload={handleImageUpload}
            onAddBlank={() => addScreenAtCenter()}
            onAddStickyNote={() => {
              if (!canvasRef.current) return;
              const rect = canvasRef.current.getBoundingClientRect();
              const worldX = (rect.width / 2 - pan.x) / zoom;
              const worldY = (rect.height / 2 - pan.y) / zoom;
              addStickyNote(worldX, worldY);
            }}
          />
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
            onUpdateNotes={updateScreenNotes}
            onUpdateTbd={updateScreenTbd}
            onUpdateRoles={updateScreenRoles}
            onUpdateCodeRef={updateScreenCodeRef}
            onUpdateCriteria={updateScreenCriteria}
            onUpdateStatus={updateScreenStatus}
          />
        )}

        {selectedStickyNoteData && (
          <StickyNoteSidebar
            note={selectedStickyNoteData}
            onUpdate={updateStickyNote}
            onDelete={deleteStickyNote}
            onClose={() => setSelectedStickyNote(null)}
          />
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={onFileChange} />
      <input ref={importFileRef} type="file" accept={`${FILE_EXTENSION},${LEGACY_FILE_EXTENSION}`} style={{ display: "none" }} onChange={onImportFileChange} />

      {hotspotModal && (
        <HotspotModal
          screen={hotspotModal.screen}
          hotspot={hotspotModal.hotspot}
          screens={screens}
          documents={documents}
          onAddDocument={addDocument}
          connection={hotspotModal.connection || null}
          prefilledTarget={hotspotModal.prefilledTarget || null}
          prefilledRect={hotspotModal.prefilledRect || null}
          onSave={(hs) => {
            saveHotspot(hotspotModal.screen.id, hs);
            if (hotspotModal.connection) {
              updateConnection(hotspotModal.connection.id, {
                transitionType: hs.transitionType ?? "",
                transitionLabel: hs.transitionLabel ?? "",
              });
            }
            setHotspotModal(null);
          }}
          onDelete={(id) => { deleteHotspot(hotspotModal.screen.id, id); setHotspotModal(null); }}
          onClose={() => setHotspotModal(null)}
        />
      )}

      {connectionEditModal && (
        <ConnectionEditModal
          connection={connectionEditModal.connection}
          groupConnections={connectionEditModal.groupConnections}
          screens={screens}
          fromScreen={connectionEditModal.fromScreen}
          onSave={(payload) => {
            saveConnectionGroup(connectionEditModal.connection.id, payload);
            setConnectionEditModal(null);
            setSelectedConnection(null);
          }}
          onDelete={() => {
            const conn = connectionEditModal.connection;
            if (conn.conditionGroupId) {
              deleteConnectionGroup(conn.conditionGroupId);
            } else {
              deleteConnection(conn.id);
            }
            setConnectionEditModal(null);
            setSelectedConnection(null);
          }}
          onClose={() => setConnectionEditModal(null)}
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

      {showDataModels && (
        <DataModelsPanel
          dataModels={dataModels}
          onAddModel={addDataModel}
          onUpdateModel={updateDataModel}
          onDeleteModel={deleteDataModel}
          onClose={() => setShowDataModels(false)}
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

      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}

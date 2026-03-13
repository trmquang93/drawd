import { useState, useCallback, useEffect } from "react";
import { COLORS, FONTS, FONT_LINK } from "./styles/theme";
import { generateInstructionFiles } from "./utils/generateInstructionFiles";
import { useCanvas } from "./hooks/useCanvas";
import { useScreenManager } from "./hooks/useScreenManager";
import { useFilePersistence } from "./hooks/useFilePersistence";
import { useConnectionInteraction } from "./hooks/useConnectionInteraction";
import { useHotspotInteraction } from "./hooks/useHotspotInteraction";
import { useCanvasMouseHandlers } from "./hooks/useCanvasMouseHandlers";
import { useImportExport } from "./hooks/useImportExport";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
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
import { BatchHotspotBar } from "./components/BatchHotspotBar";
import { ToolBar } from "./components/ToolBar";

const HEADER_HEIGHT = 37;

export default function Drawd() {
  // ── Active tool ──────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState("select");

  // ── Core hooks ──────────────────────────────────────────────
  const {
    pan, setPan, zoom, setZoom, isPanning, dragging, canvasRef,
    isSpaceHeld, spaceHeld, handleDragStart, handleMouseMove, handleMouseUp, handleCanvasMouseDown,
  } = useCanvas(activeTool);

  const {
    screens, connections, documents, selectedScreen, setSelectedScreen,
    fileInputRef, addScreen, addScreenAtCenter, removeScreen, renameScreen, moveScreen,
    handleImageUpload, onFileChange, handlePaste, handleCanvasDrop,
    saveHotspot, deleteHotspot, deleteHotspots, moveHotspot, resizeHotspot, updateScreenDimensions,
    updateScreenDescription, updateScreenNotes, updateScreenCodeRef, updateScreenCriteria, assignScreenImage, quickConnectHotspot,
    updateConnection, deleteConnection, pasteHotspots,
    addConnection, convertToConditionalGroup, addToConditionalGroup, saveConnectionGroup, deleteConnectionGroup,
    addState, updateStateName, addDocument, updateDocument, deleteDocument,
    replaceAll, mergeAll,
    canUndo, canRedo, undo, redo, captureDragSnapshot, commitDragSnapshot,
    updateScreenStatus, markAllExisting,
  } = useScreenManager(pan, zoom, canvasRef);

  // ── Feature brief + scope ─────────────────────────────────────────────────
  const [featureBrief, setFeatureBrief] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [techStack, setTechStack] = useState({});
  const [scopeRoot, setScopeRoot] = useState(null);

  // ── Data models ───────────────────────────────────────────────────────────
  const [dataModels, setDataModels] = useState([]);
  const [showDataModels, setShowDataModels] = useState(false);

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
  } = useFilePersistence(screens, connections, pan, zoom, documents, featureBrief, taskLink, techStack, dataModels);

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
    setScopeRoot(null);
    disconnect();
  }, [screens.length, replaceAll, setPan, setZoom, disconnect]);

  // ── Modal state ────────────────────────────────────────────────────────
  const [hotspotModal, setHotspotModal] = useState(null);
  const [connectionEditModal, setConnectionEditModal] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
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
    hotspotClipboard,
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
      if (hotspot) setHotspotModal({ screen, hotspot });
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
      const promptX = fromScreen ? fromScreen.x + (fromScreen.width || 220) + 20 : 0;
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
      hotspotInteraction, setHotspotInteraction, commitDragSnapshot,
      screens, moveHotspot, resizeHotspot, updateConnection,
      connecting, setConnecting, cancelConnecting,
      selectedConnection, setSelectedConnection,
      conditionalPrompt, onConditionalPromptCancel,
      editingConditionGroup, setEditingConditionGroup,
      selectedHotspots, setSelectedHotspots,
      handleCanvasMouseDown, handleMouseMove, handleMouseUp,
      isSpaceHeld, spaceHeld, isPanning, dragging,
      setSelectedScreen, moveScreen,
      pan, zoom, canvasRef,
      activeTool,
    });

  // ── Import / export ────────────────────────────────────────────────────────────────
  const { importConfirm, setImportConfirm, importFileRef, onExport, onImport, onImportFileChange, onImportReplace, onImportMerge } =
    useImportExport({ screens, connections, documents, dataModels, pan, zoom, featureBrief, taskLink, techStack, replaceAll, mergeAll, setPan, setZoom });

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────────────
  useKeyboardShortcuts({
    hotspotModal, connectionEditModal, renameModal, importConfirm,
    showInstructions, showDocuments, showShortcuts, setShowShortcuts,
    conditionalPrompt, editingConditionGroup,
    connecting, cancelConnecting,
    hotspotInteraction, cancelHotspotInteraction,
    selectedConnection, setSelectedConnection,
    selectedHotspots, setSelectedHotspots,
    connections, deleteHotspots, deleteConnection, deleteConnectionGroup,
    selectedScreen, removeScreen,
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

  const addHotspot = useCallback((screenId) => {
    const screen = screens.find((s) => s.id === screenId);
    setHotspotModal({ screen, hotspot: null });
  }, [screens]);

  const addHotspotViaConnect = useCallback((screenId) => {
    onStartConnect(screenId);
  }, [onStartConnect]);

  const onGenerate = useCallback(() => {
    if (screens.length === 0) return;
    const scopedScreens = scopeScreenIds
      ? screens.filter((s) => scopeScreenIds.has(s.id))
      : screens;
    const result = generateInstructionFiles(scopedScreens, connections, {
      platform: "auto",
      documents,
      featureBrief,
      taskLink,
      techStack,
      dataModels,
      scopeScreenIds,
      allScreens: screens,
    });
    setInstructions(result);
    setShowInstructions(true);
  }, [screens, connections, documents, featureBrief, scopeScreenIds]);

  const onScreensPanelClick = useCallback((screenId) => {
    setSelectedScreen(screenId);
    const screen = screens.find((s) => s.id === screenId);
    if (!screen || !canvasRef.current) return;
    const vw = canvasRef.current.clientWidth;
    const vh = canvasRef.current.clientHeight;
    const screenW = screen.width || 220;
    const screenH = screen.imageHeight ? screen.imageHeight + HEADER_HEIGHT : 200;
    const centerX = screen.x + screenW / 2;
    const centerY = screen.y + screenH / 2;
    setPan({ x: vw / 2 - centerX * zoom, y: vh / 2 - centerY * zoom });
  }, [screens, zoom, canvasRef, setPan, setSelectedScreen]);

  // ── Derived values ──────────────────────────────────────────────────────────────────
  const selectedScreenData = screens.find((s) => s.id === selectedScreen);

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
        onUpload={handleImageUpload}
        onAddBlank={() => addScreenAtCenter()}
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
                selectedHotspotIds={selectedHotspots.length > 0 && selectedHotspots[0].screenId === screen.id
                  ? new Set(selectedHotspots.map((h) => h.hotspotId))
                  : null}
                onHotspotMouseDown={onHotspotMouseDown}
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

          {/* Tool switcher */}
          <ToolBar activeTool={activeTool} onToolChange={setActiveTool} />
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
            onUpdateCodeRef={updateScreenCodeRef}
            onUpdateCriteria={updateScreenCriteria}
            onUpdateStatus={updateScreenStatus}
          />
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={onFileChange} />
      <input ref={importFileRef} type="file" accept=".drawd,.flowforge" style={{ display: "none" }} onChange={onImportFileChange} />

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

      {selectedHotspots.length > 0 && (
        <BatchHotspotBar
          count={selectedHotspots.length}
          hasClipboard={!!hotspotClipboard.current}
          onCopy={() => {
            const screenId = selectedHotspots[0].screenId;
            const screen = screens.find((s) => s.id === screenId);
            if (!screen) return;
            const ids = new Set(selectedHotspots.map((h) => h.hotspotId));
            hotspotClipboard.current = screen.hotspots.filter((h) => ids.has(h.id));
          }}
          onPaste={() => {
            if (!hotspotClipboard.current || !selectedScreen) return;
            pasteHotspots(selectedScreen, hotspotClipboard.current);
            setSelectedHotspots([]);
          }}
          onDelete={() => {
            const screenId = selectedHotspots[0].screenId;
            const ids = selectedHotspots.map((h) => h.hotspotId);
            deleteHotspots(screenId, ids);
            setSelectedHotspots([]);
          }}
          onCancel={() => setSelectedHotspots([])}
        />
      )}
    </div>
  );
}

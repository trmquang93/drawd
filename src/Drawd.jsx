import { useState, useCallback, useRef, useEffect } from "react";
import { COLORS, FONTS, FONT_LINK } from "./styles/theme";
import { FILE_EXTENSION, LEGACY_FILE_EXTENSION, WIREFRAME_VIEWPORT_WIDTH, WIREFRAME_VIEWPORT_HEIGHT } from "./constants";
import { useCanvas } from "./hooks/useCanvas";
import { useScreenManager } from "./hooks/useScreenManager";
import { useFilePersistence } from "./hooks/useFilePersistence";
import { useConnectionInteraction } from "./hooks/useConnectionInteraction";
import { useHotspotInteraction } from "./hooks/useHotspotInteraction";
import { useCanvasMouseHandlers } from "./hooks/useCanvasMouseHandlers";
import { useImportExport } from "./hooks/useImportExport";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useCanvasSelection } from "./hooks/useCanvasSelection";
import { useStickyNotes } from "./hooks/useStickyNotes";
import { useScreenGroups } from "./hooks/useScreenGroups";
import { useDataModels } from "./hooks/useDataModels";
import { useFigmaPaste } from "./hooks/useFigmaPaste";
import { useInstructionGeneration } from "./hooks/useInstructionGeneration";
import { useFileActions } from "./hooks/useFileActions";
import { diffPayload } from "./utils/diffPayload";
import { useCollabSync } from "./hooks/useCollabSync";
import { useCommentManager } from "./hooks/useCommentManager";
import { useInteractionCallbacks } from "./hooks/useInteractionCallbacks";
import { useDerivedCanvasState } from "./hooks/useDerivedCanvasState";
import { useTemplateInserter } from "./hooks/useTemplateInserter";
import { useSelectionReporter } from "./hooks/useSelectionReporter";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { StickyNoteSidebar } from "./components/StickyNoteSidebar";
import { ScreensPanel } from "./components/ScreensPanel";
import { CanvasArea } from "./components/CanvasArea";
import { ModalsLayer } from "./components/ModalsLayer";
import { Toast } from "./components/Toast";
import { WireframeEditor } from "./components/wireframe/WireframeEditor";
import { CollabPresence } from "./components/CollabPresence";
import { CollabBadge } from "./components/CollabBadge";
import { importFlow } from "./utils/importFlow";
import { detectDrawdFile, findDrawdItem } from "./utils/detectDrawdFile";
import { diffFlows } from "./utils/diffFlows";
import { buildPayload } from "./utils/buildPayload";


export default function Drawd({ initialRoomCode }) {
  // ── Active tool ──────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState("select");

  // ── Core hooks ──────────────────────────────────────────
  const {
    pan, setPan, zoom, setZoom, isPanning, dragging, multiDragging, canvasRef,
    isSpaceHeld, spaceHeld, handleDragStart, handleMultiDragStart, handleMouseMove, handleMouseUp, handleCanvasMouseDown,
  } = useCanvas(activeTool);

  // ── Comments (before useScreenManager so cleanup callbacks are stable) ────
  const {
    comments, setComments,
    addComment, updateComment, resolveComment, unresolveComment, deleteComment,
    deleteCommentsForScreen, deleteCommentsForScreens,
    deleteCommentsForHotspot, deleteCommentsForHotspots,
    deleteCommentsForConnection, deleteCommentsForConnections,
  } = useCommentManager();
  const [showComments, setShowComments] = useState(false);
  const [selectedCommentId, setSelectedCommentId] = useState(null);
  // commentComposer: { targetType, targetId, screenId, anchor, clientX, clientY } | null
  const [commentComposer, setCommentComposer] = useState(null);

  const {
    screens, connections, documents, selectedScreen, setSelectedScreen,
    fileInputRef, addScreen, addScreenAtCenter, removeScreen, removeScreens, renameScreen, moveScreen, moveScreens,
    handleImageUpload, onFileChange, handlePaste, handleCanvasDrop,
    saveHotspot, deleteHotspot, deleteHotspots, moveHotspot, moveHotspotToScreen, resizeHotspot, updateScreenDimensions,
    updateScreenDescription, updateScreenNotes, updateScreenTbd, updateScreenRoles, updateScreenCodeRef, updateScreenCriteria, assignScreenImage, patchScreenImage, quickConnectHotspot,
    updateConnection, deleteConnection,
    addConnection, convertToConditionalGroup, addToConditionalGroup, saveConnectionGroup, deleteConnectionGroup,
    addState, linkAsState, updateStateName, addDocument, updateDocument, deleteDocument,
    replaceAll, mergeAll, duplicateSelection,
    pushHistory,
    canUndo, canRedo, undo, redo, captureDragSnapshot, commitDragSnapshot,
    updateScreenStatus, markAllExisting, updateWireframe,
    setScreenComponent,
  } = useScreenManager(pan, zoom, canvasRef, {
    onDeleteCommentsForScreen: deleteCommentsForScreen,
    onDeleteCommentsForScreens: deleteCommentsForScreens,
    onDeleteCommentsForHotspot: deleteCommentsForHotspot,
    onDeleteCommentsForHotspots: deleteCommentsForHotspots,
    onDeleteCommentsForConnection: deleteCommentsForConnection,
    onDeleteCommentsForConnections: deleteCommentsForConnections,
  });

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

  // ── Extracted CRUD hooks ────────────────────────────────────────────────
  const {
    stickyNotes, setStickyNotes,
    selectedStickyNote, setSelectedStickyNote,
    addStickyNote, updateStickyNote, deleteStickyNote,
  } = useStickyNotes();

  const {
    screenGroups, setScreenGroups,
    selectedScreenGroup, setSelectedScreenGroup,
    addScreenGroup, updateScreenGroup, deleteScreenGroup,
    addScreenToGroup, removeScreenFromGroup,
  } = useScreenGroups();

  const {
    dataModels, setDataModels,
    showDataModels, setShowDataModels,
    addDataModel, updateDataModel, deleteDataModel,
  } = useDataModels();

  // ── Collaboration ──────────────────────────────────────────────────────────
  const draggingRef = useRef(false);
  draggingRef.current = dragging;
  const hotspotInteractionRef = useRef(null);

  const {
    collab, isReadOnly,
    canEditFlow, canComment, canModerateComments,
    showShareModal, setShowShareModal,
    showParticipants, setShowParticipants,
    pendingRemoteStateRef, applyPendingRemoteState,
  } = useCollabSync({
    screens, connections, documents,
    featureBrief, taskLink, techStack,
    dataModels, stickyNotes, screenGroups, comments,
    replaceAll, setFeatureBrief, setTaskLink, setTechStack,
    setDataModels, setStickyNotes, setScreenGroups, setComments,
    draggingRef, hotspotInteractionRef, patchScreenImage,
    canvasRef, pan, zoom, initialRoomCode,
  });

  useEffect(() => {
    if (!collab.isConnected) setShowParticipants(false);
  }, [collab.isConnected]);

  // ── Scope computation ───────────────────────────────────────────────────
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

  // ── File persistence ────────────────────────────────────────────────────
  // Ref bridge breaks the circular dep: useFilePersistence is called first,
  // but needs applyPayload which comes from useFileActions below.
  const externalChangeRef = useRef(null);
  const onExternalChange = useCallback((payload, opts) => { externalChangeRef.current?.(payload, opts); }, []);

  const {
    connectedFileName, saveStatus, isFileSystemSupported,
    openFile, saveAs, saveNow, connectHandle, disconnect,
  } = useFilePersistence(screens, connections, pan, zoom, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups, comments, onExternalChange);

  // ── File actions ───────────────────────────────────────────────────
  const { applyPayload, onOpen, onSaveAs, onNew } = useFileActions({
    screens, connections, documents,
    replaceAll, pushHistory,
    setPan, setZoom,
    setFeatureBrief, setTaskLink, setTechStack,
    setDataModels, setStickyNotes, setScreenGroups, setComments,
    setScopeRoot, openFile, saveAs, disconnect,
  });
  // Complete the ref bridge so the poller can call applyPayload.
  // Re-assigned every render to capture fresh closures over current state.
  externalChangeRef.current = (payload, opts) => {
    const changed = diffPayload({ screens, connections, stickyNotes }, payload);
    applyPayload(payload, opts);
    if (changed.size > 0) {
      setMcpFlashIds(changed);
      if (mcpFlashTimerRef.current) clearTimeout(mcpFlashTimerRef.current);
      mcpFlashTimerRef.current = setTimeout(() => setMcpFlashIds(null), 900);
      showToast(`MCP updated ${changed.size} item${changed.size > 1 ? 's' : ''}`);
    }
  };

  // ── Modal state ────────────────────────────────────────────────────────
  const [hotspotModal, setHotspotModal] = useState(null);
  const [connectionEditModal, setConnectionEditModal] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [groupContextMenu, setGroupContextMenu] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [formSummaryScreen, setFormSummaryScreen] = useState(null);
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [flowDiffResult, setFlowDiffResult] = useState(null);

  // ── Template inserter ─────────────────────────────────────────────────
  const { insertTemplate } = useTemplateInserter({
    screens, mergeAll, replaceAll, pan, zoom, canvasRef,
  });

  const onTemplates = useCallback(() => setShowTemplateBrowser(true), []);
  const onInsertTemplate = useCallback((data) => {
    insertTemplate(data);
    setShowTemplateBrowser(false);
  }, [insertTemplate]);

  // ── Flow comparison ───────────────────────────────────────────────────
  const onCompareFlows = useCallback(async () => {
    if (!isFileSystemSupported) return;
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: "Drawd files",
          accept: { "application/json": [".drawd", ".drawd.json"] },
        }],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const baseFlow = importFlow(text);
      const currentFlow = buildPayload(
        screens, connections, pan, zoom, documents,
        featureBrief, taskLink, techStack,
        dataModels, stickyNotes, screenGroups, comments,
      );
      const diff = diffFlows(baseFlow, currentFlow);
      setFlowDiffResult({ diff, fileName: file.name });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Compare failed:", err);
    }
  }, [isFileSystemSupported, screens, connections, pan, zoom, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups, comments]);

  // ── Instruction generation ─────────────────────────────────────────────
  const { instructions, showInstructions, setShowInstructions, onGenerate, buildInstructionResult } =
    useInstructionGeneration({
      screens, connections, documents,
      featureBrief, taskLink, techStack,
      dataModels, screenGroups, scopeScreenIds,
    });

  // ── Figma paste ────────────────────────────────────────────────────────
  const { figmaProcessing, figmaError, setFigmaError } =
    useFigmaPaste({ handlePaste, addScreenAtCenter });

  // ── Interaction hooks ────────────────────────────────────────────────────────
  const connInteraction = useConnectionInteraction({
    screens, connections, canvasRef, pan, zoom,
    addConnection, addToConditionalGroup, convertToConditionalGroup,
    linkAsState,
  });

  const {
    connecting, setConnecting, cancelConnecting,
    hoverTarget, setHoverTarget,
    selectedConnection, setSelectedConnection,
    conditionalPrompt, setConditionalPrompt,
    connectionTypePrompt, setConnectionTypePrompt,
    editingConditionGroup, setEditingConditionGroup,
    onDotDragStart, onStartConnect,
    onConditionalPromptConfirm, onConditionalPromptCancel,
    onConnectionTypeNavigate, onConnectionTypeStateVariant,
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

  // Keep collab sync refs up to date
  hotspotInteractionRef.current = hotspotInteraction;

  // ── MCP selection bridge reporter ────────────────────────────────────────
  useSelectionReporter({
    canvasSelection,
    selectedScreen,
    selectedStickyNote,
    selectedScreenGroup,
    selectedConnection,
    selectedHotspots,
    hotspotInteraction,
    selectedCommentId,
    screens,
    filePath: connectedFileName,
  });

  // ── Cross-concern callbacks ──────────────────────────────────────────────────────────
  const {
    onConnectionClick, onConnectionDoubleClick, onConnectComplete,
    onDragStart, onMultiDragStart,
    addHotspot, onHotspotDoubleClick, addHotspotViaConnect,
    onScreensPanelClick,
  } = useInteractionCallbacks({
    screens, connections, stickyNotes,
    connecting, cancelConnecting,
    hotspotInteraction, setHotspotInteraction,
    setSelectedConnection, setHoverTarget,
    setConditionalPrompt, setEditingConditionGroup,
    setConnectionTypePrompt,
    setHotspotModal, setConnectionEditModal,
    quickConnectHotspot, addConnection, addToConditionalGroup, convertToConditionalGroup,
    onStartConnect,
    activeTool, captureDragSnapshot,
    handleDragStart, handleMultiDragStart,
    canvasSelection, clearSelection,
    setSelectedScreen, setPan, zoom, canvasRef,
  });

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
      isReadOnly,
      pendingRemoteStateRef,
      applyPendingRemoteState,
    });

  // ── Import / export ────────────────────────────────────────────────────────────────
  const { importConfirm, setImportConfirm, importFileRef, onExport, onExportPrototype, onExportPng, onExportSvg, onImport, onImportFileChange, onImportReplace, onImportMerge } =
    useImportExport({ screens, connections, documents, dataModels, stickyNotes, screenGroups, comments, pan, zoom, featureBrief, taskLink, techStack, replaceAll, mergeAll, setPan, setZoom, setStickyNotes, setScreenGroups, setComments, scopeScreenIds, connectedFileName, canvasSelection });

  // ── Toast notification ─────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  }, []);
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  // ── MCP flash state ────────────────────────────────────────────────────────────────
  const [mcpFlashIds, setMcpFlashIds] = useState(null);
  const mcpFlashTimerRef = useRef(null);

  // ── Wireframe editor state ─────────────────────────────────────────────────────────
  // null = closed; { screenId, components, viewport } = open
  const [wireframeEditor, setWireframeEditor] = useState(null);
  const handleAddWireframe = useCallback(() => {
    setWireframeEditor({ screenId: null, components: [], viewport: { width: WIREFRAME_VIEWPORT_WIDTH, height: WIREFRAME_VIEWPORT_HEIGHT } });
  }, []);

  // ── Drag-over state (drop zone overlay) ───────────────────────────────────────────
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);
  const onCanvasDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) setIsDraggingOver(true);
  }, []);
  const onCanvasDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDraggingOver(false);
  }, []);

  // ── Canvas drop (intercepts .drawd files, delegates images) ────────────────────────
  const onCanvasDrop = useCallback(async (e) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const drawdFile = detectDrawdFile(e.dataTransfer.files);
    if (!drawdFile) {
      const imageFiles = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.startsWith("image/")
      );
      if (imageFiles.length === 0) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / zoom;
      const worldY = (e.clientY - rect.top - pan.y) / zoom;
      handleCanvasDrop(imageFiles, worldX, worldY);
      showToast(`Created ${imageFiles.length} screen${imageFiles.length > 1 ? "s" : ""} from dropped images`);
      return;
    }

    // Capture both promises synchronously before any await — the DataTransferItemList
    // is cleared by the browser as soon as the event handler yields.
    const textPromise = drawdFile.text();
    let handlePromise = null;
    if (isFileSystemSupported && e.dataTransfer.items) {
      const drawdItem = findDrawdItem(e.dataTransfer.items);
      if (drawdItem) handlePromise = drawdItem.getAsFileSystemHandle();
    }

    try {
      const [text, handle] = await Promise.all([textPromise, handlePromise]);
      const payload = importFlow(text);

      if (handle && handle.kind === "file") {
        await connectHandle(handle);
      }

      if (screens.length === 0) {
        applyPayload(payload);
      } else {
        setImportConfirm(payload);
      }
    } catch (err) {
      alert(err.message);
    }
  }, [screens.length, handleCanvasDrop, applyPayload, setImportConfirm, connectHandle, isFileSystemSupported, pan, zoom, showToast]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────────────
  useKeyboardShortcuts({
    hotspotModal, connectionEditModal, renameModal, importConfirm,
    showInstructions, showDocuments, showShortcuts, setShowShortcuts,
    showParticipants,
    conditionalPrompt, editingConditionGroup,
    connecting, cancelConnecting,
    hotspotInteraction, cancelHotspotInteraction,
    selectedConnection, setSelectedConnection,
    selectedHotspots, setSelectedHotspots,
    canvasSelection, setCanvasSelection, clearSelection, removeScreens, deleteStickyNote, addScreenGroup, screens, stickyNotes, scopeScreenIds,
    connections, deleteHotspot, deleteHotspots, deleteConnection, deleteConnectionGroup,
    selectedScreen, removeScreen,
    selectedStickyNote, setSelectedStickyNote,
    selectedScreenGroup, setSelectedScreenGroup, deleteScreenGroup,
    undo, redo, saveNow, isFileSystemSupported, onSaveAs, onExport, onOpen,
    setActiveTool,
    onTemplates,
    isReadOnly,
    canComment,
    duplicateSelection,
    onAddWireframe: handleAddWireframe,
  });

  // ── Derived values ──────────────────────────────────────────────────────────────────
  const selectedScreenData = screens.find((s) => s.id === selectedScreen);
  const selectedStickyNoteData = stickyNotes.find((n) => n.id === selectedStickyNote);

  const { previewLine, hotspotPreviewLine, endpointDragPreview, selectedHotspotId, drawRect, repositionGhost } =
    useDerivedCanvasState({ connecting, hotspotInteraction, screens });

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
      <style>{`
        @keyframes mcp-flash {
          0%   { box-shadow: 0 0 0 0 rgba(97,175,239,0.0); }
          20%  { box-shadow: 0 0 24px 4px rgba(97,175,239,0.5); }
          100% { box-shadow: 0 0 0 0 rgba(97,175,239,0.0); }
        }
        @keyframes mcp-flash-svg {
          0%   { opacity: 0; }
          20%  { opacity: 0.6; }
          100% { opacity: 0; }
        }
      `}</style>

      <TopBar
        screenCount={screens.length}
        connectionCount={connections.length}
        documentCount={documents.length}
        dataModelCount={dataModels.length}
        onExport={onExport}
        onExportPrototype={onExportPrototype}
        onExportPng={onExportPng}
        onExportSvg={onExportSvg}
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
        collabState={collab}
        onShare={() => setShowShareModal(true)}
        collabBadge={collab.isConnected ? (
          <CollabBadge
            roomCode={collab.roomCode}
            isReadOnly={isReadOnly}
            isConnected={collab.isConnected}
            onLeave={collab.leaveRoom}
          />
        ) : null}
        collabPresence={collab.isConnected ? (
          <CollabPresence
            peers={collab.peers}
            isHost={collab.isHost}
            onSetRole={collab.setPeerRole}
          />
        ) : null}
        onToggleParticipants={() => setShowParticipants((v) => !v)}
        showParticipants={showParticipants}
        onTemplates={onTemplates}
        onCompareFlows={onCompareFlows}
        canComment={canComment}
        showComments={showComments}
        onToggleComments={() => setShowComments((v) => !v)}
        unresolvedCommentCount={comments.filter((c) => !c.resolved).length}
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
          onSetComponent={setScreenComponent}
          isReadOnly={isReadOnly}
        />

        <CanvasArea
          canvasRef={canvasRef}
          pan={pan}
          zoom={zoom}
          canvasCursor={canvasCursor}
          onCanvasMouseDown={onCanvasMouseDown}
          onCanvasMouseMove={onCanvasMouseMove}
          onCanvasMouseUp={onCanvasMouseUp}
          onCanvasMouseLeave={onCanvasMouseLeave}
          onCanvasDrop={onCanvasDrop}
          screenGroups={screenGroups}
          selectedScreenGroup={selectedScreenGroup}
          updateScreenGroup={updateScreenGroup}
          deleteScreenGroup={deleteScreenGroup}
          addScreenToGroup={addScreenToGroup}
          removeScreenFromGroup={removeScreenFromGroup}
          addScreenGroup={addScreenGroup}
          setSelectedScreenGroup={setSelectedScreenGroup}
          setSelectedStickyNote={setSelectedStickyNote}
          setSelectedScreen={setSelectedScreen}
          setSelectedConnection={setSelectedConnection}
          setHotspotInteraction={setHotspotInteraction}
          screens={screens}
          selectedScreen={selectedScreen}
          clearSelection={clearSelection}
          onDragStart={onDragStart}
          isSpaceHeld={isSpaceHeld}
          addHotspotViaConnect={addHotspotViaConnect}
          removeScreen={removeScreen}
          onDotDragStart={onDotDragStart}
          onConnectComplete={onConnectComplete}
          setHoverTarget={setHoverTarget}
          hoverTarget={hoverTarget}
          connecting={connecting}
          hotspotInteraction={hotspotInteraction}
          selectedHotspotId={selectedHotspotId}
          selectedHotspots={selectedHotspots}
          onHotspotMouseDown={onHotspotMouseDown}
          onHotspotDoubleClick={onHotspotDoubleClick}
          onImageAreaMouseDown={onImageAreaMouseDown}
          onHotspotDragHandleMouseDown={onHotspotDragHandleMouseDown}
          onResizeHandleMouseDown={onResizeHandleMouseDown}
          onScreenDimensions={onScreenDimensions}
          drawRect={drawRect}
          updateScreenDescription={updateScreenDescription}
          addState={addState}
          handleDropImage={handleDropImage}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          scopeRoot={scopeRoot}
          scopeScreenIds={scopeScreenIds}
          canvasSelection={canvasSelection}
          toggleSelection={toggleSelection}
          onMultiDragStart={onMultiDragStart}
          isReadOnly={isReadOnly}
          onUpdateStatus={updateScreenStatus}
          onFormSummary={(screenId) => {
            const s = screens.find((sc) => sc.id === screenId);
            if (s) setFormSummaryScreen(s);
          }}
          stickyNotes={stickyNotes}
          selectedStickyNote={selectedStickyNote}
          updateStickyNote={updateStickyNote}
          deleteStickyNote={deleteStickyNote}
          addStickyNote={addStickyNote}
          rubberBandRect={rubberBandRect}
          connections={connections}
          previewLine={previewLine}
          hotspotPreviewLine={hotspotPreviewLine}
          selectedConnection={selectedConnection}
          onConnectionClick={onConnectionClick}
          onConnectionDoubleClick={onConnectionDoubleClick}
          onEndpointMouseDown={onEndpointMouseDown}
          endpointDragPreview={endpointDragPreview}
          repositionGhost={repositionGhost}
          conditionalPrompt={conditionalPrompt}
          onConditionalPromptConfirm={onConditionalPromptConfirm}
          onConditionalPromptCancel={onConditionalPromptCancel}
          connectionTypePrompt={connectionTypePrompt}
          onConnectionTypeNavigate={onConnectionTypeNavigate}
          onConnectionTypeStateVariant={onConnectionTypeStateVariant}
          collab={collab}
          editingConditionGroup={editingConditionGroup}
          updateConnection={updateConnection}
          setEditingConditionGroup={setEditingConditionGroup}
          groupContextMenu={groupContextMenu}
          setGroupContextMenu={setGroupContextMenu}
          duplicateSelection={duplicateSelection}
          setCanvasSelection={setCanvasSelection}
          handleImageUpload={handleImageUpload}
          addScreenAtCenter={addScreenAtCenter}
          isDraggingOver={isDraggingOver}
          onCanvasDragEnter={onCanvasDragEnter}
          onCanvasDragLeave={onCanvasDragLeave}
          onTemplates={onTemplates}
          showToast={showToast}
          mcpFlashIds={mcpFlashIds}
          onAddWireframe={handleAddWireframe}
          onEditWireframe={(screenId) => {
            const s = screens.find((sc) => sc.id === screenId);
            if (s?.wireframe) setWireframeEditor({ screenId, components: s.wireframe.components, viewport: s.wireframe.viewport });
          }}
          comments={comments}
          canComment={canComment}
          onCommentImageClick={(e, screenId, xPct, yPct) => {
            setCommentComposer({
              targetType: "screen",
              targetId: screenId,
              screenId,
              anchor: { xPct, yPct },
              clientX: e.clientX,
              clientY: e.clientY,
            });
          }}
          onCommentConnectionClick={(e, connectionId, t) => {
            setCommentComposer({
              targetType: "connection",
              targetId: connectionId,
              screenId: null,
              anchor: { t },
              clientX: e.clientX,
              clientY: e.clientY,
            });
          }}
          selectedCommentId={selectedCommentId}
          onCommentPinClick={(id) => setSelectedCommentId((prev) => (prev === id ? null : id))}
          onDeselectComment={() => setSelectedCommentId(null)}
        />

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
            onSetComponent={setScreenComponent}
            isReadOnly={isReadOnly}
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

      <ModalsLayer
        hotspotModal={hotspotModal}
        setHotspotModal={setHotspotModal}
        screens={screens}
        documents={documents}
        addDocument={addDocument}
        saveHotspot={saveHotspot}
        deleteHotspot={deleteHotspot}
        updateConnection={updateConnection}
        connectionEditModal={connectionEditModal}
        setConnectionEditModal={setConnectionEditModal}
        saveConnectionGroup={saveConnectionGroup}
        deleteConnectionGroup={deleteConnectionGroup}
        deleteConnection={deleteConnection}
        setSelectedConnection={setSelectedConnection}
        showDocuments={showDocuments}
        setShowDocuments={setShowDocuments}
        updateDocument={updateDocument}
        deleteDocument={deleteDocument}
        showDataModels={showDataModels}
        setShowDataModels={setShowDataModels}
        dataModels={dataModels}
        addDataModel={addDataModel}
        updateDataModel={updateDataModel}
        deleteDataModel={deleteDataModel}
        showInstructions={showInstructions}
        setShowInstructions={setShowInstructions}
        instructions={instructions}
        renameModal={renameModal}
        setRenameModal={setRenameModal}
        renameScreen={renameScreen}
        importConfirm={importConfirm}
        onImportReplace={onImportReplace}
        onImportMerge={onImportMerge}
        setImportConfirm={setImportConfirm}
        showParticipants={showParticipants}
        setShowParticipants={setShowParticipants}
        collab={collab}
        showShortcuts={showShortcuts}
        setShowShortcuts={setShowShortcuts}
        showShareModal={showShareModal}
        setShowShareModal={setShowShareModal}
        initialRoomCode={initialRoomCode}
        figmaProcessing={figmaProcessing}
        figmaError={figmaError}
        setFigmaError={setFigmaError}
        formSummaryScreen={formSummaryScreen}
        setFormSummaryScreen={setFormSummaryScreen}
        showTemplateBrowser={showTemplateBrowser}
        setShowTemplateBrowser={setShowTemplateBrowser}
        onInsertTemplate={onInsertTemplate}
        flowDiffResult={flowDiffResult}
        setFlowDiffResult={setFlowDiffResult}
        showComments={showComments}
        setShowComments={setShowComments}
        comments={comments}
        connections={connections}
        canModerate={canModerateComments}
        selfPeerId={collab.isConnected ? collab.selfPeerId : null}
        selfDisplayName={collab.selfDisplayName}
        onResolveComment={(id) => resolveComment(id, collab.selfDisplayName || "Anonymous")}
        onUnresolveComment={unresolveComment}
        onDeleteComment={deleteComment}
        selectedCommentId={selectedCommentId}
        setSelectedCommentId={setSelectedCommentId}
        commentComposer={commentComposer}
        setCommentComposer={setCommentComposer}
        onCommentSubmit={(text) => {
          if (!commentComposer) return;
          addComment({
            text,
            authorName: collab.selfDisplayName || "Me",
            authorPeerId: collab.isConnected ? (collab.selfPeerId || null) : null,
            authorColor: collab.selfColor || "#61afef",
            targetType: commentComposer.targetType,
            targetId: commentComposer.targetId,
            screenId: commentComposer.screenId,
            anchor: commentComposer.anchor,
          });
          setCommentComposer(null);
          setActiveTool("select");
          if (!showComments) setShowComments(true);
        }}
      />
      <Toast message={toast} />
      {wireframeEditor && (
        <WireframeEditor
          screenId={wireframeEditor.screenId}
          initialComponents={wireframeEditor.components}
          viewport={wireframeEditor.viewport}
          screenName={wireframeEditor.screenId ? screens.find((s) => s.id === wireframeEditor.screenId)?.name : "New Wireframe"}
          onSave={(screenId, components, viewport, imageData) => {
            if (screenId) {
              updateWireframe(screenId, { components, viewport }, imageData);
            } else {
              addScreenAtCenter(imageData, "Wireframe Screen", 0, { wireframe: { components, viewport } });
            }
            setWireframeEditor(null);
          }}
          onCancel={() => setWireframeEditor(null)}
        />
      )}
    </div>
  );
}

import { useState, useCallback, useRef, useEffect } from "react";
import { COLORS, FONTS, FONT_LINK } from "./styles/theme";
import { FILE_EXTENSION, LEGACY_FILE_EXTENSION } from "./constants";
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
import { useCollabSync } from "./hooks/useCollabSync";
import { useInteractionCallbacks } from "./hooks/useInteractionCallbacks";
import { useDerivedCanvasState } from "./hooks/useDerivedCanvasState";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { StickyNoteSidebar } from "./components/StickyNoteSidebar";
import { ScreensPanel } from "./components/ScreensPanel";
import { CanvasArea } from "./components/CanvasArea";
import { ModalsLayer } from "./components/ModalsLayer";
import { CollabPresence } from "./components/CollabPresence";
import { CollabBadge } from "./components/CollabBadge";
import { importFlow } from "./utils/importFlow";
import { detectDrawdFile } from "./utils/detectDrawdFile";


export default function Drawd({ initialRoomCode }) {
  // ── Active tool ──────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState("select");

  // ── Core hooks ──────────────────────────────────────────
  const {
    pan, setPan, zoom, setZoom, isPanning, dragging, multiDragging, canvasRef,
    isSpaceHeld, spaceHeld, handleDragStart, handleMultiDragStart, handleMouseMove, handleMouseUp, handleCanvasMouseDown,
  } = useCanvas(activeTool);

  const {
    screens, connections, documents, selectedScreen, setSelectedScreen,
    fileInputRef, addScreen, addScreenAtCenter, removeScreen, removeScreens, renameScreen, moveScreen, moveScreens,
    handleImageUpload, onFileChange, handlePaste, handleCanvasDrop,
    saveHotspot, deleteHotspot, deleteHotspots, moveHotspot, moveHotspotToScreen, resizeHotspot, updateScreenDimensions,
    updateScreenDescription, updateScreenNotes, updateScreenTbd, updateScreenRoles, updateScreenCodeRef, updateScreenCriteria, assignScreenImage, patchScreenImage, quickConnectHotspot,
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
    showShareModal, setShowShareModal,
    showParticipants, setShowParticipants,
    pendingRemoteStateRef, applyPendingRemoteState,
  } = useCollabSync({
    screens, connections, documents,
    featureBrief, taskLink, techStack,
    dataModels, stickyNotes, screenGroups,
    replaceAll, setFeatureBrief, setTaskLink, setTechStack,
    setDataModels, setStickyNotes, setScreenGroups,
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
  const {
    connectedFileName, saveStatus, isFileSystemSupported,
    openFile, saveAs, saveNow, disconnect,
  } = useFilePersistence(screens, connections, pan, zoom, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups);

  // ── File actions ───────────────────────────────────────────────────
  const { applyPayload, onOpen, onSaveAs, onNew } = useFileActions({
    screens, replaceAll, setPan, setZoom,
    setFeatureBrief, setTaskLink, setTechStack,
    setDataModels, setStickyNotes, setScreenGroups,
    setScopeRoot, openFile, saveAs, disconnect,
  });

  // ── Modal state ────────────────────────────────────────────────────────
  const [hotspotModal, setHotspotModal] = useState(null);
  const [connectionEditModal, setConnectionEditModal] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [groupContextMenu, setGroupContextMenu] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

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

  // Keep collab sync refs up to date
  hotspotInteractionRef.current = hotspotInteraction;

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
    setHotspotModal, setConnectionEditModal,
    quickConnectHotspot, addConnection, addToConditionalGroup,
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
  const { importConfirm, setImportConfirm, importFileRef, onExport, onImport, onImportFileChange, onImportReplace, onImportMerge } =
    useImportExport({ screens, connections, documents, dataModels, stickyNotes, screenGroups, pan, zoom, featureBrief, taskLink, techStack, replaceAll, mergeAll, setPan, setZoom, setStickyNotes, setScreenGroups });

  // ── Canvas drop (intercepts .drawd files, delegates images) ────────────────────────
  const onCanvasDrop = useCallback((e) => {
    e.preventDefault();
    const drawdFile = detectDrawdFile(e.dataTransfer.files);
    if (!drawdFile) {
      handleCanvasDrop(e);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const payload = importFlow(ev.target.result);
        if (screens.length === 0) {
          applyPayload(payload);
        } else {
          setImportConfirm(payload);
        }
      } catch (err) {
        alert(err.message);
      }
    };
    reader.readAsText(drawdFile);
  }, [screens.length, handleCanvasDrop, applyPayload, setImportConfirm]);

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
    canvasSelection, clearSelection, removeScreens, deleteStickyNote, addScreenGroup, screens,
    connections, deleteHotspot, deleteHotspots, deleteConnection, deleteConnectionGroup,
    selectedScreen, removeScreen,
    selectedStickyNote, setSelectedStickyNote,
    selectedScreenGroup, setSelectedScreenGroup, deleteScreenGroup,
    undo, redo, saveNow, isFileSystemSupported, onSaveAs, onExport, onOpen,
    setActiveTool,
    isReadOnly,
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
          collab={collab}
          editingConditionGroup={editingConditionGroup}
          updateConnection={updateConnection}
          setEditingConditionGroup={setEditingConditionGroup}
          groupContextMenu={groupContextMenu}
          setGroupContextMenu={setGroupContextMenu}
          handleImageUpload={handleImageUpload}
          addScreenAtCenter={addScreenAtCenter}
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
      />
    </div>
  );
}

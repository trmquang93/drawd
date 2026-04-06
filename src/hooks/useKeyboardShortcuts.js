import { useEffect } from "react";

export function useKeyboardShortcuts({
  // modal open state (used to block undo/delete when any modal is open)
  hotspotModal,
  onAddWireframe,
  connectionEditModal,
  renameModal,
  importConfirm,
  showInstructions,
  showDocuments,
  showShortcuts,
  setShowShortcuts,
  showParticipants,
  conditionalPrompt,
  editingConditionGroup,
  // interaction state
  connecting,
  cancelConnecting,
  hotspotInteraction,
  cancelHotspotInteraction,
  selectedConnection,
  setSelectedConnection,
  selectedHotspots,
  setSelectedHotspots,
  // canvas selection
  canvasSelection,
  clearSelection,
  removeScreens,
  deleteStickyNote,
  addScreenGroup,
  screens,
  // data & mutations
  connections,
  deleteHotspot,
  deleteHotspots,
  deleteConnection,
  deleteConnectionGroup,
  selectedScreen,
  removeScreen,
  selectedStickyNote,
  setSelectedStickyNote,
  selectedScreenGroup,
  setSelectedScreenGroup,
  deleteScreenGroup,
  // undo/redo
  undo,
  redo,
  // file actions
  saveNow,
  isFileSystemSupported,
  onSaveAs,
  onExport,
  onOpen,
  // tool mode
  setActiveTool,
  // templates
  onTemplates,
  // collaboration
  isReadOnly,
  canComment,
  // duplication
  duplicateSelection,
  setCanvasSelection,
  // select-all support
  stickyNotes,
  scopeScreenIds,
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      const anyModalOpen = !!(
        hotspotModal || connectionEditModal || renameModal || importConfirm ||
        showInstructions || showDocuments || conditionalPrompt || editingConditionGroup || showShortcuts ||
        showParticipants
      );

      // Toggle shortcuts panel with ?
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        setShowShortcuts((prev) => !prev);
        return;
      }

      // Tool switching: V = select, H = pan
      if ((e.key === "v" || e.key === "V") && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        setActiveTool("select");
        return;
      }
      if ((e.key === "h" || e.key === "H") && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        setActiveTool("pan");
        return;
      }

      // Switch to comment tool: C
      if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (!canComment) return;
        setActiveTool("comment");
        return;
      }

      // Open template browser: T
      if ((e.key === "t" || e.key === "T") && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (isReadOnly) return;
        onTemplates();
        return;
      }

      // Open wireframe designer: W
      if ((e.key === "w" || e.key === "W") && !e.metaKey && !e.ctrlKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (isReadOnly) return;
        onAddWireframe?.();
        return;
      }

      if (e.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (canvasSelection.length > 0) { clearSelection(); return; }
        if (selectedHotspots.length > 0) { setSelectedHotspots([]); return; }
        if (conditionalPrompt) return; // handled by ConditionalPrompt component
        if (editingConditionGroup) return; // handled by InlineConditionLabels
        if (hotspotInteraction?.mode === "conn-endpoint-drag") { cancelHotspotInteraction(); return; }
        if (connecting) cancelConnecting();
        if (hotspotInteraction) cancelHotspotInteraction();
        if (selectedConnection) setSelectedConnection(null);
        if (selectedStickyNote) setSelectedStickyNote(null);
        if (selectedScreenGroup) setSelectedScreenGroup(null);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (isReadOnly) return;
        // Batch canvas selection delete (screens + stickies)
        if (canvasSelection.length > 0) {
          e.preventDefault();
          const screenIds = canvasSelection.filter((i) => i.type === "screen").map((i) => i.id);
          const stickyIds = canvasSelection.filter((i) => i.type === "sticky").map((i) => i.id);
          if (screenIds.length > 0) removeScreens(screenIds);
          stickyIds.forEach((id) => deleteStickyNote(id));
          clearSelection();
          return;
        }
        // Batch hotspot delete
        if (selectedHotspots.length > 0) {
          e.preventDefault();
          const screenId = selectedHotspots[0].screenId;
          const ids = selectedHotspots.map((h) => h.hotspotId);
          deleteHotspots(screenId, ids);
          setSelectedHotspots([]);
          return;
        }
        // Single selected hotspot delete
        if (hotspotInteraction?.mode === "selected") {
          e.preventDefault();
          deleteHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId);
          cancelHotspotInteraction();
          return;
        }
        if (selectedConnection) {
          e.preventDefault();
          const selConn = connections.find((c) => c.id === selectedConnection);
          if (selConn?.conditionGroupId) {
            deleteConnectionGroup(selConn.conditionGroupId);
          } else {
            deleteConnection(selectedConnection);
          }
          setSelectedConnection(null);
          return;
        }
        if (selectedStickyNote) {
          e.preventDefault();
          deleteStickyNote(selectedStickyNote);
          setSelectedStickyNote(null);
          return;
        }
        if (selectedScreenGroup) {
          e.preventDefault();
          deleteScreenGroup(selectedScreenGroup);
          setSelectedScreenGroup(null);
          return;
        }
        if (selectedScreen) {
          e.preventDefault();
          removeScreen(selectedScreen);
        }
      }

      // Select all (Cmd+A)
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (isReadOnly) return;
        e.preventDefault();
        const filteredScreens = scopeScreenIds
          ? screens.filter((s) => scopeScreenIds.has(s.id))
          : screens;
        const screenItems = filteredScreens.map((s) => ({ type: "screen", id: s.id }));
        const stickyItems = (stickyNotes || []).map((n) => ({ type: "sticky", id: n.id }));
        setCanvasSelection([...screenItems, ...stickyItems]);
        return;
      }

      // Group selected screens (Cmd+G)
      if ((e.metaKey || e.ctrlKey) && e.key === "g") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (canvasSelection.length === 0) return;
        e.preventDefault();
        const selectedScreenIds = canvasSelection.filter((i) => i.type === "screen").map((i) => i.id);
        if (selectedScreenIds.length > 0 && addScreenGroup) {
          addScreenGroup("Group", selectedScreenIds);
          clearSelection();
        }
        return;
      }

      // Duplicate selection (Cmd+D)
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (isReadOnly) return;
        e.preventDefault();
        const screenIds = canvasSelection.filter((i) => i.type === "screen").map((i) => i.id);
        if (screenIds.length === 0) return;
        const newIds = duplicateSelection(screenIds);
        setCanvasSelection(newIds.map((id) => ({ type: "screen", id })));
        return;
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
        if (anyModalOpen) return;
        if (isReadOnly) return;
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        if (isReadOnly) return;
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    connecting, cancelConnecting, hotspotInteraction, cancelHotspotInteraction,
    selectedConnection, setSelectedConnection, connections, deleteConnection, deleteConnectionGroup,
    selectedScreen, removeScreen, hotspotModal, connectionEditModal, renameModal, importConfirm,
    showInstructions, showDocuments, showShortcuts, setShowShortcuts, showParticipants, undo, redo,
    saveNow, isFileSystemSupported, onSaveAs, onExport, onOpen,
    conditionalPrompt, editingConditionGroup, selectedHotspots, setSelectedHotspots, deleteHotspots,
    deleteHotspot, selectedStickyNote, setSelectedStickyNote, deleteStickyNote,
    selectedScreenGroup, setSelectedScreenGroup, deleteScreenGroup,
    setActiveTool, canvasSelection, clearSelection, removeScreens, addScreenGroup, screens,
    onTemplates, isReadOnly, canComment, duplicateSelection, setCanvasSelection, onAddWireframe,
    stickyNotes, scopeScreenIds,
  ]);
}

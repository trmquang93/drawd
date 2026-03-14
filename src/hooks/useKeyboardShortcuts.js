import { useEffect } from "react";

export function useKeyboardShortcuts({
  // modal open state (used to block undo/delete when any modal is open)
  hotspotModal,
  connectionEditModal,
  renameModal,
  importConfirm,
  showInstructions,
  showDocuments,
  showShortcuts,
  setShowShortcuts,
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
  // data & mutations
  connections,
  deleteHotspots,
  deleteConnection,
  deleteConnectionGroup,
  selectedScreen,
  removeScreen,
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
}) {
  useEffect(() => {
    const onKeyDown = (e) => {
      const anyModalOpen = !!(
        hotspotModal || connectionEditModal || renameModal || importConfirm ||
        showInstructions || showDocuments || conditionalPrompt || editingConditionGroup || showShortcuts
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

      if (e.key === "Escape") {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (selectedHotspots.length > 0) { setSelectedHotspots([]); return; }
        if (conditionalPrompt) return; // handled by ConditionalPrompt component
        if (editingConditionGroup) return; // handled by InlineConditionLabels
        if (hotspotInteraction?.mode === "conn-endpoint-drag") { cancelHotspotInteraction(); return; }
        if (connecting) cancelConnecting();
        if (hotspotInteraction) cancelHotspotInteraction();
        if (selectedConnection) setSelectedConnection(null);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
        // Batch hotspot delete
        if (selectedHotspots.length > 0) {
          e.preventDefault();
          const screenId = selectedHotspots[0].screenId;
          const ids = selectedHotspots.map((h) => h.hotspotId);
          deleteHotspots(screenId, ids);
          setSelectedHotspots([]);
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
        if (anyModalOpen) return;
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (anyModalOpen) return;
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
    showInstructions, showDocuments, showShortcuts, setShowShortcuts, undo, redo,
    saveNow, isFileSystemSupported, onSaveAs, onExport, onOpen,
    conditionalPrompt, editingConditionGroup, selectedHotspots, setSelectedHotspots, deleteHotspots,
    setActiveTool,
  ]);
}

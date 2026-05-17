import { useCallback } from "react";

export function useFileActions({
  screens, connections, documents,
  replaceAll, pushHistory,
  setPan, setZoom,
  setFeatureBrief, setTaskLink, setTechStack,
  setDataModels, setStickyNotes, setScreenGroups, setComments,
  setScopeRoot, openFile, saveAs, disconnect,
}) {
  const applyPayload = useCallback((payload, { source } = {}) => {
    const isMcp = source === 'mcp';
    if (isMcp) {
      pushHistory(screens, connections, documents);
    }
    const opts = isMcp ? { preserveHistory: true, preserveSelection: true } : {};
    replaceAll(payload.screens, payload.connections, payload.screens.length + 1, payload.documents || [], opts);
    // Preserve the user's current viewport during MCP-driven reloads
    if (!isMcp && payload.viewport) { setPan(payload.viewport.pan); setZoom(payload.viewport.zoom); }
    setFeatureBrief(payload.metadata?.featureBrief || "");
    setTaskLink(payload.metadata?.taskLink || "");
    setTechStack(payload.metadata?.techStack || {});
    setDataModels(payload.dataModels || []);
    setStickyNotes(payload.stickyNotes || []);
    setScreenGroups(payload.screenGroups || []);
    setComments(payload.comments || []);
    if (!isMcp) setScopeRoot(null);
  }, [replaceAll, pushHistory, screens, connections, documents, setPan, setZoom, setFeatureBrief, setTaskLink, setTechStack, setDataModels, setStickyNotes, setScreenGroups, setComments, setScopeRoot]);

  const onOpen = useCallback(async () => {
    try {
      const payload = await openFile();
      if (!payload) return;
      applyPayload(payload);
    } catch (err) { alert(err.message); }
  }, [openFile, applyPayload]);

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
    setComments([]);
    setScopeRoot(null);
    disconnect();
  }, [screens.length, replaceAll, setPan, setZoom, setFeatureBrief, setTaskLink, setTechStack, setDataModels, setStickyNotes, setScreenGroups, setComments, setScopeRoot, disconnect]);

  return { applyPayload, onOpen, onSaveAs, onNew };
}

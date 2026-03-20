import { useCallback } from "react";

export function useFileActions({
  screens, replaceAll, setPan, setZoom,
  setFeatureBrief, setTaskLink, setTechStack,
  setDataModels, setStickyNotes, setScreenGroups,
  setScopeRoot, openFile, saveAs, disconnect,
}) {
  const applyPayload = useCallback((payload) => {
    replaceAll(payload.screens, payload.connections, payload.screens.length + 1, payload.documents || []);
    if (payload.viewport) { setPan(payload.viewport.pan); setZoom(payload.viewport.zoom); }
    setFeatureBrief(payload.metadata?.featureBrief || "");
    setTaskLink(payload.metadata?.taskLink || "");
    setTechStack(payload.metadata?.techStack || {});
    setDataModels(payload.dataModels || []);
    setStickyNotes(payload.stickyNotes || []);
    setScreenGroups(payload.screenGroups || []);
    setScopeRoot(null);
  }, [replaceAll, setPan, setZoom, setFeatureBrief, setTaskLink, setTechStack, setDataModels, setStickyNotes, setScreenGroups, setScopeRoot]);

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
    setScopeRoot(null);
    disconnect();
  }, [screens.length, replaceAll, setPan, setZoom, setFeatureBrief, setTaskLink, setTechStack, setDataModels, setStickyNotes, setScreenGroups, setScopeRoot, disconnect]);

  return { applyPayload, onOpen, onSaveAs, onNew };
}

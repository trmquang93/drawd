import { useState, useRef, useCallback } from "react";
import { exportFlow } from "../utils/exportFlow";
import { importFlow } from "../utils/importFlow";
import { mergeFlow } from "../utils/mergeFlow";

export function useImportExport({
  screens,
  connections,
  documents,
  dataModels,
  stickyNotes,
  screenGroups,
  comments,
  pan,
  zoom,
  featureBrief,
  taskLink,
  techStack,
  replaceAll,
  mergeAll,
  setPan,
  setZoom,
  setStickyNotes,
  setScreenGroups,
  setComments,
}) {
  const [importConfirm, setImportConfirm] = useState(null);
  const importFileRef = useRef(null);

  const onExport = useCallback(() => {
    exportFlow(screens, connections, pan, zoom, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes || [], screenGroups || [], comments || []);
  }, [screens, connections, documents, dataModels, stickyNotes, screenGroups, comments, pan, zoom, featureBrief, taskLink, techStack]);

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
    replaceAll(
      importConfirm.screens,
      importConfirm.connections,
      importConfirm.screens.length + 1,
      importConfirm.documents || []
    );
    if (importConfirm.viewport) {
      setPan(importConfirm.viewport.pan);
      setZoom(importConfirm.viewport.zoom);
    }
    setStickyNotes?.(importConfirm.stickyNotes || []);
    setScreenGroups?.(importConfirm.screenGroups || []);
    setComments?.(importConfirm.comments || []);
    setImportConfirm(null);
  }, [importConfirm, replaceAll, setPan, setZoom, setStickyNotes, setScreenGroups, setComments]);

  const onImportMerge = useCallback(() => {
    if (!importConfirm) return;
    const { screens: newScreens, connections: newConns, documents: newDocs } = mergeFlow(
      importConfirm.screens, importConfirm.connections, screens, importConfirm.documents || []
    );
    mergeAll(newScreens, newConns, newDocs);
    setImportConfirm(null);
  }, [importConfirm, screens, mergeAll]);

  return {
    importConfirm, setImportConfirm,
    importFileRef,
    onExport,
    onImport,
    onImportFileChange,
    onImportReplace,
    onImportMerge,
  };
}

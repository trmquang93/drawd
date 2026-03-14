import { useState, useRef, useEffect, useCallback } from "react";
import { buildPayload } from "../utils/buildPayload";
import { importFlow } from "../utils/importFlow";

const isFileSystemSupported = typeof window !== "undefined" && "showOpenFilePicker" in window;

const DRAWD_FILE_TYPES = [
  {
    description: "Drawd files",
    accept: { "application/json": [".drawd", ".flowforge"] },
  },
];

export function useFilePersistence(screens, connections, pan, zoom, documents = [], featureBrief = "", taskLink = "", techStack = {}, dataModels = [], stickyNotes = [], screenGroups = []) {
  const fileHandleRef = useRef(null);
  const [connectedFileName, setConnectedFileName] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const featureBriefRef = useRef(featureBrief);
  const taskLinkRef = useRef(taskLink);
  const techStackRef = useRef(techStack);
  const skipNextSaveRef = useRef(false);
  const debounceRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  // Keep viewport and metadata refs in sync without triggering auto-save
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { featureBriefRef.current = featureBrief; }, [featureBrief]);
  useEffect(() => { taskLinkRef.current = taskLink; }, [taskLink]);
  useEffect(() => { techStackRef.current = techStack; }, [techStack]);

  const writeToDisk = useCallback(async () => {
    const handle = fileHandleRef.current;
    if (!handle) return;

    setSaveStatus("saving");
    try {
      const payload = buildPayload(screens, connections, panRef.current, zoomRef.current, documents, featureBriefRef.current, taskLinkRef.current, techStackRef.current, dataModels, stickyNotes, screenGroups);
      const json = JSON.stringify(payload, null, 2);
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      setSaveStatus("saved");
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Auto-save failed:", err);
      setSaveStatus("error");
      fileHandleRef.current = null;
      setConnectedFileName(null);
    }
  }, [screens, connections, documents, dataModels]);

  // Auto-save when screens, connections, or documents change
  useEffect(() => {
    if (!fileHandleRef.current) return;
    if (screens.length === 0) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      writeToDisk();
    }, 1500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [screens, connections, documents, writeToDisk]);

  const openFile = useCallback(async () => {
    if (!isFileSystemSupported) return null;
    try {
      const [handle] = await window.showOpenFilePicker({
        types: DRAWD_FILE_TYPES,
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      const payload = importFlow(text);

      fileHandleRef.current = handle;
      setConnectedFileName(file.name);
      setSaveStatus("idle");
      skipNextSaveRef.current = true;

      return payload;
    } catch (err) {
      if (err.name === "AbortError") return null;
      throw err;
    }
  }, []);

  const saveAs = useCallback(async () => {
    if (!isFileSystemSupported) return;
    try {
      const handle = await window.showSaveFilePicker({
        types: DRAWD_FILE_TYPES,
        suggestedName: "flow-export.drawd",
      });

      fileHandleRef.current = handle;
      setConnectedFileName(handle.name);
      skipNextSaveRef.current = false;

      // Write immediately
      const payload = buildPayload(screens, connections, panRef.current, zoomRef.current, documents, featureBriefRef.current, taskLinkRef.current, techStackRef.current, dataModels, stickyNotes, screenGroups);
      const json = JSON.stringify(payload, null, 2);
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      setSaveStatus("saved");
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Save As failed:", err);
      setSaveStatus("error");
    }
  }, [screens, connections, documents]);

  const disconnect = useCallback(() => {
    fileHandleRef.current = null;
    setConnectedFileName(null);
    setSaveStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
  }, []);

  const saveNow = useCallback(async () => {
    if (!fileHandleRef.current) return false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    await writeToDisk();
    return true;
  }, [writeToDisk]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  return {
    connectedFileName,
    saveStatus,
    isFileSystemSupported,
    openFile,
    saveAs,
    saveNow,
    disconnect,
  };
}

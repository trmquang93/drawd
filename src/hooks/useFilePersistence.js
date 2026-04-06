import { useState, useRef, useEffect, useCallback } from "react";
import { buildPayload } from "../utils/buildPayload";
import { importFlow } from "../utils/importFlow";
import { FILE_EXTENSION, LEGACY_FILE_EXTENSION, DEFAULT_EXPORT_FILENAME, AUTOSAVE_DEBOUNCE_MS, FILE_POLL_INTERVAL_MS, SAVE_STATUS_RESET_MS } from "../constants";

const isFileSystemSupported = typeof window !== "undefined" && "showOpenFilePicker" in window;

const DRAWD_FILE_TYPES = [
  {
    description: "Drawd files",
    accept: { "application/json": [FILE_EXTENSION, LEGACY_FILE_EXTENSION] },
  },
];

export function useFilePersistence(screens, connections, pan, zoom, documents = [], featureBrief = "", taskLink = "", techStack = {}, dataModels = [], stickyNotes = [], screenGroups = [], comments = [], onExternalChange) {
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
  const lastKnownModifiedRef = useRef(0);
  const isWritingRef = useRef(false);
  const isPollingRef = useRef(false);
  const onExternalChangeRef = useRef(onExternalChange);

  // Keep viewport and metadata refs in sync without triggering auto-save
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { featureBriefRef.current = featureBrief; }, [featureBrief]);
  useEffect(() => { taskLinkRef.current = taskLink; }, [taskLink]);
  useEffect(() => { techStackRef.current = techStack; }, [techStack]);

  // Keep callback ref up to date without restarting the polling interval
  useEffect(() => { onExternalChangeRef.current = onExternalChange; }, [onExternalChange]);

  const writeToDisk = useCallback(async () => {
    const handle = fileHandleRef.current;
    if (!handle) return;

    isWritingRef.current = true;
    setSaveStatus("saving");
    try {
      const payload = buildPayload(screens, connections, panRef.current, zoomRef.current, documents, featureBriefRef.current, taskLinkRef.current, techStackRef.current, dataModels, stickyNotes, screenGroups, comments);
      const json = JSON.stringify(payload, null, 2);
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      // Capture the new lastModified so the poller knows this write is ours
      const updated = await handle.getFile();
      lastKnownModifiedRef.current = updated.lastModified;

      setSaveStatus("saved");
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), SAVE_STATUS_RESET_MS);
      window.dispatchEvent(new CustomEvent("drawd:file_saved"));
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Auto-save failed:", err);
      setSaveStatus("error");
      fileHandleRef.current = null;
      setConnectedFileName(null);
    } finally {
      isWritingRef.current = false;
    }
  }, [screens, connections, documents, dataModels, stickyNotes, screenGroups, comments]);

  // Auto-save when screens, connections, documents, or comments change
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
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [screens, connections, documents, writeToDisk]);

  // Poll for external file changes (e.g. from MCP server)
  useEffect(() => {
    if (!connectedFileName) return;

    const intervalId = setInterval(async () => {
      const handle = fileHandleRef.current;
      if (!handle || isPollingRef.current || isWritingRef.current) return;

      isPollingRef.current = true;
      try {
        const file = await handle.getFile();
        if (file.lastModified !== lastKnownModifiedRef.current && lastKnownModifiedRef.current !== 0) {
          const text = await file.text();
          const payload = importFlow(text);
          lastKnownModifiedRef.current = file.lastModified;
          skipNextSaveRef.current = true;
          onExternalChangeRef.current?.(payload, { source: 'mcp' });
        }
      } catch (err) {
        console.warn("File poll failed:", err);
      } finally {
        isPollingRef.current = false;
      }
    }, FILE_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [connectedFileName]);

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
      lastKnownModifiedRef.current = file.lastModified;
      setConnectedFileName(file.name);
      setSaveStatus("idle");
      skipNextSaveRef.current = true;
      window.dispatchEvent(new CustomEvent("drawd:file_opened"));

      return payload;
    } catch (err) {
      if (err.name === "AbortError") return null;
      throw err;
    }
  }, []);

  const saveAs = useCallback(async () => {
    if (!isFileSystemSupported) return;
    isWritingRef.current = true;
    try {
      const handle = await window.showSaveFilePicker({
        types: DRAWD_FILE_TYPES,
        suggestedName: `${DEFAULT_EXPORT_FILENAME}${FILE_EXTENSION}`,
      });

      fileHandleRef.current = handle;
      setConnectedFileName(handle.name);
      skipNextSaveRef.current = false;

      // Write immediately
      const payload = buildPayload(screens, connections, panRef.current, zoomRef.current, documents, featureBriefRef.current, taskLinkRef.current, techStackRef.current, dataModels, stickyNotes, screenGroups, comments);
      const json = JSON.stringify(payload, null, 2);
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();

      // Capture the new lastModified so the poller knows this write is ours
      const updated = await handle.getFile();
      lastKnownModifiedRef.current = updated.lastModified;

      setSaveStatus("saved");
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setSaveStatus("idle"), SAVE_STATUS_RESET_MS);
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Save As failed:", err);
      setSaveStatus("error");
    } finally {
      isWritingRef.current = false;
    }
  }, [screens, connections, documents, dataModels, stickyNotes, screenGroups, comments]);

  const disconnect = useCallback(() => {
    fileHandleRef.current = null;
    lastKnownModifiedRef.current = 0;
    setConnectedFileName(null);
    setSaveStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
  }, []);

  const connectHandle = useCallback(async (handle) => {
    const file = await handle.getFile();
    fileHandleRef.current = handle;
    lastKnownModifiedRef.current = file.lastModified;
    setConnectedFileName(file.name);
    setSaveStatus("idle");
    skipNextSaveRef.current = true;
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
    connectHandle,
    disconnect,
  };
}

import { useState, useCallback } from "react";
import { generateId } from "../utils/generateId";
import { DEFAULT_SCREEN_WIDTH } from "../constants";

export function useStickyNotes() {
  const [stickyNotes, setStickyNotes] = useState([]);
  const [selectedStickyNote, setSelectedStickyNote] = useState(null);

  const addStickyNote = useCallback((x, y) => {
    const note = { id: generateId(), x, y, width: DEFAULT_SCREEN_WIDTH, content: "", color: "yellow", author: "" };
    setStickyNotes((prev) => [...prev, note]);
  }, []);

  const updateStickyNote = useCallback((id, patch) => {
    setStickyNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...patch } : n));
  }, []);

  const deleteStickyNote = useCallback((id) => {
    setStickyNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return {
    stickyNotes, setStickyNotes,
    selectedStickyNote, setSelectedStickyNote,
    addStickyNote, updateStickyNote, deleteStickyNote,
  };
}

import { useState, useCallback } from "react";
import { generateId } from "../utils/generateId";
import { COLORS } from "../styles/theme";

export function useScreenGroups() {
  const [screenGroups, setScreenGroups] = useState([]);
  const [selectedScreenGroup, setSelectedScreenGroup] = useState(null);

  const addScreenGroup = useCallback((name, screenIds = [], color = COLORS.accent008) => {
    const group = { id: generateId(), name, screenIds, color, folderHint: "" };
    setScreenGroups((prev) => [...prev, group]);
    return group.id;
  }, []);

  const updateScreenGroup = useCallback((id, patch) => {
    setScreenGroups((prev) => prev.map((g) => g.id === id ? { ...g, ...patch } : g));
  }, []);

  const deleteScreenGroup = useCallback((id) => {
    setScreenGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addScreenToGroup = useCallback((groupId, screenId) => {
    setScreenGroups((prev) => prev.map((g) =>
      g.id === groupId && !g.screenIds.includes(screenId)
        ? { ...g, screenIds: [...g.screenIds, screenId] }
        : g
    ));
  }, []);

  const removeScreenFromGroup = useCallback((screenId) => {
    setScreenGroups((prev) => prev.map((g) => ({
      ...g,
      screenIds: g.screenIds.filter((id) => id !== screenId),
    })));
  }, []);

  return {
    screenGroups, setScreenGroups,
    selectedScreenGroup, setSelectedScreenGroup,
    addScreenGroup, updateScreenGroup, deleteScreenGroup,
    addScreenToGroup, removeScreenFromGroup,
  };
}

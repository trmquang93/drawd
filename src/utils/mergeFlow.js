import { generateId } from "./generateId";
import { MERGE_GAP } from "../constants";

export function mergeFlow(importedScreens, importedConnections, existingScreens, importedDocuments = []) {
  const maxX = existingScreens.length > 0
    ? Math.max(...existingScreens.map((s) => s.x + s.width))
    : 0;
  const offsetX = existingScreens.length > 0 ? maxX + MERGE_GAP : 0;

  const screenIdMap = {};
  const hotspotIdMap = {};
  const stateGroupMap = {};
  const documentIdMap = {};
  const conditionGroupMap = {};

  // Remap document IDs
  const newDocuments = importedDocuments.map((doc) => {
    const newId = generateId();
    documentIdMap[doc.id] = newId;
    return { ...doc, id: newId };
  });

  const newScreens = importedScreens.map((screen) => {
    const newScreenId = generateId();
    screenIdMap[screen.id] = newScreenId;

    const newHotspots = screen.hotspots.map((hs) => {
      const newHsId = generateId();
      hotspotIdMap[hs.id] = newHsId;
      return { ...hs, id: newHsId };
    });

    // Remap stateGroup IDs
    let newStateGroup = screen.stateGroup;
    if (newStateGroup) {
      if (!stateGroupMap[newStateGroup]) {
        stateGroupMap[newStateGroup] = generateId();
      }
      newStateGroup = stateGroupMap[newStateGroup];
    }

    return {
      ...screen,
      id: newScreenId,
      x: screen.x + offsetX,
      hotspots: newHotspots,
      stateGroup: newStateGroup,
    };
  });

  // Remap targetScreenId, documentId, and conditions in hotspots
  newScreens.forEach((screen) => {
    screen.hotspots = screen.hotspots.map((hs) => ({
      ...hs,
      targetScreenId: hs.targetScreenId
        ? screenIdMap[hs.targetScreenId] || hs.targetScreenId
        : hs.targetScreenId,
      documentId: hs.documentId
        ? documentIdMap[hs.documentId] || hs.documentId
        : hs.documentId,
      conditions: (hs.conditions || []).map((cond) => ({
        ...cond,
        id: generateId(),
        targetScreenId: cond.targetScreenId
          ? screenIdMap[cond.targetScreenId] || cond.targetScreenId
          : cond.targetScreenId,
      })),
    }));
  });

  const newConnections = importedConnections.map((conn) => {
    let newCondGroupId = conn.conditionGroupId || null;
    if (newCondGroupId) {
      if (!conditionGroupMap[newCondGroupId]) conditionGroupMap[newCondGroupId] = generateId();
      newCondGroupId = conditionGroupMap[newCondGroupId];
    }
    return {
      ...conn,
      id: generateId(),
      fromScreenId: screenIdMap[conn.fromScreenId] || conn.fromScreenId,
      toScreenId: screenIdMap[conn.toScreenId] || conn.toScreenId,
      hotspotId: hotspotIdMap[conn.hotspotId] || conn.hotspotId,
      conditionGroupId: newCondGroupId,
    };
  });

  return { screens: newScreens, connections: newConnections, documents: newDocuments };
}

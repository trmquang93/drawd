import { generateId } from "./generateId";

export function mergeFlow(importedScreens, importedConnections, existingScreens) {
  const maxX = existingScreens.length > 0
    ? Math.max(...existingScreens.map((s) => s.x + s.width))
    : 0;
  const offsetX = existingScreens.length > 0 ? maxX + 300 : 0;

  const screenIdMap = {};
  const hotspotIdMap = {};

  const newScreens = importedScreens.map((screen) => {
    const newScreenId = generateId();
    screenIdMap[screen.id] = newScreenId;

    const newHotspots = screen.hotspots.map((hs) => {
      const newHsId = generateId();
      hotspotIdMap[hs.id] = newHsId;
      return { ...hs, id: newHsId };
    });

    return {
      ...screen,
      id: newScreenId,
      x: screen.x + offsetX,
      hotspots: newHotspots,
    };
  });

  // Remap targetScreenId in hotspots
  newScreens.forEach((screen) => {
    screen.hotspots = screen.hotspots.map((hs) => ({
      ...hs,
      targetScreenId: hs.targetScreenId
        ? screenIdMap[hs.targetScreenId] || hs.targetScreenId
        : hs.targetScreenId,
    }));
  });

  const newConnections = importedConnections.map((conn) => ({
    ...conn,
    id: generateId(),
    fromScreenId: screenIdMap[conn.fromScreenId] || conn.fromScreenId,
    toScreenId: screenIdMap[conn.toScreenId] || conn.toScreenId,
    hotspotId: hotspotIdMap[conn.hotspotId] || conn.hotspotId,
  }));

  return { screens: newScreens, connections: newConnections };
}

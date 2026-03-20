import { DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT } from "../constants";

export function useDerivedCanvasState({ connecting, hotspotInteraction, screens }) {
  const previewLine = connecting
    ? { fromScreenId: connecting.fromScreenId, toX: connecting.mouseX, toY: connecting.mouseY }
    : null;

  const hotspotPreviewLine = hotspotInteraction?.mode === "hotspot-drag"
    ? { fromScreenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId, toX: hotspotInteraction.mouseX, toY: hotspotInteraction.mouseY }
    : null;

  const endpointDragPreview = hotspotInteraction?.mode === "conn-endpoint-drag"
    ? { connectionId: hotspotInteraction.connectionId, endpoint: hotspotInteraction.endpoint, mouseX: hotspotInteraction.mouseX, mouseY: hotspotInteraction.mouseY }
    : null;

  const selectedHotspotId = hotspotInteraction?.hotspotId || null;
  const drawRect = hotspotInteraction?.mode === "draw" ? hotspotInteraction.drawRect : null;

  const repositionGhost = (() => {
    if (hotspotInteraction?.mode !== "reposition" || hotspotInteraction.worldX == null) return null;
    const srcScreen = screens.find((s) => s.id === hotspotInteraction.screenId);
    if (!srcScreen) return null;
    const hs = srcScreen.hotspots.find((h) => h.id === hotspotInteraction.hotspotId);
    if (!hs) return null;
    const pixelW = (hs.w / 100) * (srcScreen.width || DEFAULT_SCREEN_WIDTH);
    const pixelH = (hs.h / 100) * (srcScreen.imageHeight || DEFAULT_SCREEN_HEIGHT);
    return {
      x: hotspotInteraction.worldX - pixelW / 2,
      y: hotspotInteraction.worldY - pixelH / 2,
      width: pixelW,
      height: pixelH,
    };
  })();

  return { previewLine, hotspotPreviewLine, endpointDragPreview, selectedHotspotId, drawRect, repositionGhost };
}

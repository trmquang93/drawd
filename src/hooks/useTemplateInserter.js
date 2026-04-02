import { useCallback } from "react";
import { mergeFlowAtPosition } from "../utils/mergeFlowAtPosition";
import { VIEWPORT_FALLBACK_WIDTH, VIEWPORT_FALLBACK_HEIGHT } from "../constants";

export function useTemplateInserter({ screens, mergeAll, replaceAll, pan, zoom, canvasRef }) {
  const insertTemplate = useCallback(async (templateData) => {
    const { screens: tplScreens, connections: tplConnections, documents: tplDocuments = [] } = templateData;

    // Compute viewport center in canvas coordinates
    const el = canvasRef?.current;
    const vw = el ? el.clientWidth : VIEWPORT_FALLBACK_WIDTH;
    const vh = el ? el.clientHeight : VIEWPORT_FALLBACK_HEIGHT;
    const centerX = (-pan.x + vw / 2) / zoom;
    const centerY = (-pan.y + vh / 2) / zoom;

    const result = mergeFlowAtPosition(tplScreens, tplConnections, tplDocuments, centerX, centerY);

    if (screens.length === 0) {
      replaceAll(result.screens, result.connections, result.screens.length, result.documents);
    } else {
      mergeAll(result.screens, result.connections, result.documents);
    }
  }, [screens.length, mergeAll, replaceAll, pan, zoom, canvasRef]);

  return { insertTemplate };
}

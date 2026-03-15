import { useState, useCallback } from "react";
import { rectsIntersect, screenBounds, stickyBounds } from "../utils/canvasMath";
import { HEADER_HEIGHT } from "../constants";

export function useCanvasSelection() {
  // Array of { type: "screen" | "sticky", id: string }
  const [canvasSelection, setCanvasSelection] = useState([]);

  // null | { startX, startY, currentX, currentY } in world coords
  const [rubberBand, setRubberBand] = useState(null);

  const toggleSelection = useCallback((type, id) => {
    setCanvasSelection((prev) => {
      const idx = prev.findIndex((item) => item.type === type && item.id === id);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, { type, id }];
    });
  }, []);

  const clearSelection = useCallback(() => {
    setCanvasSelection([]);
  }, []);

  const startRubberBand = useCallback((worldX, worldY) => {
    setRubberBand({ startX: worldX, startY: worldY, currentX: worldX, currentY: worldY });
  }, []);

  const updateRubberBand = useCallback((worldX, worldY) => {
    setRubberBand((prev) => (prev ? { ...prev, currentX: worldX, currentY: worldY } : null));
  }, []);

  // Computes rect-rect hits, updates canvasSelection, clears rubberBand, returns selected items.
  const completeRubberBand = useCallback((screens, stickyNotes, currentRubberBand) => {
    if (!currentRubberBand) return [];

    const rect = {
      x: Math.min(currentRubberBand.startX, currentRubberBand.currentX),
      y: Math.min(currentRubberBand.startY, currentRubberBand.currentY),
      width: Math.abs(currentRubberBand.currentX - currentRubberBand.startX),
      height: Math.abs(currentRubberBand.currentY - currentRubberBand.startY),
    };

    const selected = [];

    (screens || []).forEach((screen) => {
      if (rectsIntersect(rect, screenBounds(screen, HEADER_HEIGHT))) {
        selected.push({ type: "screen", id: screen.id });
      }
    });

    (stickyNotes || []).forEach((note) => {
      if (rectsIntersect(rect, stickyBounds(note))) {
        selected.push({ type: "sticky", id: note.id });
      }
    });

    setRubberBand(null);
    return selected;
  }, []);

  // Derived: {x, y, width, height} in world coords, or null
  const rubberBandRect = rubberBand
    ? {
        x: Math.min(rubberBand.startX, rubberBand.currentX),
        y: Math.min(rubberBand.startY, rubberBand.currentY),
        width: Math.abs(rubberBand.currentX - rubberBand.startX),
        height: Math.abs(rubberBand.currentY - rubberBand.startY),
      }
    : null;

  return {
    canvasSelection,
    setCanvasSelection,
    rubberBand,
    rubberBandRect,
    toggleSelection,
    clearSelection,
    startRubberBand,
    updateRubberBand,
    completeRubberBand,
  };
}

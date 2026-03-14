import { useCallback } from "react";
import { computeDrawRect, computeRepositionDelta, computeResize, hitTestScreen } from "../utils/canvasMath.js";
import { HEADER_HEIGHT } from "../constants";
const resizeCursors = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize",
  se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize",
};

export function useCanvasMouseHandlers({
  // hotspot interaction
  hotspotInteraction,
  setHotspotInteraction,
  commitDragSnapshot,
  screens,
  moveHotspot,
  resizeHotspot,
  updateConnection,
  // connection interaction
  connecting,
  setConnecting,
  cancelConnecting,
  selectedConnection,
  setSelectedConnection,
  conditionalPrompt,
  onConditionalPromptCancel,
  editingConditionGroup,
  setEditingConditionGroup,
  selectedHotspots,
  setSelectedHotspots,
  // canvas hook
  handleCanvasMouseDown,
  handleMouseMove,
  handleMouseUp,
  isSpaceHeld,
  spaceHeld,
  isPanning,
  dragging,
  // screen management
  setSelectedScreen,
  moveScreen,
  // viewport
  pan,
  zoom,
  canvasRef,
  // tool mode
  activeTool,
}) {
  const onCanvasMouseDown = useCallback((e) => {
    // Pan tool: always pan, skip all other interactions
    if (activeTool === "pan") {
      if (selectedConnection) setSelectedConnection(null);
      if (selectedHotspots.length > 0) setSelectedHotspots([]);
      if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
        setHotspotInteraction(null);
      }
      handleCanvasMouseDown(e);
      setSelectedScreen(null);
      return;
    }
    // Space+click: always pan, skip all interaction guards
    if (isSpaceHeld.current) {
      if (selectedConnection) setSelectedConnection(null);
      if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
        setHotspotInteraction(null);
      }
      handleCanvasMouseDown(e);
      return;
    }
    // Dismiss conditional prompt on canvas click (add normal connection)
    if (conditionalPrompt) {
      onConditionalPromptCancel();
      return;
    }
    // Dismiss inline condition label editing
    if (editingConditionGroup) setEditingConditionGroup(null);
    // Clear selected connection on canvas click
    if (selectedConnection) setSelectedConnection(null);
    // Clear batch hotspot selection
    if (selectedHotspots.length > 0) setSelectedHotspots([]);
    // Cancel hotspot interaction on canvas click
    if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
      setHotspotInteraction(null);
    }
    if (connecting) {
      if (connecting.mode === "click") cancelConnecting();
      return;
    }
    if (hotspotInteraction?.mode === "draw" || hotspotInteraction?.mode === "reposition" || hotspotInteraction?.mode === "hotspot-drag" || hotspotInteraction?.mode === "resize" || hotspotInteraction?.mode === "conn-endpoint-drag") {
      return;
    }
    const wasPan = handleCanvasMouseDown(e);
    if (wasPan) setSelectedScreen(null);
  }, [handleCanvasMouseDown, setSelectedScreen, connecting, cancelConnecting, hotspotInteraction, setHotspotInteraction, selectedConnection, setSelectedConnection, isSpaceHeld, conditionalPrompt, onConditionalPromptCancel, editingConditionGroup, setEditingConditionGroup, selectedHotspots, setSelectedHotspots, activeTool]);

  const onCanvasMouseMove = useCallback((e) => {
    if (hotspotInteraction?.mode === "draw") {
      const { imageAreaRect } = hotspotInteraction;
      if (!imageAreaRect) return;

      const rect = computeDrawRect(
        { x: hotspotInteraction.drawStart.clientX, y: hotspotInteraction.drawStart.clientY },
        { x: e.clientX, y: e.clientY },
        imageAreaRect,
      );

      setHotspotInteraction((prev) => ({
        ...prev,
        drawRect: { screenId: hotspotInteraction.screenId, ...rect },
      }));
      return;
    }

    if (hotspotInteraction?.mode === "reposition") {
      const screen = screens.find((s) => s.id === hotspotInteraction.screenId);
      if (!screen || !screen.imageHeight) return;
      const screenW = screen.width || 220;
      const hs = screen.hotspots.find((h) => h.id === hotspotInteraction.hotspotId);
      if (!hs) return;

      const { x: newX, y: newY } = computeRepositionDelta(
        { clientX: hotspotInteraction.startClientX, clientY: hotspotInteraction.startClientY },
        { clientX: e.clientX, clientY: e.clientY },
        { width: screenW, height: screen.imageHeight },
        zoom,
        hs,
        { x: hotspotInteraction.startX, y: hotspotInteraction.startY },
      );

      moveHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, newX, newY);
      return;
    }

    if (hotspotInteraction?.mode === "resize") {
      const screen = screens.find((s) => s.id === hotspotInteraction.screenId);
      if (!screen || !screen.imageHeight) return;
      const screenW = screen.width || 220;
      const { handle, startClientX, startClientY, startRect } = hotspotInteraction;

      const resized = computeResize(
        handle,
        { clientX: startClientX, clientY: startClientY },
        { clientX: e.clientX, clientY: e.clientY },
        { width: screenW, height: screen.imageHeight },
        zoom,
        startRect,
      );

      resizeHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, resized.x, resized.y, resized.w, resized.h);
      return;
    }

    if (hotspotInteraction?.mode === "conn-endpoint-drag") {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setHotspotInteraction((prev) => ({ ...prev, mouseX, mouseY }));
      return;
    }

    if (hotspotInteraction?.mode === "hotspot-drag") {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setHotspotInteraction((prev) => ({ ...prev, mouseX, mouseY }));
      return;
    }

    if (connecting) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setConnecting((prev) => ({ ...prev, mouseX, mouseY }));
      return;
    }
    const result = handleMouseMove(e);
    if (result?.type === "drag") moveScreen(result.id, result.x, result.y);
  }, [handleMouseMove, moveScreen, connecting, setConnecting, canvasRef, pan, zoom, hotspotInteraction, setHotspotInteraction, screens, moveHotspot, resizeHotspot]);

  const onCanvasMouseUp = useCallback((e) => {
    // Handle connection endpoint drag completion
    if (hotspotInteraction?.mode === "conn-endpoint-drag") {
      const { connectionId, endpoint, mouseX, mouseY } = hotspotInteraction;
      const hitScreen = screens.find((s) => hitTestScreen(mouseX, mouseY, s, HEADER_HEIGHT));
      if (hitScreen) {
        const patch = endpoint === "from" ? { fromScreenId: hitScreen.id } : { toScreenId: hitScreen.id };
        updateConnection(connectionId, patch);
      }
      setHotspotInteraction(null);
      return;
    }

    // Handle draw completion
    if (hotspotInteraction?.mode === "draw") {
      const dr = hotspotInteraction.drawRect;
      // Signal draw completion via a special state value; caller opens modal
      if (dr && dr.w >= 2 && dr.h >= 2) {
        setHotspotInteraction({ mode: "draw-complete", screenId: hotspotInteraction.screenId, drawRect: dr });
      } else {
        setHotspotInteraction(null);
      }
      return;
    }

    // Handle resize completion
    if (hotspotInteraction?.mode === "resize") {
      commitDragSnapshot();
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }

    // Handle reposition completion
    if (hotspotInteraction?.mode === "reposition") {
      commitDragSnapshot();
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }

    // Handle hotspot-drag completion (drop on empty canvas)
    if (hotspotInteraction?.mode === "hotspot-drag") {
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }

    if (connecting) {
      cancelConnecting();
      return;
    }
    const wasDragging = !!dragging;
    handleMouseUp(e);
    if (wasDragging) commitDragSnapshot();
  }, [connecting, cancelConnecting, handleMouseUp, hotspotInteraction, setHotspotInteraction, screens, updateConnection, dragging, commitDragSnapshot]);

  const onCanvasMouseLeave = useCallback((e) => {
    if (hotspotInteraction?.mode === "conn-endpoint-drag") {
      setHotspotInteraction(null);
      return;
    }
    if (hotspotInteraction?.mode === "reposition" || hotspotInteraction?.mode === "resize") {
      commitDragSnapshot();
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }
    if (hotspotInteraction?.mode === "draw") {
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }
    if (hotspotInteraction?.mode === "hotspot-drag") {
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }
    if (connecting) {
      cancelConnecting();
      return;
    }
    handleMouseUp(e);
  }, [connecting, cancelConnecting, handleMouseUp, hotspotInteraction, setHotspotInteraction, commitDragSnapshot]);

  const canvasCursor = activeTool === "pan"
    ? (isPanning ? "grabbing" : "grab")
    : connecting || hotspotInteraction?.mode === "hotspot-drag" || hotspotInteraction?.mode === "conn-endpoint-drag"
    ? "crosshair"
    : hotspotInteraction?.mode === "draw"
      ? "crosshair"
      : hotspotInteraction?.mode === "resize"
        ? (resizeCursors[hotspotInteraction.handle] || "default")
        : hotspotInteraction?.mode === "reposition"
          ? "grabbing"
          : (spaceHeld && isPanning) ? "grabbing"
            : spaceHeld ? "grab"
              : isPanning ? "grabbing" : "default";

  return {
    onCanvasMouseDown,
    onCanvasMouseMove,
    onCanvasMouseUp,
    onCanvasMouseLeave,
    canvasCursor,
  };
}

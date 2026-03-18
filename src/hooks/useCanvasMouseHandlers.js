import { useCallback } from "react";
import { computeDrawRect, computeResize, hitTestScreen, worldToScreenPct } from "../utils/canvasMath.js";
import { HEADER_HEIGHT, BORDER_WIDTH, RUBBER_BAND_THRESHOLD } from "../constants";
const resizeCursors = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize",
  se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize",
};

export function useCanvasMouseHandlers({
  // hotspot interaction
  hotspotInteraction,
  setHotspotInteraction,
  captureDragSnapshot,
  commitDragSnapshot,
  screens,
  moveHotspot,
  moveHotspotToScreen,
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
  moveScreens,
  updateStickyNote,
  stickyNotes,
  // canvas selection
  clearSelection,
  startRubberBand,
  updateRubberBand,
  completeRubberBand,
  rubberBand,
  setCanvasSelection,
  // viewport
  pan,
  zoom,
  canvasRef,
  // tool mode
  activeTool,
  // sticky note / screen group selection clearing
  setSelectedStickyNote,
  setSelectedScreenGroup,
  // collaboration
  isReadOnly,
  pendingRemoteStateRef,
  applyPendingRemoteState,
}) {
  const onCanvasMouseDown = useCallback((e) => {
    // Pan tool: always pan, skip all other interactions
    if (activeTool === "pan") {
      if (selectedConnection) setSelectedConnection(null);
      if (selectedHotspots.length > 0) setSelectedHotspots([]);
      setSelectedStickyNote?.(null);
      setSelectedScreenGroup?.(null);
      if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "reposition-pending" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
        setHotspotInteraction(null);
      }
      handleCanvasMouseDown(e);
      setSelectedScreen(null);
      return;
    }
    // Read-only: only allow panning and zoom (no draw/drag/resize)
    if (isReadOnly) {
      handleCanvasMouseDown(e);
      setSelectedScreen(null);
      return;
    }
    // Space+click: always pan, skip all interaction guards
    if (isSpaceHeld.current) {
      if (selectedConnection) setSelectedConnection(null);
      if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "reposition-pending" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
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
    // Clear sticky note / screen group selection
    setSelectedStickyNote?.(null);
    setSelectedScreenGroup?.(null);
    // Cancel hotspot interaction on canvas click
    if (hotspotInteraction && hotspotInteraction.mode !== "draw" && hotspotInteraction.mode !== "reposition" && hotspotInteraction.mode !== "reposition-pending" && hotspotInteraction.mode !== "hotspot-drag" && hotspotInteraction.mode !== "resize" && hotspotInteraction.mode !== "conn-endpoint-drag") {
      setHotspotInteraction(null);
    }
    if (connecting) {
      if (connecting.mode === "click") cancelConnecting();
      return;
    }
    if (hotspotInteraction?.mode === "draw" || hotspotInteraction?.mode === "reposition" || hotspotInteraction?.mode === "reposition-pending" || hotspotInteraction?.mode === "hotspot-drag" || hotspotInteraction?.mode === "resize" || hotspotInteraction?.mode === "conn-endpoint-drag") {
      return;
    }
    const result = handleCanvasMouseDown(e);
    if (result === true) {
      setSelectedScreen(null);
    } else if (result === "empty") {
      // Start rubber-band selection
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / zoom;
      const worldY = (e.clientY - rect.top - pan.y) / zoom;
      if (!e.shiftKey && !e.metaKey) clearSelection();
      startRubberBand(worldX, worldY);
      setSelectedScreen(null);
    }
  }, [handleCanvasMouseDown, setSelectedScreen, connecting, cancelConnecting, hotspotInteraction, setHotspotInteraction, selectedConnection, setSelectedConnection, isSpaceHeld, conditionalPrompt, onConditionalPromptCancel, editingConditionGroup, setEditingConditionGroup, selectedHotspots, setSelectedHotspots, activeTool, clearSelection, startRubberBand, canvasRef, pan, zoom, setSelectedStickyNote, setSelectedScreenGroup, isReadOnly]);

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

    if (hotspotInteraction?.mode === "reposition-pending") {
      // Only transition to full reposition after exceeding drag threshold (5px)
      const dx = e.clientX - hotspotInteraction.startClientX;
      const dy = e.clientY - hotspotInteraction.startClientY;
      if (Math.abs(dx) >= 5 || Math.abs(dy) >= 5) {
        captureDragSnapshot();
        setHotspotInteraction((prev) => ({ ...prev, mode: "reposition" }));
      }
      return;
    }

    if (hotspotInteraction?.mode === "reposition") {
      // Track world cursor position — hotspot stays at original position until mouseup
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / zoom;
      const worldY = (e.clientY - rect.top - pan.y) / zoom;
      setHotspotInteraction((prev) => ({ ...prev, worldX, worldY }));
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

    // Rubber-band: update rect
    if (rubberBand) {
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / zoom;
      const worldY = (e.clientY - rect.top - pan.y) / zoom;
      updateRubberBand(worldX, worldY);
      return;
    }

    const result = handleMouseMove(e);
    if (result?.type === "drag") {
      moveScreen(result.id, result.x, result.y);
    } else if (result?.type === "multi-drag") {
      const screenMoves = result.items.filter((i) => i.type === "screen");
      const stickyMoves = result.items.filter((i) => i.type === "sticky");
      if (screenMoves.length > 0) moveScreens(screenMoves);
      stickyMoves.forEach((item) => updateStickyNote(item.id, { x: item.x, y: item.y }));
    }
  }, [handleMouseMove, moveScreen, moveScreens, updateStickyNote, connecting, setConnecting, canvasRef, pan, zoom, hotspotInteraction, setHotspotInteraction, screens, resizeHotspot, rubberBand, updateRubberBand, captureDragSnapshot]);

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

    // Handle reposition-pending mouseup: threshold not reached, revert to selected
    if (hotspotInteraction?.mode === "reposition-pending") {
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }

    // Handle reposition completion (may transfer hotspot to another screen)
    if (hotspotInteraction?.mode === "reposition") {
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / zoom;
      const worldY = (e.clientY - rect.top - pan.y) / zoom;

      const sourceScreen = screens.find((s) => s.id === hotspotInteraction.screenId);
      const hs = sourceScreen?.hotspots.find((h) => h.id === hotspotInteraction.hotspotId);

      const targetScreen = screens.find(
        (s) => s.id !== hotspotInteraction.screenId && hitTestScreen(worldX, worldY, s, HEADER_HEIGHT)
      );

      // Place hotspot center at cursor — matches ghost preview position
      const dropOnScreen = (targetScreen && targetScreen.imageHeight && hs) ? targetScreen
        : (sourceScreen && sourceScreen.imageHeight && hs) ? sourceScreen
        : null;

      if (dropOnScreen && hs) {
        const { x: rawX, y: rawY } = worldToScreenPct(worldX, worldY, dropOnScreen, HEADER_HEIGHT, BORDER_WIDTH);
        const clampedX = Math.max(0, Math.min(100 - hs.w, rawX - hs.w / 2));
        const clampedY = Math.max(0, Math.min(100 - hs.h, rawY - hs.h / 2));

        if (dropOnScreen.id !== hotspotInteraction.screenId) {
          moveHotspotToScreen(hotspotInteraction.screenId, hotspotInteraction.hotspotId, dropOnScreen.id, clampedX, clampedY);
        } else {
          moveHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, clampedX, clampedY);
        }
        commitDragSnapshot();
        setHotspotInteraction({ mode: "selected", screenId: dropOnScreen.id, hotspotId: hotspotInteraction.hotspotId });
      } else {
        // Dropped on empty canvas or screen without image — cancel
        setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      }
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

    // Handle rubber-band completion
    if (rubberBand) {
      const rect = canvasRef.current.getBoundingClientRect();
      const startScreenX = rubberBand.startX * zoom + pan.x;
      const startScreenY = rubberBand.startY * zoom + pan.y;
      const dx = e.clientX - rect.left - startScreenX;
      const dy = e.clientY - rect.top - startScreenY;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const selected = completeRubberBand(screens, stickyNotes, rubberBand);

      if (distPx >= RUBBER_BAND_THRESHOLD && selected.length > 0) {
        if (e.shiftKey || e.metaKey) {
          setCanvasSelection((prev) => {
            const existing = new Set(prev.map((i) => `${i.type}:${i.id}`));
            const next = [...prev];
            selected.forEach((item) => {
              if (!existing.has(`${item.type}:${item.id}`)) next.push(item);
            });
            return next;
          });
        } else {
          setCanvasSelection(selected);
        }
      } else if (!e.shiftKey && !e.metaKey) {
        clearSelection();
      }
      return;
    }

    const wasDragging = !!dragging;
    const { wasMultiDragging } = handleMouseUp(e);
    if (wasDragging || wasMultiDragging) commitDragSnapshot();

    // Apply any queued remote state that arrived mid-drag
    if (pendingRemoteStateRef?.current) {
      applyPendingRemoteState?.(pendingRemoteStateRef.current);
      pendingRemoteStateRef.current = null;
    }
  }, [connecting, cancelConnecting, handleMouseUp, hotspotInteraction, setHotspotInteraction, screens, stickyNotes, updateConnection, dragging, commitDragSnapshot, rubberBand, completeRubberBand, clearSelection, setCanvasSelection, canvasRef, pan, zoom, moveHotspotToScreen, moveHotspot, pendingRemoteStateRef, applyPendingRemoteState]);

  const onCanvasMouseLeave = useCallback((e) => {
    if (hotspotInteraction?.mode === "conn-endpoint-drag") {
      setHotspotInteraction(null);
      return;
    }
    if (hotspotInteraction?.mode === "reposition-pending") {
      // Threshold not reached — revert to selected, no snapshot to commit
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }
    if (hotspotInteraction?.mode === "reposition") {
      // Reposition doesn't move the hotspot during drag, so just cancel — no snapshot to commit
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      return;
    }
    if (hotspotInteraction?.mode === "resize") {
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
    : rubberBand
    ? "crosshair"
    : connecting || hotspotInteraction?.mode === "hotspot-drag" || hotspotInteraction?.mode === "conn-endpoint-drag"
    ? "crosshair"
    : hotspotInteraction?.mode === "draw"
      ? "crosshair"
      : hotspotInteraction?.mode === "resize"
        ? (resizeCursors[hotspotInteraction.handle] || "default")
        : hotspotInteraction?.mode === "reposition"
          ? "grabbing"
          : hotspotInteraction?.mode === "reposition-pending"
            ? "grab"
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

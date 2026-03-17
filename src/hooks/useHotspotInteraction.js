import { useState, useCallback } from "react";

export function useHotspotInteraction({
  screens,
  canvasRef,
  pan,
  zoom,
  connecting,
  setSelectedConnection,
  captureDragSnapshot,
  commitDragSnapshot: _commitDragSnapshot,
  moveHotspot: _moveHotspot,
  resizeHotspot: _resizeHotspot,
  updateScreenDimensions,
  assignScreenImage,
  activeTool,
}) {
  const [hotspotInteraction, setHotspotInteraction] = useState(null);
  const [selectedHotspots, setSelectedHotspots] = useState([]);

  const cancelHotspotInteraction = useCallback(() => {
    setHotspotInteraction(null);
    // hoverTarget is managed externally (in connection interaction); no-op here
  }, []);

  const onHotspotMouseDown = useCallback((e, screenId, hotspotId) => {
    e.preventDefault();
    // Pan tool blocks hotspot interactions
    if (activeTool === "pan") return;
    // Alt/Option + mousedown: immediately start hotspot-drag to connect
    if (e.altKey) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;
      setSelectedHotspots([]);
      setHotspotInteraction({ mode: "hotspot-drag", screenId, hotspotId, mouseX, mouseY });
      return;
    }
    // Shift+click: toggle multi-select (same-screen constraint)
    if (e.shiftKey) {
      setSelectedHotspots((prev) => {
        if (prev.length > 0 && prev[0].screenId !== screenId) return [{ screenId, hotspotId }];
        const exists = prev.find((h) => h.hotspotId === hotspotId);
        if (exists) return prev.filter((h) => h.hotspotId !== hotspotId);
        return [...prev, { screenId, hotspotId }];
      });
      setHotspotInteraction(null);
      setSelectedConnection(null);
      return;
    }
    // Clear multi-select on non-shift click
    if (selectedHotspots.length > 0) setSelectedHotspots([]);

    if (hotspotInteraction?.mode === "selected" && hotspotInteraction.hotspotId === hotspotId) {
      // Same hotspot selected again -> enter pending reposition (drag threshold required)
      const screen = screens.find((s) => s.id === screenId);
      const hs = screen?.hotspots.find((h) => h.id === hotspotId);
      if (!screen || !hs) return;
      setHotspotInteraction({
        mode: "reposition-pending",
        screenId,
        hotspotId,
        offsetPct: { dx: 0, dy: 0 },
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: hs.x,
        startY: hs.y,
      });
    } else {
      setHotspotInteraction({ mode: "selected", screenId, hotspotId });
    }
  }, [hotspotInteraction, canvasRef, screens, captureDragSnapshot, pan, zoom, selectedHotspots, setSelectedConnection, activeTool]);

  const onImageAreaMouseDown = useCallback((e, screenId) => {
    // Pan tool blocks drawing hotspots
    if (activeTool === "pan") return;
    if (hotspotInteraction?.mode === "selected") {
      setHotspotInteraction(null);
      return;
    }
    if (connecting) return;
    e.stopPropagation();
    e.preventDefault();

    const screen = screens.find((s) => s.id === screenId);
    if (!screen?.imageData || !screen.imageHeight) return;

    const imageAreaRect = e.currentTarget.getBoundingClientRect();
    setHotspotInteraction({
      mode: "draw",
      screenId,
      drawStart: { clientX: e.clientX, clientY: e.clientY },
      imageAreaRect,
      drawRect: null,
    });
  }, [hotspotInteraction, connecting, screens, activeTool]);

  const onResizeHandleMouseDown = useCallback((e, screenId, hotspotId, handle) => {
    e.preventDefault();
    const screen = screens.find((s) => s.id === screenId);
    const hs = screen?.hotspots.find((h) => h.id === hotspotId);
    if (!screen || !hs) return;
    captureDragSnapshot();
    setHotspotInteraction({
      mode: "resize",
      screenId,
      hotspotId,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: { x: hs.x, y: hs.y, w: hs.w, h: hs.h },
    });
  }, [screens, captureDragSnapshot]);

  const onHotspotDragHandleMouseDown = useCallback((e, screenId, hotspotId) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    setHotspotInteraction({ mode: "hotspot-drag", screenId, hotspotId, mouseX, mouseY });
  }, [canvasRef, pan, zoom]);

  const onEndpointMouseDown = useCallback((e, connId, endpoint) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;
    setHotspotInteraction({ mode: "conn-endpoint-drag", connectionId: connId, endpoint, mouseX, mouseY });
  }, [canvasRef, pan, zoom]);

  const onScreenDimensions = useCallback((screenId, imageWidth, imageHeight) => {
    updateScreenDimensions(screenId, imageWidth, imageHeight);
  }, [updateScreenDimensions]);

  const handleDropImage = useCallback((screenId, file) => {
    const reader = new FileReader();
    reader.onload = (ev) => assignScreenImage(screenId, ev.target.result);
    reader.readAsDataURL(file);
  }, [assignScreenImage]);

  return {
    hotspotInteraction, setHotspotInteraction,
    selectedHotspots, setSelectedHotspots,
    cancelHotspotInteraction,
    onHotspotMouseDown,
    onImageAreaMouseDown,
    onResizeHandleMouseDown,
    onHotspotDragHandleMouseDown,
    onEndpointMouseDown,
    onScreenDimensions,
    handleDropImage,
  };
}

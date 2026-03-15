import { useState, useRef, useCallback, useEffect } from "react";
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP } from "../constants";

export function useCanvas(activeTool = "select") {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null);
  const [spaceHeld, setSpaceHeld] = useState(false);

  const canvasRef = useRef(null);
  const isSpaceHeld = useRef(false);
  const multiDragging = useRef(null); // [{type, id, offsetX, offsetY}]

  const handleDragStart = useCallback((e, screenId, screens) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const screen = screens.find((s) => s.id === screenId);
    setDragging({
      id: screenId,
      offsetX: (e.clientX - rect.left - pan.x) / zoom - screen.x,
      offsetY: (e.clientY - rect.top - pan.y) / zoom - screen.y,
    });
  }, [pan, zoom]);

  // Begins a multi-object drag; selectedItems: [{type, id}], screens/stickyNotes for position lookup
  const handleMultiDragStart = useCallback((e, selectedItems, screens, stickyNotes) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - pan.x) / zoom;
    const worldY = (e.clientY - rect.top - pan.y) / zoom;

    multiDragging.current = selectedItems.map((item) => {
      if (item.type === "screen") {
        const screen = screens.find((s) => s.id === item.id);
        return { type: "screen", id: item.id, offsetX: worldX - (screen?.x ?? 0), offsetY: worldY - (screen?.y ?? 0) };
      } else {
        const note = stickyNotes.find((n) => n.id === item.id);
        return { type: "sticky", id: item.id, offsetX: worldX - (note?.x ?? 0), offsetY: worldY - (note?.y ?? 0) };
      }
    });
  }, [pan, zoom]);

  const handleMouseMove = useCallback((e) => {
    if (multiDragging.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (e.clientX - rect.left - pan.x) / zoom;
      const worldY = (e.clientY - rect.top - pan.y) / zoom;
      return {
        type: "multi-drag",
        items: multiDragging.current.map((item) => ({
          type: item.type,
          id: item.id,
          x: worldX - item.offsetX,
          y: worldY - item.offsetY,
        })),
      };
    }
    if (dragging) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - pan.x) / zoom - dragging.offsetX;
      const newY = (e.clientY - rect.top - pan.y) / zoom - dragging.offsetY;
      return { type: "drag", id: dragging.id, x: newX, y: newY };
    }
    if (isPanning && panStart) {
      setPan({
        x: pan.x + (e.clientX - panStart.x),
        y: pan.y + (e.clientY - panStart.y),
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
    return null;
  }, [multiDragging, dragging, isPanning, panStart, pan, zoom]);

  const handleMouseUp = useCallback(() => {
    const wasMultiDragging = multiDragging.current !== null;
    multiDragging.current = null;
    setDragging(null);
    setIsPanning(false);
    setPanStart(null);
    return { wasMultiDragging };
  }, []);

  // Returns: true (panning), "empty" (empty canvas click in select mode), false (nothing)
  const handleCanvasMouseDown = useCallback((e) => {
    // Pan tool: always pan regardless of click target
    if (activeTool === "pan") {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return true;
    }
    if (isSpaceHeld.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return true;
    }
    if (e.target === canvasRef.current || e.target.classList.contains("canvas-inner")) {
      if (activeTool === "select") {
        return "empty";
      }
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return true;
    }
    return false;
  }, [activeTool]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;

      setZoom((prevZoom) => {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom + delta));
        const scale = newZoom / prevZoom;
        setPan((p) => ({
          x: mouseX - (mouseX - p.x) * scale,
          y: mouseY - (mouseY - p.y) * scale,
        }));
        return newZoom;
      });
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        isSpaceHeld.current = true;
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") {
        isSpaceHeld.current = false;
        setSpaceHeld(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return {
    pan,
    setPan,
    zoom,
    setZoom,
    isPanning,
    dragging,
    multiDragging,
    canvasRef,
    isSpaceHeld,
    spaceHeld,
    handleDragStart,
    handleMultiDragStart,
    handleMouseMove,
    handleMouseUp,
    handleCanvasMouseDown,
  };
}

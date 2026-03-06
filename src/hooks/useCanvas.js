import { useState, useRef, useCallback, useEffect } from "react";

export function useCanvas() {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null);

  const canvasRef = useRef(null);

  const handleDragStart = useCallback((e, screenId, screens) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const screen = screens.find((s) => s.id === screenId);
    setDragging({
      id: screenId,
      offsetX: (e.clientX - rect.left - pan.x) / zoom - screen.x,
      offsetY: (e.clientY - rect.top - pan.y) / zoom - screen.y,
    });
  }, [pan, zoom]);

  const handleMouseMove = useCallback((e) => {
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
  }, [dragging, isPanning, panStart, pan, zoom]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (e.target === canvasRef.current || e.target.classList.contains("canvas-inner")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return true;
    }
    return false;
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    setZoom((z) => Math.max(0.2, Math.min(2, z + delta)));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  return {
    pan,
    setPan,
    zoom,
    setZoom,
    isPanning,
    dragging,
    canvasRef,
    handleDragStart,
    handleMouseMove,
    handleMouseUp,
    handleCanvasMouseDown,
  };
}

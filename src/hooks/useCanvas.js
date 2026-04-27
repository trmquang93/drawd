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

  // Pan/wheel rAF coalescing infrastructure. Mousemove and wheel events can
  // fire faster than React can render at low zoom (more screens visible →
  // heavier reconcile per frame). Coalescing setPan into one call per
  // animation frame eliminates the back-pressure that produces stutter.
  const panStartRef = useRef(null); // mirror of panStart, read inside rAF
  const panRafRef = useRef(0); // pending rAF id for pan, 0 if none
  const pendingPanEvent = useRef(null); // latest { clientX, clientY } during pan
  const wheelRafRef = useRef(0); // pending rAF id for wheel pan, 0 if none
  const pendingWheelDelta = useRef({ dx: 0, dy: 0 });

  // Wrapper that keeps panStartRef in sync with panStart state so the rAF
  // callback always reads the latest committed start position.
  const setPanStartSynced = useCallback((value) => {
    panStartRef.current = value;
    setPanStart(value);
  }, []);

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
    if (isPanning && panStartRef.current) {
      // Stash the latest cursor position; the rAF flush reads from this ref.
      pendingPanEvent.current = { clientX: e.clientX, clientY: e.clientY };
      if (panRafRef.current === 0) {
        panRafRef.current = requestAnimationFrame(() => {
          panRafRef.current = 0;
          const latest = pendingPanEvent.current;
          const start = panStartRef.current;
          pendingPanEvent.current = null;
          if (!latest || !start) return;
          const dx = latest.clientX - start.x;
          const dy = latest.clientY - start.y;
          setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
          const nextStart = { x: latest.clientX, y: latest.clientY };
          panStartRef.current = nextStart;
          setPanStart(nextStart);
        });
      }
    }
    return null;
  }, [multiDragging, dragging, isPanning, panStart, pan, zoom]);

  const handleMouseUp = useCallback(() => {
    const wasMultiDragging = multiDragging.current !== null;
    multiDragging.current = null;
    setDragging(null);
    setIsPanning(false);
    panStartRef.current = null;
    setPanStart(null);
    if (panRafRef.current) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = 0;
      pendingPanEvent.current = null;
    }
    return { wasMultiDragging };
  }, []);

  // Returns: true (panning), "empty" (empty canvas click in select mode), false (nothing)
  const handleCanvasMouseDown = useCallback((e) => {
    // Pan tool: always pan regardless of click target
    if (activeTool === "pan") {
      setIsPanning(true);
      setPanStartSynced({ x: e.clientX, y: e.clientY });
      return true;
    }
    if (isSpaceHeld.current) {
      setIsPanning(true);
      setPanStartSynced({ x: e.clientX, y: e.clientY });
      return true;
    }
    if (e.target === canvasRef.current || e.target.classList.contains("canvas-inner")) {
      if (activeTool === "select") {
        return "empty";
      }
      setIsPanning(true);
      setPanStartSynced({ x: e.clientX, y: e.clientY });
      return true;
    }
    return false;
  }, [activeTool, setPanStartSynced]);

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
      // Coalesce wheel-pan into one setPan per animation frame. Wheel events
      // on high-DPI trackpads can fire faster than the display refresh rate.
      pendingWheelDelta.current.dx += e.deltaX;
      pendingWheelDelta.current.dy += e.deltaY;
      if (wheelRafRef.current === 0) {
        wheelRafRef.current = requestAnimationFrame(() => {
          wheelRafRef.current = 0;
          const { dx, dy } = pendingWheelDelta.current;
          pendingWheelDelta.current = { dx: 0, dy: 0 };
          setPan((p) => ({ x: p.x - dx, y: p.y - dy }));
        });
      }
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
      return () => canvas.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  // Cancel any pending coalesced pan/wheel rAFs on unmount to avoid leaks
  // and "setState on unmounted component" warnings during route changes.
  useEffect(() => {
    return () => {
      if (panRafRef.current) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = 0;
      }
      if (wheelRafRef.current) {
        cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = 0;
      }
    };
  }, []);

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

import { useCallback, useEffect } from "react";
import { HEADER_HEIGHT, DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT } from "../constants";

export function useInteractionCallbacks({
  screens, connections, stickyNotes,
  connecting, cancelConnecting,
  hotspotInteraction, setHotspotInteraction,
  setSelectedConnection, setHoverTarget,
  setConditionalPrompt, setEditingConditionGroup,
  setHotspotModal, setConnectionEditModal,
  quickConnectHotspot, addConnection, addToConditionalGroup,
  onStartConnect,
  activeTool, captureDragSnapshot,
  handleDragStart, handleMultiDragStart,
  canvasSelection, clearSelection,
  setSelectedScreen, setPan, zoom, canvasRef,
}) {
  const onConnectionClick = useCallback((connId) => {
    setSelectedConnection(connId);
    setHotspotInteraction(null);
  }, [setSelectedConnection, setHotspotInteraction]);

  const onConnectionDoubleClick = useCallback((connId) => {
    const conn = connections.find((c) => c.id === connId);
    if (!conn) return;
    const screen = screens.find((s) => s.id === conn.fromScreenId);
    if (!screen) return;
    if (conn.hotspotId) {
      const hotspot = screen.hotspots.find((h) => h.id === conn.hotspotId);
      if (hotspot) setHotspotModal({ screen, hotspot, connection: conn });
    } else {
      const groupConns = conn.conditionGroupId
        ? connections.filter((c) => c.conditionGroupId === conn.conditionGroupId)
        : [conn];
      setConnectionEditModal({ connection: conn, groupConnections: groupConns, fromScreen: screen });
    }
  }, [connections, screens, setHotspotModal, setConnectionEditModal]);

  const onConnectComplete = useCallback((targetScreenId) => {
    if (hotspotInteraction?.mode === "hotspot-drag") {
      if (targetScreenId !== hotspotInteraction.screenId) {
        quickConnectHotspot(hotspotInteraction.screenId, hotspotInteraction.hotspotId, targetScreenId);
      }
      setHotspotInteraction({ mode: "selected", screenId: hotspotInteraction.screenId, hotspotId: hotspotInteraction.hotspotId });
      setHoverTarget(null);
      return;
    }

    if (!connecting) return;
    const fromId = connecting.fromScreenId;
    if (targetScreenId === fromId) { cancelConnecting(); return; }

    const existingPlain = connections.filter((c) => c.fromScreenId === fromId && !c.hotspotId);

    const existingGroup = existingPlain.find((c) => c.conditionGroupId);
    if (existingGroup) {
      addToConditionalGroup(fromId, targetScreenId, existingGroup.conditionGroupId);
      setEditingConditionGroup(existingGroup.conditionGroupId);
      cancelConnecting();
      return;
    }

    if (existingPlain.length > 0) {
      const isDuplicate = existingPlain.some((c) => c.toScreenId === targetScreenId);
      if (isDuplicate) { cancelConnecting(); return; }
      const fromScreen = screens.find((s) => s.id === fromId);
      const promptX = fromScreen ? fromScreen.x + (fromScreen.width || DEFAULT_SCREEN_WIDTH) + 20 : 0;
      const promptY = fromScreen ? fromScreen.y : 0;
      setConditionalPrompt({ fromId, targetScreenId, existingConnId: existingPlain[0].id, x: promptX, y: promptY });
      cancelConnecting();
      return;
    }

    addConnection(fromId, targetScreenId);
    cancelConnecting();
  }, [connecting, cancelConnecting, hotspotInteraction, setHotspotInteraction, quickConnectHotspot, addConnection, connections, screens, addToConditionalGroup, setEditingConditionGroup, setHoverTarget, setConditionalPrompt]);

  // Open hotspot modal when a draw gesture completes
  useEffect(() => {
    if (hotspotInteraction?.mode === "draw-complete") {
      const screen = screens.find((s) => s.id === hotspotInteraction.screenId);
      if (screen) {
        const { x, y, w, h } = hotspotInteraction.drawRect;
        setHotspotModal({ screen, hotspot: null, prefilledRect: { x, y, w, h } });
      }
      setHotspotInteraction(null);
    }
  }, [hotspotInteraction, screens, setHotspotInteraction, setHotspotModal]);

  const onDragStart = useCallback((e, screenId) => {
    if (activeTool === "pan") return;
    captureDragSnapshot();
    handleDragStart(e, screenId, screens);
  }, [handleDragStart, screens, captureDragSnapshot, activeTool]);

  const onMultiDragStart = useCallback((e) => {
    if (activeTool === "pan") return;
    captureDragSnapshot();
    handleMultiDragStart(e, canvasSelection, screens, stickyNotes);
  }, [activeTool, captureDragSnapshot, handleMultiDragStart, canvasSelection, screens, stickyNotes]);

  const addHotspot = useCallback((screenId) => {
    const screen = screens.find((s) => s.id === screenId);
    setHotspotModal({ screen, hotspot: null });
  }, [screens, setHotspotModal]);

  const onHotspotDoubleClick = useCallback((_e, screenId, hotspotId) => {
    const screen = screens.find((s) => s.id === screenId);
    if (!screen) return;
    const hotspot = screen.hotspots.find((h) => h.id === hotspotId);
    if (!hotspot) return;
    setHotspotInteraction(null);
    setHotspotModal({ screen, hotspot });
  }, [screens, setHotspotInteraction, setHotspotModal]);

  const addHotspotViaConnect = useCallback((screenId) => {
    onStartConnect(screenId);
  }, [onStartConnect]);

  const onScreensPanelClick = useCallback((screenId) => {
    clearSelection();
    setSelectedScreen(screenId);
    const screen = screens.find((s) => s.id === screenId);
    if (!screen || !canvasRef.current) return;
    const vw = canvasRef.current.clientWidth;
    const vh = canvasRef.current.clientHeight;
    const screenW = screen.width || DEFAULT_SCREEN_WIDTH;
    const screenH = screen.imageHeight ? screen.imageHeight + HEADER_HEIGHT : DEFAULT_SCREEN_HEIGHT;
    const centerX = screen.x + screenW / 2;
    const centerY = screen.y + screenH / 2;
    setPan({ x: vw / 2 - centerX * zoom, y: vh / 2 - centerY * zoom });
  }, [screens, zoom, canvasRef, setPan, setSelectedScreen, clearSelection]);

  return {
    onConnectionClick, onConnectionDoubleClick, onConnectComplete,
    onDragStart, onMultiDragStart,
    addHotspot, onHotspotDoubleClick, addHotspotViaConnect,
    onScreensPanelClick,
  };
}

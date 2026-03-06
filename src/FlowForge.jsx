import { useState, useCallback, useEffect } from "react";
import { COLORS, FONTS, FONT_LINK } from "./styles/theme";
import { generateInstructions } from "./utils/generateInstructions";
import { useCanvas } from "./hooks/useCanvas";
import { useScreenManager } from "./hooks/useScreenManager";
import { ScreenNode } from "./components/ScreenNode";
import { ConnectionLines } from "./components/ConnectionLines";
import { HotspotModal } from "./components/HotspotModal";
import { InstructionsPanel } from "./components/InstructionsPanel";
import { RenameModal } from "./components/RenameModal";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { EmptyState } from "./components/EmptyState";

export default function FlowForge() {
  const { pan, zoom, isPanning, canvasRef, handleDragStart, handleMouseMove, handleMouseUp, handleCanvasMouseDown } = useCanvas();
  const {
    screens, connections, selectedScreen, setSelectedScreen,
    fileInputRef, addScreen, removeScreen, renameScreen, moveScreen,
    handleImageUpload, onFileChange, handlePaste, handleCanvasDrop,
    saveHotspot, deleteHotspot,
  } = useScreenManager(pan, zoom);

  const [hotspotModal, setHotspotModal] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [renameModal, setRenameModal] = useState(null);

  const onCanvasMouseDown = useCallback((e) => {
    const wasPan = handleCanvasMouseDown(e);
    if (wasPan) setSelectedScreen(null);
  }, [handleCanvasMouseDown, setSelectedScreen]);

  const onCanvasMouseMove = useCallback((e) => {
    const result = handleMouseMove(e);
    if (result?.type === "drag") {
      moveScreen(result.id, result.x, result.y);
    }
  }, [handleMouseMove, moveScreen]);

  const onDragStart = useCallback((e, screenId) => {
    handleDragStart(e, screenId, screens);
  }, [handleDragStart, screens]);

  const addHotspot = useCallback((screenId) => {
    const screen = screens.find((s) => s.id === screenId);
    setHotspotModal({ screen, hotspot: null });
  }, [screens]);

  const onGenerate = useCallback(() => {
    if (screens.length === 0) return;
    setInstructions(generateInstructions(screens, connections));
    setShowInstructions(true);
  }, [screens, connections]);

  useEffect(() => {
    const onPaste = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      handlePaste(e);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handlePaste]);

  const selectedScreenData = screens.find((s) => s.id === selectedScreen);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: FONTS.ui,
        overflow: "hidden",
      }}
    >
      <link href={FONT_LINK} rel="stylesheet" />

      <TopBar
        screenCount={screens.length}
        connectionCount={connections.length}
        onUpload={handleImageUpload}
        onAddBlank={() => addScreen()}
        onGenerate={onGenerate}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={onCanvasMouseDown}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background: COLORS.canvasBg,
            cursor: isPanning ? "grabbing" : "default",
            backgroundImage: `radial-gradient(circle, ${COLORS.canvasDot} 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <div
            className="canvas-inner"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            <ConnectionLines screens={screens} connections={connections} />
            {screens.map((screen) => (
              <ScreenNode
                key={screen.id}
                screen={screen}
                selected={selectedScreen === screen.id}
                onSelect={setSelectedScreen}
                onDragStart={onDragStart}
                onAddHotspot={addHotspot}
                onRemoveScreen={removeScreen}
              />
            ))}
          </div>

          {screens.length === 0 && <EmptyState />}

          {/* Zoom indicator */}
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 16,
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 11,
              color: COLORS.textDim,
              fontFamily: FONTS.mono,
            }}
          >
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {selectedScreenData && (
          <Sidebar
            screen={selectedScreenData}
            screens={screens}
            connections={connections}
            onClose={() => setSelectedScreen(null)}
            onRename={() => setRenameModal(selectedScreenData)}
            onAddHotspot={addHotspot}
            onEditHotspot={(hs) => setHotspotModal({ screen: selectedScreenData, hotspot: hs })}
          />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      {hotspotModal && (
        <HotspotModal
          screen={hotspotModal.screen}
          hotspot={hotspotModal.hotspot}
          screens={screens}
          onSave={(hs) => { saveHotspot(hotspotModal.screen.id, hs); setHotspotModal(null); }}
          onDelete={(id) => { deleteHotspot(hotspotModal.screen.id, id); setHotspotModal(null); }}
          onClose={() => setHotspotModal(null)}
        />
      )}

      {showInstructions && (
        <InstructionsPanel
          instructions={instructions}
          onClose={() => setShowInstructions(false)}
        />
      )}

      {renameModal && (
        <RenameModal
          screen={renameModal}
          onSave={(name) => { renameScreen(renameModal.id, name); setRenameModal(null); }}
          onClose={() => setRenameModal(null)}
        />
      )}
    </div>
  );
}

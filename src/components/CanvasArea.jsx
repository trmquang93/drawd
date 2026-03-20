import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT } from "../constants";
import { ScreenNode } from "./ScreenNode";
import { ConnectionLines } from "./ConnectionLines";
import { ConditionalPrompt } from "./ConditionalPrompt";
import { InlineConditionLabels } from "./InlineConditionLabels";
import { SelectionOverlay } from "./SelectionOverlay";
import { EmptyState } from "./EmptyState";
import { ToolBar } from "./ToolBar";
import { StickyNote } from "./StickyNote";
import { ScreenGroup } from "./ScreenGroup";
import { RemoteCursors } from "./RemoteCursors";

export function CanvasArea({
  // Canvas state
  canvasRef, pan, zoom, canvasCursor,
  // Mouse handlers
  onCanvasMouseDown, onCanvasMouseMove, onCanvasMouseUp, onCanvasMouseLeave, onCanvasDrop,
  // Screen groups
  screenGroups, selectedScreenGroup, updateScreenGroup, deleteScreenGroup,
  addScreenToGroup, removeScreenFromGroup, addScreenGroup,
  setSelectedScreenGroup, setSelectedStickyNote, setSelectedScreen, setSelectedConnection, setHotspotInteraction,
  // Screens
  screens, selectedScreen, clearSelection,
  onDragStart, isSpaceHeld, addHotspotViaConnect, removeScreen,
  onDotDragStart, onConnectComplete, setHoverTarget, hoverTarget, connecting,
  hotspotInteraction, selectedHotspotId, selectedHotspots,
  onHotspotMouseDown, onHotspotDoubleClick, onImageAreaMouseDown,
  onHotspotDragHandleMouseDown, onResizeHandleMouseDown, onScreenDimensions,
  drawRect, updateScreenDescription, addState, handleDropImage, activeTool,
  scopeRoot, scopeScreenIds, canvasSelection, toggleSelection, onMultiDragStart,
  isReadOnly,
  // Sticky notes
  stickyNotes, selectedStickyNote, updateStickyNote, deleteStickyNote, addStickyNote,
  // Selection overlay
  rubberBandRect,
  // Connection lines
  connections, previewLine, hotspotPreviewLine, selectedConnection,
  onConnectionClick, onConnectionDoubleClick, onEndpointMouseDown, endpointDragPreview,
  // Reposition ghost
  repositionGhost,
  // Conditional prompt
  conditionalPrompt, onConditionalPromptConfirm, onConditionalPromptCancel,
  // Collaboration
  collab,
  // Inline condition labels
  editingConditionGroup, updateConnection, setEditingConditionGroup,
  // Group context menu
  groupContextMenu, setGroupContextMenu,
  // ToolBar
  setActiveTool, handleImageUpload, addScreenAtCenter,
}) {
  return (
    <div
      ref={canvasRef}
      onMouseDown={onCanvasMouseDown}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onCanvasDrop}
      onClick={() => { if (groupContextMenu) setGroupContextMenu(null); }}
      onDoubleClick={(e) => {
        if (e.target !== canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - pan.x) / zoom;
        const worldY = (e.clientY - rect.top - pan.y) / zoom;
        addStickyNote(worldX, worldY);
      }}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        background: COLORS.canvasBg,
        cursor: canvasCursor,
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
        {screenGroups.map((group) => (
          <ScreenGroup
            key={group.id}
            group={group}
            screens={screens}
            onUpdate={updateScreenGroup}
            onDelete={deleteScreenGroup}
            selected={selectedScreenGroup === group.id}
            onSelect={(id) => {
              setSelectedScreenGroup(id);
              setSelectedStickyNote(null);
              setSelectedScreen(null);
              setSelectedConnection(null);
              setHotspotInteraction(null);
            }}
          />
        ))}
        {screens.map((screen) => (
          <ScreenNode
            key={screen.id}
            screen={screen}
            selected={selectedScreen === screen.id}
            onSelect={(id) => { clearSelection(); setSelectedScreen(id); setSelectedStickyNote(null); }}
            onDragStart={onDragStart}
            isSpaceHeld={isSpaceHeld}
            onAddHotspot={addHotspotViaConnect}
            onRemoveScreen={removeScreen}
            onDotDragStart={onDotDragStart}
            onConnectTarget={onConnectComplete}
            onHoverTarget={setHoverTarget}
            isConnectHoverTarget={hoverTarget === screen.id}
            isConnecting={!!connecting}
            selectedHotspotId={hotspotInteraction?.screenId === screen.id ? selectedHotspotId : null}
            selectedHotspotIds={selectedHotspots.length > 0 && selectedHotspots[0].screenId === screen.id
              ? new Set(selectedHotspots.map((h) => h.hotspotId))
              : null}
            onHotspotMouseDown={onHotspotMouseDown}
            onHotspotDoubleClick={onHotspotDoubleClick}
            onImageAreaMouseDown={onImageAreaMouseDown}
            onHotspotDragHandleMouseDown={onHotspotDragHandleMouseDown}
            onResizeHandleMouseDown={onResizeHandleMouseDown}
            onScreenDimensions={onScreenDimensions}
            drawRect={drawRect}
            isHotspotDragging={hotspotInteraction?.mode === "hotspot-drag"}
            onUpdateDescription={updateScreenDescription}
            onAddState={addState}
            onDropImage={handleDropImage}
            activeTool={activeTool}
            scopeRoot={scopeRoot}
            isInScope={scopeScreenIds ? scopeScreenIds.has(screen.id) : undefined}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = canvasRef.current?.getBoundingClientRect();
              setGroupContextMenu({ screenId: screen.id, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
            }}
            isMultiSelected={canvasSelection.some((i) => i.type === "screen" && i.id === screen.id)}
            onToggleSelect={toggleSelection}
            onMultiDragStart={onMultiDragStart}
            isReadOnly={isReadOnly}
          />
        ))}
        {stickyNotes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            zoom={zoom}
            onUpdate={updateStickyNote}
            onDelete={deleteStickyNote}
            selected={selectedStickyNote === note.id}
            onSelect={(id) => {
              setSelectedStickyNote(id);
              setSelectedScreen(null);
              setSelectedConnection(null);
              setHotspotInteraction(null);
              setSelectedScreenGroup(null);
            }}
            isMultiSelected={canvasSelection.some((i) => i.type === "sticky" && i.id === note.id)}
            onToggleSelect={toggleSelection}
            onMultiDragStart={onMultiDragStart}
            onDragStart={(e, id) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startY = e.clientY;
              const origX = note.x;
              const origY = note.y;
              const onMove = (me) => {
                const dx = (me.clientX - startX) / zoom;
                const dy = (me.clientY - startY) / zoom;
                updateStickyNote(id, { x: origX + dx, y: origY + dy });
              };
              const onUp = () => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
        ))}
        <SelectionOverlay rubberBandRect={rubberBandRect} />
        <ConnectionLines
          screens={screens}
          connections={connections}
          previewLine={previewLine}
          hotspotPreviewLine={hotspotPreviewLine}
          selectedConnectionId={selectedConnection}
          onConnectionClick={onConnectionClick}
          onConnectionDoubleClick={onConnectionDoubleClick}
          onEndpointMouseDown={onEndpointMouseDown}
          endpointDragPreview={endpointDragPreview}
        />
        {repositionGhost && (
          <div
            style={{
              position: "absolute",
              left: repositionGhost.x,
              top: repositionGhost.y,
              width: repositionGhost.width,
              height: repositionGhost.height,
              border: `2px dashed ${COLORS.accent}`,
              borderRadius: 6,
              background: COLORS.accent01,
              pointerEvents: "none",
              opacity: 0.8,
            }}
          />
        )}
        {conditionalPrompt && (
          <ConditionalPrompt
            x={conditionalPrompt.x}
            y={conditionalPrompt.y}
            onConfirm={onConditionalPromptConfirm}
            onCancel={onConditionalPromptCancel}
          />
        )}
        {collab.isConnected && <RemoteCursors cursors={collab.remoteCursors} />}
        {editingConditionGroup && (
          <InlineConditionLabels
            connections={connections}
            screens={screens}
            conditionGroupId={editingConditionGroup}
            onUpdateLabel={updateConnection}
            onDone={() => setEditingConditionGroup(null)}
          />
        )}
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

      {/* Screen group context menu */}
      {groupContextMenu && (
        <div
          style={{
            position: "absolute",
            left: groupContextMenu.x,
            top: groupContextMenu.y,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: "6px 0",
            zIndex: Z_INDEX.contextMenu,
            minWidth: 180,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
          onMouseLeave={() => setGroupContextMenu(null)}
        >
          <div style={{
            fontSize: 9,
            color: COLORS.textDim,
            fontFamily: FONTS.mono,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "4px 14px 6px",
          }}>
            Add to Group
          </div>
          {screenGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                addScreenToGroup(g.id, groupContextMenu.screenId);
                setGroupContextMenu(null);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 14px",
                background: "none",
                border: "none",
                color: COLORS.text,
                fontFamily: FONTS.mono,
                fontSize: 12,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {g.name}
            </button>
          ))}
          <div style={{ height: 1, background: COLORS.border, margin: "4px 0" }} />
          <button
            onClick={() => {
              const name = prompt("New group name:");
              if (!name?.trim()) return;
              addScreenGroup(name.trim(), [groupContextMenu.screenId]);
              setGroupContextMenu(null);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "6px 14px",
              background: "none",
              border: "none",
              color: COLORS.accentLight,
              fontFamily: FONTS.mono,
              fontSize: 12,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            + Create new group...
          </button>
          <button
            onClick={() => {
              removeScreenFromGroup(groupContextMenu.screenId);
              setGroupContextMenu(null);
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "6px 14px",
              background: "none",
              border: "none",
              color: COLORS.textDim,
              fontFamily: FONTS.mono,
              fontSize: 12,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            Remove from group
          </button>
        </div>
      )}

      {/* Tool switcher */}
      <ToolBar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUpload={handleImageUpload}
        onAddBlank={() => addScreenAtCenter()}
        isReadOnly={isReadOnly}
        onAddStickyNote={() => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const worldX = (rect.width / 2 - pan.x) / zoom;
          const worldY = (rect.height / 2 - pan.y) / zoom;
          addStickyNote(worldX, worldY);
        }}
      />
    </div>
  );
}

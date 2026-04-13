import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT } from "../constants";
import { copyScreenForFigma, copyScreensForFigma, copyScreensForFigmaEditable, downloadScreenSvg } from "../utils/copyToFigma";
import { copyScreensAsImage } from "../utils/copyAsImage";
import { ScreenNode } from "./ScreenNode";
import { ConnectionLines } from "./ConnectionLines";
import { ConditionalPrompt } from "./ConditionalPrompt";
import { ConnectionTypePrompt } from "./ConnectionTypePrompt";
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
  isReadOnly, onFormSummary,
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
  // Connection type prompt
  connectionTypePrompt, onConnectionTypeNavigate, onConnectionTypeStateVariant,
  // Collaboration
  collab,
  // Inline condition labels
  editingConditionGroup, updateConnection, setEditingConditionGroup,
  // Group context menu
  groupContextMenu, setGroupContextMenu,
  duplicateSelection, setCanvasSelection,
  // ToolBar
  setActiveTool, handleImageUpload, addScreenAtCenter,
  onAddWireframe, onEditWireframe,
  showToast,
  // Drop zone overlay
  isDraggingOver, onCanvasDragEnter, onCanvasDragLeave,
  // Templates
  onTemplates,
  // MCP flash
  mcpFlashIds,
  // Comments
  comments, canComment, onCommentImageClick, onCommentConnectionClick,
  selectedCommentId, onCommentPinClick, onDeselectComment,
}) {
  return (
    <>
    {activeTool === "comment" && (
      <style>{`[data-canvas-area] * { cursor: inherit !important; }`}</style>
    )}
    <div
      data-canvas-area
      ref={canvasRef}
      onMouseDown={(e) => {
        if (connectionTypePrompt) { onConnectionTypeNavigate(); return; }
        onCanvasMouseDown(e);
      }}
      onMouseMove={onCanvasMouseMove}
      onMouseUp={onCanvasMouseUp}
      onMouseLeave={onCanvasMouseLeave}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onCanvasDragEnter}
      onDragLeave={onCanvasDragLeave}
      onDrop={onCanvasDrop}
      onClick={() => {
        if (groupContextMenu) setGroupContextMenu(null);
      }}
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
      {isDraggingOver && (
        <div
          data-testid="drop-zone-overlay"
          style={{
            position: "absolute",
            inset: 0,
            background: COLORS.accent008,
            border: `2px dashed ${COLORS.accent}`,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: Z_INDEX.contextMenu,
            pointerEvents: "none",
          }}
        >
          <span style={{
            color: COLORS.accent,
            fontFamily: FONTS.mono,
            fontSize: 16,
            fontWeight: 600,
          }}>
            Drop images to create screens
          </span>
        </div>
      )}
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
            onFormSummary={onFormSummary}
            mcpFlash={mcpFlashIds?.has(screen.id)}
            commentPins={(comments || []).filter(
              (c) => c.screenId === screen.id && c.targetType === "screen" && !c.resolved
            )}
            onCommentImageClick={onCommentImageClick}
            selectedCommentId={selectedCommentId}
            onCommentPinClick={onCommentPinClick}
            onDeselectComment={onDeselectComment}
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
            mcpFlash={mcpFlashIds?.has(note.id)}
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
          mcpFlashIds={mcpFlashIds}
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
        {connectionTypePrompt && (
          <ConnectionTypePrompt
            x={connectionTypePrompt.x}
            y={connectionTypePrompt.y}
            onNavigate={onConnectionTypeNavigate}
            onStateVariant={onConnectionTypeStateVariant}
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

      {screens.length === 0 && <EmptyState onTemplates={onTemplates} />}

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
      {groupContextMenu && (() => {
        const ctxScreen = screens.find((s) => s.id === groupContextMenu.screenId);
        const selectedScreenIds = canvasSelection.filter((i) => i.type === "screen").map((i) => i.id);
        const isInSelection = selectedScreenIds.includes(groupContextMenu.screenId);
        const copyTargetIds = isInSelection && selectedScreenIds.length > 1
          ? selectedScreenIds
          : [groupContextMenu.screenId];
        const copyTargetScreens = copyTargetIds.map((id) => screens.find((s) => s.id === id)).filter(Boolean);
        const figmaExportCount = copyTargetScreens.filter((s) => s.svgContent || s.wireframe).length;
        const hasFigmaExport = figmaExportCount > 0;
        const hasSourceHtml = copyTargetScreens.some((s) => s.sourceHtml);
        return (
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
            minWidth: 190,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
          onMouseLeave={() => setGroupContextMenu(null)}
        >
          {!isReadOnly && (
            <>
              <button
                onClick={() => {
                  const selScreenIds = canvasSelection.filter((i) => i.type === "screen").map((i) => i.id);
                  const ids = selScreenIds.length > 0 ? selScreenIds : [groupContextMenu.screenId];
                  const newIds = duplicateSelection(ids);
                  setCanvasSelection(newIds.map((id) => ({ type: "screen", id })));
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
                {canvasSelection.filter((i) => i.type === "screen").length > 1
                  ? "Duplicate Selection"
                  : "Duplicate Screen"}
              </button>
              {ctxScreen?.wireframe && (
                <button
                  onClick={() => {
                    onEditWireframe?.(groupContextMenu.screenId);
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
                  Edit Wireframe
                </button>
              )}
              <div style={{ height: 1, background: COLORS.border, margin: "4px 0" }} />
            </>
          )}
          <button
            onClick={async () => {
              setGroupContextMenu(null);
              try {
                const count = await copyScreensAsImage(copyTargetScreens);
                if (count && showToast) {
                  showToast(count > 1
                    ? `${count} screens copied as image`
                    : "Screen copied as image");
                } else if (!count && showToast) {
                  showToast("No image content to copy");
                }
              } catch (e) {
                if (showToast) showToast(`Copy failed: ${e.message}`);
              }
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
            {copyTargetIds.length > 1
              ? `Copy ${copyTargetIds.length} Screens as Image`
              : "Copy as Image"}
          </button>
          {hasFigmaExport && (
            <>
              <button
                onClick={async () => {
                  const count = await copyScreensForFigma(copyTargetScreens);
                  setGroupContextMenu(null);
                  if (count && showToast) {
                    showToast(count > 1
                      ? `${count} screens copied — paste in Figma`
                      : "SVG copied — paste in Figma");
                  }
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
                {copyTargetIds.length > 1
                  ? `Copy ${figmaExportCount} Screen${figmaExportCount > 1 ? "s" : ""} for Figma`
                  : "Copy for Figma"}
              </button>
              {hasSourceHtml && (
                <button
                  onClick={async () => {
                    setGroupContextMenu(null);
                    try {
                      const count = await copyScreensForFigmaEditable(
                        copyTargetScreens.filter((s) => s.sourceHtml),
                      );
                      if (count && showToast) {
                        showToast(`${count} editable screen${count > 1 ? "s" : ""} copied — paste in Figma`);
                      }
                    } catch (e) {
                      if (showToast) showToast(`API error: ${e.message}`);
                    }
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "6px 14px",
                    background: "none",
                    border: "none",
                    color: COLORS.accent,
                    fontFamily: FONTS.mono,
                    fontSize: 12,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  Copy for Figma (editable)
                </button>
              )}
              <button
                onClick={() => {
                  downloadScreenSvg(ctxScreen);
                  setGroupContextMenu(null);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "6px 14px",
                  background: "none",
                  border: "none",
                  color: COLORS.textMuted,
                  fontFamily: FONTS.mono,
                  fontSize: 12,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                Download SVG
              </button>
              <div style={{ height: 1, background: COLORS.border, margin: "4px 0" }} />
            </>
          )}
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
        );
      })()}

      {/* Tool switcher */}
      <ToolBar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onUpload={handleImageUpload}
        onAddBlank={() => addScreenAtCenter()}
        isReadOnly={isReadOnly}
        canComment={canComment}
        onAddStickyNote={() => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const worldX = (rect.width / 2 - pan.x) / zoom;
          const worldY = (rect.height / 2 - pan.y) / zoom;
          addStickyNote(worldX, worldY);
        }}
        onTemplates={onTemplates}
        onAddWireframe={onAddWireframe}
      />
    </div>
    </>
  );
}

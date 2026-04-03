import { useState, useRef, useCallback, useEffect } from "react";
import { COLORS, FONTS, Z_INDEX } from "../../styles/theme";
import { useWireframeEditor } from "../../hooks/useWireframeEditor";
import { wireframeToPng } from "../../utils/wireframeRenderer";
import { ComponentPalette } from "./ComponentPalette";
import { PropertyPanel } from "./PropertyPanel";
import { WIREFRAME_GRID_SIZE } from "../../constants";

const CANVAS_PADDING = 48;
const RESIZE_HANDLE_SIZE = 8;

/**
 * Full-screen overlay wireframe editor.
 * Uses an SVG canvas for rendering with mouse-based drag/resize interaction.
 */
export function WireframeEditor({ screenId, initialComponents, viewport, screenName, onSave, onCancel }) {
  const editor = useWireframeEditor(initialComponents || [], viewport || { width: 393, height: 852 });
  const {
    components, selectedId, setSelectedId, selectedComponent, viewport: vp,
    addComponent, updateComponent, updateComponentStyle,
    setComponentPosition, resizeComponent, deleteComponent, duplicateComponent,
    captureDragSnapshot, undo, redo, canUndo, canRedo,
  } = editor;

  const [isSaving, setIsSaving] = useState(false);

  // Drag state
  const dragRef = useRef(null);
  // Resize state
  const resizeRef = useRef(null);

  // SVG canvas element ref
  const svgRef = useRef(null);

  const getSvgPoint = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = vp.width / rect.width;
    const scaleY = vp.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [vp]);

  const handleMouseDown = useCallback((e, compId) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelectedId(compId);

    const pt = getSvgPoint(e);
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;

    captureDragSnapshot();
    dragRef.current = {
      id: compId,
      startX: pt.x,
      startY: pt.y,
      origX: comp.x,
      origY: comp.y,
    };
  }, [components, getSvgPoint, setSelectedId, captureDragSnapshot]);

  const handleResizeMouseDown = useCallback((e, compId) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = getSvgPoint(e);
    const comp = components.find((c) => c.id === compId);
    if (!comp) return;
    captureDragSnapshot();
    resizeRef.current = {
      id: compId,
      startX: pt.x,
      startY: pt.y,
      origW: comp.width,
      origH: comp.height,
    };
  }, [components, getSvgPoint, captureDragSnapshot]);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current && !resizeRef.current) return;
    const pt = getSvgPoint(e);
    if (dragRef.current) {
      const { id, startX, startY, origX, origY } = dragRef.current;
      const dx = pt.x - startX;
      const dy = pt.y - startY;
      setComponentPosition(id, origX + dx, origY + dy);
    }
    if (resizeRef.current) {
      const { id, startX, startY, origW, origH } = resizeRef.current;
      const dw = pt.x - startX;
      const dh = pt.y - startY;
      resizeComponent(id, origW + dw, origH + dh);
    }
  }, [getSvgPoint, setComponentPosition, resizeComponent]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === "svg") {
      setSelectedId(null);
    }
  }, [setSelectedId]);

  // Drop from palette
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("wireframe/type");
    if (!type) return;
    const pt = getSvgPoint(e);
    addComponent(type, pt.x, pt.y);
  }, [getSvgPoint, addComponent]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "d") { e.preventDefault(); if (selectedId) duplicateComponent(selectedId); return; }
      if (e.key === "Backspace" || e.key === "Delete") { if (selectedId) deleteComponent(selectedId); return; }
      if (e.key === "Escape") { onCancel?.(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, undo, redo, duplicateComponent, deleteComponent, onCancel]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const imageData = await wireframeToPng({ components, viewport: vp });
      onSave(screenId, components, vp, imageData);
    } finally {
      setIsSaving(false);
    }
  }, [components, vp, screenId, onSave]);

  const handleAddFromPalette = useCallback((type) => {
    // Place at center of viewport
    addComponent(type, vp.width / 2 - 60, vp.height / 2 - 22);
  }, [addComponent, vp]);

  // Compute display scale to fit in available space
  const maxPreviewHeight = "calc(100vh - 110px)";
  const viewBox = `0 0 ${vp.width} ${vp.height}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: Z_INDEX.modal + 10,
        background: COLORS.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{
        height: 52,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        borderBottom: `1px solid ${COLORS.border}`,
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: COLORS.text }}>
          Wireframe — {screenName || "New Screen"}
        </span>

        <div style={{ flex: 1 }} />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (⌘Z)"
          style={headerBtn(!canUndo)}
        >
          ↩
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (⌘⇧Z)"
          style={headerBtn(!canRedo)}
        >
          ↪
        </button>

        <div style={{ width: 1, height: 20, background: COLORS.border, margin: "0 4px" }} />

        <button onClick={onCancel} style={headerBtn(false)}>Cancel</button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: "6px 16px",
            background: COLORS.accent,
            border: "none",
            borderRadius: 6,
            color: "#fff",
            fontFamily: FONTS.mono,
            fontSize: 12,
            cursor: isSaving ? "wait" : "pointer",
            fontWeight: "bold",
          }}
        >
          {isSaving ? "Saving..." : "Done"}
        </button>
      </div>

      {/* Body: palette + canvas + properties */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <ComponentPalette onAddComponent={handleAddFromPalette} />

        {/* Canvas area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            background: COLORS.canvasBg,
            padding: CANVAS_PADDING,
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            ref={svgRef}
            viewBox={viewBox}
            onClick={handleCanvasClick}
            style={{
              maxHeight: maxPreviewHeight,
              maxWidth: `calc(100vw - 360px)`,
              aspectRatio: `${vp.width} / ${vp.height}`,
              background: "#ffffff",
              borderRadius: 8,
              boxShadow: "0 8px 40px rgba(0,0,0,0.7)",
              display: "block",
              cursor: "default",
            }}
          >
            {/* Background */}
            <rect width={vp.width} height={vp.height} fill="#ffffff" />

            {/* Grid dots */}
            <defs>
              <pattern id="wf-grid" width={WIREFRAME_GRID_SIZE} height={WIREFRAME_GRID_SIZE} patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.5" fill="#e0e0e0" />
              </pattern>
            </defs>
            <rect width={vp.width} height={vp.height} fill="url(#wf-grid)" />

            {/* Components */}
            {components.map((c) => {
              const isSelected = c.id === selectedId;
              return (
                <g key={c.id}>
                  {/* Render via SVG string injection -- dangerouslySetInnerHTML not available on SVG g.
                      Instead, use a foreignObject with the SVG string, OR re-implement per component.
                      We'll use a direct per-component rendering approach for editor interactivity. */}
                  <ComponentShape component={c} />

                  {/* Hit area for selection */}
                  <rect
                    x={c.x}
                    y={c.y}
                    width={c.width}
                    height={c.height}
                    fill="transparent"
                    stroke={isSelected ? "#007AFF" : "transparent"}
                    strokeWidth={isSelected ? 2 : 0}
                    strokeDasharray={isSelected ? "none" : "none"}
                    style={{ cursor: "move" }}
                    onMouseDown={(e) => handleMouseDown(e, c.id)}
                  />

                  {/* Resize handle (bottom-right) */}
                  {isSelected && (
                    <rect
                      x={c.x + c.width - RESIZE_HANDLE_SIZE / 2}
                      y={c.y + c.height - RESIZE_HANDLE_SIZE / 2}
                      width={RESIZE_HANDLE_SIZE}
                      height={RESIZE_HANDLE_SIZE}
                      fill="#007AFF"
                      rx={2}
                      style={{ cursor: "se-resize" }}
                      onMouseDown={(e) => handleResizeMouseDown(e, c.id)}
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <PropertyPanel
          component={selectedComponent}
          onUpdate={(updates) => selectedId && updateComponent(selectedId, updates)}
          onUpdateStyle={(styleUpdates) => selectedId && updateComponentStyle(selectedId, styleUpdates)}
          onDelete={() => selectedId && deleteComponent(selectedId)}
          onDuplicate={() => selectedId && duplicateComponent(selectedId)}
        />
      </div>
    </div>
  );
}

function headerBtn(disabled) {
  return {
    padding: "6px 12px",
    background: "none",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 6,
    color: disabled ? COLORS.textMuted : COLORS.text,
    fontFamily: FONTS.mono,
    fontSize: 12,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
  };
}

// ── Per-component SVG shape renderer ──────────────────────────────────────────

function ComponentShape({ component: c }) {
  const { type, x, y, width: w, height: h, text, style = {} } = c;
  const fill = style.fill || "#f0f0f0";
  const stroke = style.stroke && style.stroke !== "none" ? style.stroke : "none";
  const rx = style.borderRadius || 0;
  const fs = style.fontSize || 13;
  const fw = style.fontWeight === "bold" ? "bold" : "normal";
  const textFill = (fill === "#333333" || fill === "#666666") ? "#ffffff" : "#333333";

  switch (type) {
    case "rect":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={fill} rx={rx} stroke={stroke} strokeWidth={stroke !== "none" ? 1 : 0} />
        </g>
      );

    case "text":
      return (
        <g>
          <text x={x + 4} y={y + h / 2 + fs * 0.35} fontFamily="Inter, sans-serif" fontSize={fs} fontWeight={fw} fill="#333333">
            {text}
          </text>
        </g>
      );

    case "button": {
      const btnFill = style.fill || "#333333";
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={btnFill} rx={rx || 8} />
          <text x={x + w / 2} y={y + h / 2 + 5} fontFamily="Inter, sans-serif" fontSize={fs} fontWeight="bold" fill="#ffffff" textAnchor="middle">
            {text}
          </text>
        </g>
      );
    }

    case "input":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={fill} rx={rx || 6} stroke={stroke || "#cccccc"} strokeWidth={1} />
          <text x={x + 12} y={y + h / 2 + 5} fontFamily="Inter, sans-serif" fontSize={fs} fill="#aaaaaa">
            {text}
          </text>
        </g>
      );

    case "icon":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={fill} rx={Math.min(w, h) / 4} />
        </g>
      );

    case "image-placeholder": {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={fill} rx={rx || 4} stroke={stroke || "#cccccc"} strokeWidth={1} />
          <line x1={x + 8} y1={y + 8} x2={x + w - 8} y2={y + h - 8} stroke="#cccccc" strokeWidth={1.5} strokeLinecap="round" />
          <line x1={x + w - 8} y1={y + 8} x2={x + 8} y2={y + h - 8} stroke="#cccccc" strokeWidth={1.5} strokeLinecap="round" />
          <text x={cx} y={cy + 4} fontFamily="Inter, sans-serif" fontSize={11} fill="#999999" textAnchor="middle">
            {text || "Image"}
          </text>
        </g>
      );
    }

    case "list-item":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={fill} />
          <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={stroke || "#eeeeee"} strokeWidth={1} />
          <text x={x + 16} y={y + h / 2 + 5} fontFamily="Inter, sans-serif" fontSize={fs} fill="#333333">
            {text}
          </text>
          <polyline points={`${x + w - 20},${y + h / 2 - 5} ${x + w - 12},${y + h / 2} ${x + w - 20},${y + h / 2 + 5}`} fill="none" stroke="#cccccc" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );

    case "nav-bar":
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={fill} />
          <line x1={x} y1={y + h} x2={x + w} y2={y + h} stroke={stroke || "#eeeeee"} strokeWidth={1} />
          <text x={x + w / 2} y={y + h / 2 + 6} fontFamily="Inter, sans-serif" fontSize={fs} fontWeight="bold" fill="#000000" textAnchor="middle">
            {text}
          </text>
        </g>
      );

    case "tab-bar": {
      const tabs = text ? text.split(",").map((t) => t.trim()) : ["Tab1", "Tab2", "Tab3"];
      const tabW = w / tabs.length;
      return (
        <g>
          <rect x={x} y={y} width={w} height={h} fill={fill} />
          <line x1={x} y1={y} x2={x + w} y2={y} stroke={stroke || "#eeeeee"} strokeWidth={1} />
          {tabs.map((tab, i) => {
            const tabCx = x + tabW * i + tabW / 2;
            const tabColor = i === 0 ? "#007AFF" : "#8e8e93";
            return (
              <g key={i}>
                <circle cx={tabCx} cy={y + 14} r={6} fill={tabColor} opacity={0.3} />
                <text x={tabCx} y={y + 38} fontFamily="Inter, sans-serif" fontSize={fs || 10} fill={tabColor} textAnchor="middle">
                  {tab}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    case "divider":
      return (
        <line x1={x} y1={y} x2={x + w} y2={y} stroke={fill || "#cccccc"} strokeWidth={1} />
      );

    default:
      return (
        <rect x={x} y={y} width={w} height={h} fill={fill} rx={rx} />
      );
  }
}

import { useState, useRef, useCallback } from "react";
import { COLORS, FONTS } from "../styles/theme";

export function ScreenNode({
  screen, selected, onSelect, onDragStart, onAddHotspot, onRemoveScreen,
  onDotDragStart, onConnectTarget, onHoverTarget, isConnectHoverTarget, isConnecting,
  selectedHotspotId, onHotspotMouseDown, onImageAreaMouseDown, onHotspotDragHandleMouseDown,
  onResizeHandleMouseDown, onScreenDimensions, drawRect, isHotspotDragging,
  onUpdateDescription, isSpaceHeld, onAddState, onDropImage,
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const imgRef = useRef(null);

  const borderColor = isConnectHoverTarget
    ? COLORS.success
    : selected ? COLORS.borderActive : COLORS.border;

  const handleImgLoad = useCallback(() => {
    setImgLoaded(true);
    if (imgRef.current && onScreenDimensions) {
      onScreenDimensions(screen.id, imgRef.current.naturalWidth, imgRef.current.offsetHeight);
    }
  }, [screen.id, onScreenDimensions]);

  return (
    <div
      onMouseDown={(e) => {
        if (isSpaceHeld?.current) return;
        if (e.target.closest(".hotspot-area") || e.target.closest(".screen-btn")) return;
        if (e.target.closest(".connection-dot-right")) return;
        if (e.target.closest(".hotspot-drag-handle")) return;
        if (e.target.closest(".description-area")) return;
        onSelect(screen.id);
        onDragStart(e, screen.id);
      }}
      onMouseUp={() => {
        if (isConnecting) onConnectTarget?.(screen.id);
        if (isHotspotDragging) onConnectTarget?.(screen.id);
      }}
      onMouseEnter={() => {
        if (isConnecting) onHoverTarget?.(screen.id);
        if (isHotspotDragging) onHoverTarget?.(screen.id);
      }}
      onMouseLeave={() => {
        if (isConnecting) onHoverTarget?.(null);
        if (isHotspotDragging) onHoverTarget?.(null);
        if (!screen.imageData) setIsDragOver(false);
      }}
      onDragOver={!screen.imageData ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
      } : undefined}
      onDragLeave={!screen.imageData ? (e) => {
        e.stopPropagation();
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
      } : undefined}
      onDrop={!screen.imageData ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
        if (files.length > 0 && onDropImage) {
          onDropImage(screen.id, files[0]);
        }
      } : undefined}
      style={{
        position: "absolute",
        left: screen.x,
        top: screen.y,
        width: screen.width || 220,
        minHeight: 80,
        background: isDragOver ? "rgba(0,210,211,0.05)" : COLORS.screenBg,
        border: `2px solid ${isDragOver ? COLORS.success : borderColor}`,
        borderRadius: 14,
        cursor: isConnecting || isHotspotDragging ? "default" : "grab",
        boxShadow: isDragOver
          ? `0 0 30px rgba(0,210,211,0.3), 0 8px 32px rgba(0,0,0,0.5)`
          : isConnectHoverTarget
            ? `0 0 30px rgba(0,210,211,0.3), 0 8px 32px rgba(0,0,0,0.5)`
            : selected
              ? `0 0 30px ${COLORS.accentGlow}, 0 8px 32px rgba(0,0,0,0.5)`
              : "0 4px 20px rgba(0,0,0,0.4)",
        transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 10px",
          background: selected ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.02)",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: selected ? COLORS.accentLight : COLORS.text,
            letterSpacing: "0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontFamily: FONTS.mono,
          }}
        >
          {screen.name}
          {screen.stateGroup && screen.stateName && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 500,
                color: COLORS.accent,
                background: "rgba(108,92,231,0.15)",
                border: "1px solid rgba(108,92,231,0.25)",
                borderRadius: 4,
                padding: "1px 5px",
                marginLeft: 4,
                whiteSpace: "nowrap",
              }}
            >
              {screen.stateName}
            </span>
          )}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="screen-btn"
            onClick={(e) => { e.stopPropagation(); onAddState?.(screen.id); }}
            title="Add screen state variant"
            style={{
              background: "rgba(108,92,231,0.1)",
              border: "1px solid rgba(108,92,231,0.2)",
              borderRadius: 6,
              color: COLORS.accentLight,
              fontSize: 10,
              padding: "2px 6px",
              cursor: "pointer",
              fontFamily: FONTS.mono,
            }}
          >
            S+
          </button>
          <button
            className="screen-btn"
            onClick={(e) => { e.stopPropagation(); onAddHotspot(screen.id); }}
            title="Add tap area / button link"
            style={{
              background: "rgba(108,92,231,0.15)",
              border: "1px solid rgba(108,92,231,0.3)",
              borderRadius: 6,
              color: COLORS.accentLight,
              fontSize: 11,
              padding: "2px 7px",
              cursor: "pointer",
              fontFamily: FONTS.mono,
            }}
          >
            + Link
          </button>
          <button
            className="screen-btn"
            onClick={(e) => { e.stopPropagation(); onRemoveScreen(screen.id); }}
            title="Remove screen"
            style={{
              background: "rgba(255,107,107,0.1)",
              border: "1px solid rgba(255,107,107,0.25)",
              borderRadius: 6,
              color: COLORS.danger,
              fontSize: 11,
              padding: "2px 7px",
              cursor: "pointer",
              fontFamily: FONTS.mono,
            }}
          >
            x
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="screen-image-area"
        style={{ position: "relative", minHeight: 120, background: "#0d0d15" }}
        onMouseDown={(e) => {
          if (isSpaceHeld?.current) return;
          if (e.target.closest(".hotspot-area") || e.target.closest(".hotspot-drag-handle") || e.target.closest(".resize-handle")) return;
          if (screen.imageData && onImageAreaMouseDown) {
            onImageAreaMouseDown(e, screen.id);
          }
        }}
      >
        {screen.imageData ? (
          <>
            <img
              ref={imgRef}
              src={screen.imageData}
              alt={screen.name}
              onLoad={handleImgLoad}
              draggable={false}
              style={{
                width: "100%",
                display: "block",
                opacity: imgLoaded ? 1 : 0,
                transition: "opacity 0.3s",
              }}
            />
            {(screen.hotspots || []).map((hs) => {
              const isSelected = hs.id === selectedHotspotId;
              return (
                <div
                  key={hs.id}
                  className="hotspot-area"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (onHotspotMouseDown) onHotspotMouseDown(e, screen.id, hs.id);
                  }}
                  style={{
                    position: "absolute",
                    left: `${hs.x}%`,
                    top: `${hs.y}%`,
                    width: `${hs.w}%`,
                    height: `${hs.h}%`,
                    background: isSelected
                      ? "rgba(108,92,231,0.3)"
                      : hs.targetScreenId ? "rgba(0,210,211,0.15)" : COLORS.hotspot,
                    border: isSelected
                      ? `2px solid ${COLORS.accent}`
                      : `2px dashed ${hs.targetScreenId ? COLORS.success : COLORS.hotspotBorder}`,
                    borderRadius: 6,
                    cursor: isSelected ? "grab" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    color: isSelected ? COLORS.accent : hs.targetScreenId ? COLORS.success : COLORS.accentLight,
                    fontFamily: FONTS.mono,
                    fontWeight: 600,
                    textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    boxShadow: isSelected ? `0 0 12px ${COLORS.accentGlow}` : "none",
                  }}
                  title={hs.label || "Tap area"}
                >
                  {hs.label || "TAP"}
                  {/* Drag handle for hotspot-to-screen connect */}
                  {isSelected && (
                    <div
                      className="hotspot-drag-handle"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (onHotspotDragHandleMouseDown) {
                          onHotspotDragHandleMouseDown(e, screen.id, hs.id);
                        }
                      }}
                      style={{
                        position: "absolute",
                        right: -6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: COLORS.success,
                        border: `2px solid ${COLORS.surface}`,
                        boxShadow: `0 0 8px rgba(0,210,211,0.5)`,
                        cursor: "crosshair",
                        zIndex: 2,
                      }}
                      title="Drag to connect to another screen"
                    />
                  )}
                  {/* Resize handles */}
                  {isSelected && ["nw","n","ne","e","se","s","sw","w"].map((handle) => {
                    const pos = {
                      nw: { left: -4, top: -4, cursor: "nwse-resize" },
                      n:  { left: "50%", top: -4, cursor: "ns-resize", transform: "translateX(-50%)" },
                      ne: { right: -4, top: -4, cursor: "nesw-resize" },
                      e:  { right: -4, top: "50%", cursor: "ew-resize", transform: "translateY(-50%)" },
                      se: { right: -4, bottom: -4, cursor: "nwse-resize" },
                      s:  { left: "50%", bottom: -4, cursor: "ns-resize", transform: "translateX(-50%)" },
                      sw: { left: -4, bottom: -4, cursor: "nesw-resize" },
                      w:  { left: -4, top: "50%", cursor: "ew-resize", transform: "translateY(-50%)" },
                    }[handle];
                    return (
                      <div
                        key={handle}
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (onResizeHandleMouseDown) {
                            onResizeHandleMouseDown(e, screen.id, hs.id, handle);
                          }
                        }}
                        style={{
                          position: "absolute",
                          width: 8,
                          height: 8,
                          background: COLORS.accent,
                          border: `1px solid ${COLORS.surface}`,
                          borderRadius: 2,
                          zIndex: 3,
                          ...pos,
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
            {/* Draw rectangle preview */}
            {drawRect && drawRect.screenId === screen.id && (
              <div
                style={{
                  position: "absolute",
                  left: `${drawRect.x}%`,
                  top: `${drawRect.y}%`,
                  width: `${drawRect.w}%`,
                  height: `${drawRect.h}%`,
                  background: "rgba(108,92,231,0.2)",
                  border: `2px dashed ${COLORS.accent}`,
                  borderRadius: 6,
                  pointerEvents: "none",
                }}
              />
            )}
          </>
        ) : (
          <div
            className="description-area"
            style={{
              padding: 16,
              textAlign: "center",
              color: COLORS.textDim,
              fontSize: 12,
              fontFamily: FONTS.mono,
              minHeight: 88,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {isDragOver && (
              <div
                style={{
                  position: "absolute",
                  inset: 4,
                  border: `2px dashed ${COLORS.success}`,
                  borderRadius: 8,
                  background: "rgba(0,210,211,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.success,
                  fontSize: 11,
                  fontFamily: FONTS.mono,
                  fontWeight: 600,
                  zIndex: 5,
                  pointerEvents: "none",
                }}
              >
                Drop image here
              </div>
            )}
            {isEditingDesc ? (
              <div style={{ width: "100%", textAlign: "left" }}>
                <textarea
                  autoFocus
                  maxLength={500}
                  value={draftDesc}
                  onChange={(e) => setDraftDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      const val = draftDesc.trim();
                      onUpdateDescription?.(screen.id, val);
                      setIsEditingDesc(false);
                    }
                    if (e.key === "Escape") {
                      setIsEditingDesc(false);
                    }
                  }}
                  onBlur={() => {
                    const val = draftDesc.trim();
                    onUpdateDescription?.(screen.id, val);
                    setIsEditingDesc(false);
                  }}
                  style={{
                    width: "100%",
                    minHeight: 60,
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${COLORS.accent}`,
                    borderRadius: 6,
                    color: COLORS.text,
                    fontSize: 11,
                    fontFamily: FONTS.mono,
                    padding: 8,
                    resize: "vertical",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                  placeholder="Describe this screen..."
                />
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 6,
                }}>
                  <span style={{ fontSize: 9, color: COLORS.textDim }}>
                    {draftDesc.length}/500
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsEditingDesc(false);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 4,
                        color: COLORS.textDim,
                        fontSize: 10,
                        padding: "2px 8px",
                        cursor: "pointer",
                        fontFamily: FONTS.mono,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const val = draftDesc.trim();
                        onUpdateDescription?.(screen.id, val);
                        setIsEditingDesc(false);
                      }}
                      style={{
                        background: "rgba(108,92,231,0.2)",
                        border: `1px solid rgba(108,92,231,0.4)`,
                        borderRadius: 4,
                        color: COLORS.accentLight,
                        fontSize: 10,
                        padding: "2px 8px",
                        cursor: "pointer",
                        fontFamily: FONTS.mono,
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : screen.description ? (
              <div
                onClick={() => {
                  setDraftDesc(screen.description);
                  setIsEditingDesc(true);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  color: COLORS.textMuted,
                  fontSize: 11,
                  lineHeight: 1.5,
                  cursor: "text",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
                title="Click to edit description"
              >
                {screen.description}
              </div>
            ) : (
              <button
                onClick={() => {
                  setDraftDesc("");
                  setIsEditingDesc(true);
                }}
                style={{
                  background: "rgba(108,92,231,0.1)",
                  border: `1px dashed rgba(108,92,231,0.3)`,
                  borderRadius: 8,
                  color: COLORS.accentLight,
                  fontSize: 11,
                  padding: "8px 16px",
                  cursor: "pointer",
                  fontFamily: FONTS.mono,
                }}
              >
                + Add Description
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right connection dot -- draggable */}
      <div
        className="connection-dot-right"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDotDragStart?.(e, screen.id);
        }}
        style={{
          position: "absolute",
          right: -7,
          top: "50%",
          transform: "translateY(-50%)",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: COLORS.accent,
          border: `2px solid ${COLORS.surface}`,
          boxShadow: `0 0 10px ${COLORS.accentGlow}`,
          cursor: "crosshair",
          padding: 4,
          margin: -4,
          boxSizing: "content-box",
        }}
      />
      {/* Left connection dot */}
      <div
        style={{
          position: "absolute",
          left: -7,
          top: "50%",
          transform: "translateY(-50%)",
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: COLORS.border,
          border: `2px solid ${COLORS.surface}`,
        }}
      />
    </div>
  );
}

import { useState, useRef, useCallback } from "react";
import { FONTS, COLORS } from "../styles/theme";

const NOTE_COLORS = {
  yellow: { bg: "#2d2a00", border: "#f0c040", text: "#f5e17a", placeholder: "rgba(245,225,122,0.4)" },
  blue:   { bg: "#001a2d", border: "#4da6ff", text: "#a8d4ff", placeholder: "rgba(168,212,255,0.4)" },
  red:    { bg: "#2d0000", border: "#ff6b6b", text: "#ffb3b3", placeholder: "rgba(255,179,179,0.4)" },
  green:  { bg: "#002d0a", border: "#00d27d", text: "#7fffb8", placeholder: "rgba(127,255,184,0.4)" },
};

const COLOR_OPTIONS = ["yellow", "blue", "red", "green"];

export function StickyNote({ note, zoom, onUpdate, onDelete, onDragStart, isMultiSelected, onToggleSelect, onMultiDragStart, selected, onSelect }) {
  const [isEditing, setIsEditing] = useState(!note.content);
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef(null);
  const colors = NOTE_COLORS[note.color || "yellow"];

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest(".sticky-controls")) return;
    if (e.target.tagName === "TEXTAREA") return;
    if (e.shiftKey || e.metaKey) {
      e.stopPropagation();
      onToggleSelect?.("sticky", note.id);
      return;
    }
    if (isMultiSelected) {
      e.stopPropagation();
      onMultiDragStart?.(e);
      return;
    }
    onSelect?.(note.id);
    onDragStart?.(e, note.id);
  }, [note.id, onDragStart, isMultiSelected, onMultiDragStart, onToggleSelect, onSelect]);

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: note.x,
        top: note.y,
        width: note.width || 220,
        minHeight: 120,
        background: colors.bg,
        border: isMultiSelected
          ? `2px dashed ${COLORS.warning}`
          : selected
            ? `2px solid ${COLORS.accent}`
            : `1.5px solid ${colors.border}`,
        boxShadow: isMultiSelected
          ? `0 0 16px rgba(229,192,123,0.35), 0 4px 20px rgba(0,0,0,0.5)`
          : selected
            ? `0 0 30px ${COLORS.accentGlow}, 0 8px 32px rgba(0,0,0,0.5)`
            : `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${colors.border}22`,
        borderRadius: 10,
        cursor: "grab",
        userSelect: "none",
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          padding: "6px 10px",
          background: selected ? `${COLORS.accent}15` : `${colors.border}22`,
          borderBottom: `1px solid ${selected ? `${COLORS.accent}33` : `${colors.border}33`}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          cursor: "grab",
        }}
      >
        {/* Color dots */}
        <div className="sticky-controls" style={{ display: "flex", gap: 4 }}>
          {COLOR_OPTIONS.map((c) => (
            <div
              key={c}
              onClick={() => onUpdate(note.id, { color: c })}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: NOTE_COLORS[c].border,
                cursor: "pointer",
                border: note.color === c || (!note.color && c === "yellow")
                  ? "1.5px solid #fff"
                  : "1.5px solid transparent",
              }}
            />
          ))}
        </div>

        {note.author && (
          <span style={{ fontSize: 9, color: selected ? COLORS.accentLight : colors.text, opacity: 0.6, fontFamily: FONTS.mono, flex: 1, textAlign: "center" }}>
            {note.author}
          </span>
        )}

        {/* Delete button */}
        <button
          className="sticky-controls"
          onClick={() => onDelete(note.id)}
          style={{
            background: "none",
            border: "none",
            color: colors.border,
            cursor: "pointer",
            fontSize: 12,
            padding: 0,
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          ×
        </button>
      </div>

      {/* Content area */}
      <div
        style={{ flex: 1, padding: 10, minHeight: 80 }}
        onClick={() => {
          setIsEditing(true);
          setTimeout(() => textareaRef.current?.focus(), 0);
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={note.content}
            onChange={(e) => onUpdate(note.id, { content: e.target.value })}
            onBlur={() => setIsEditing(false)}
            placeholder="Write a note…"
            style={{
              width: "100%",
              minHeight: 80,
              background: "transparent",
              border: "none",
              outline: "none",
              color: colors.text,
              fontFamily: FONTS.mono,
              fontSize: 12,
              lineHeight: 1.6,
              resize: "none",
              padding: 0,
              boxSizing: "border-box",
            }}
          />
        ) : (
          <div
            style={{
              color: note.content ? colors.text : colors.placeholder,
              fontFamily: FONTS.mono,
              fontSize: 12,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              minHeight: 80,
              fontStyle: note.content ? "normal" : "italic",
              cursor: "text",
            }}
          >
            {note.content || "Write a note…"}
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        className="sticky-controls"
        onMouseDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const startW = note.width || 220;
          const onMove = (me) => {
            const newW = Math.max(150, startW + (me.clientX - startX) / zoom);
            onUpdate(note.id, { width: newW });
          };
          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 14,
          height: 14,
          cursor: "nwse-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.border,
          fontSize: 10,
          opacity: 0.5,
          userSelect: "none",
        }}
      >
        ◢
      </div>
    </div>
  );
}

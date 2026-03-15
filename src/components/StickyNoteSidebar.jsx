import { useState } from "react";
import { COLORS, FONTS, styles } from "../styles/theme";
import { SIDEBAR_WIDTH } from "../constants";

const NOTE_COLORS = {
  yellow: { bg: "#2d2a00", border: "#f0c040", text: "#f5e17a" },
  blue:   { bg: "#001a2d", border: "#4da6ff", text: "#a8d4ff" },
  red:    { bg: "#2d0000", border: "#ff6b6b", text: "#ffb3b3" },
  green:  { bg: "#002d0a", border: "#00d27d", text: "#7fffb8" },
};

const COLOR_OPTIONS = ["yellow", "blue", "red", "green"];

export function StickyNoteSidebar({ note, onUpdate, onDelete, onClose }) {
  const [draftAuthor, setDraftAuthor] = useState(note.author || "");
  const [noteId, setNoteId] = useState(note.id);

  // Reset draft when note changes
  if (note.id !== noteId) {
    setDraftAuthor(note.author || "");
    setNoteId(note.id);
  }

  return (
    <div
      style={{
        width: SIDEBAR_WIDTH,
        background: COLORS.surface,
        borderLeft: `1px solid ${COLORS.border}`,
        overflow: "auto",
        flexShrink: 0,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h4
          style={{
            margin: 0,
            color: COLORS.text,
            fontFamily: FONTS.heading,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Sticky Note
        </h4>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: COLORS.textDim,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          &#10005;
        </button>
      </div>

      {/* Color picker */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontFamily: FONTS.mono,
            color: COLORS.textMuted,
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Color
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {COLOR_OPTIONS.map((c) => {
            const isActive = (note.color || "yellow") === c;
            return (
              <button
                key={c}
                onClick={() => onUpdate(note.id, { color: c })}
                title={c}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: NOTE_COLORS[c].bg,
                  border: isActive
                    ? `2px solid ${NOTE_COLORS[c].border}`
                    : `2px solid transparent`,
                  cursor: "pointer",
                  boxShadow: isActive ? `0 0 0 1px ${NOTE_COLORS[c].border}` : "none",
                  outline: "none",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: NOTE_COLORS[c].border,
                    margin: "auto",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Author */}
      <div>
        <label
          style={{
            fontSize: 11,
            fontFamily: FONTS.mono,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Author
        </label>
        <input
          type="text"
          value={draftAuthor}
          onChange={(e) => setDraftAuthor(e.target.value)}
          onBlur={() => onUpdate(note.id, { author: draftAuthor })}
          placeholder="e.g. Jane"
          style={{ ...styles.input }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <label
          style={{
            fontSize: 11,
            fontFamily: FONTS.mono,
            color: COLORS.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Content
        </label>
        <textarea
          value={note.content}
          onChange={(e) => onUpdate(note.id, { content: e.target.value })}
          placeholder="Write a note…"
          rows={6}
          style={{
            ...styles.input,
            resize: "vertical",
            lineHeight: 1.6,
            minHeight: 100,
          }}
        />
      </div>

      {/* Delete */}
      <button
        onClick={() => { onDelete(note.id); onClose(); }}
        style={{ ...styles.btnDanger, width: "100%", textAlign: "center" }}
      >
        Delete Note
      </button>
    </div>
  );
}

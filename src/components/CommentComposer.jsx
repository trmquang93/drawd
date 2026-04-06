import { useState, useRef, useEffect } from "react";
import { COLORS, FONTS, Z_INDEX } from "../styles/theme";

/**
 * Floating inline composer that appears where the user clicked in comment mode.
 * Props:
 *   clientX, clientY  — viewport coordinates for positioning
 *   onSubmit(text)    — called when the user confirms
 *   onCancel()        — called on Escape or outside click
 */
export function CommentComposer({ clientX, clientY, onSubmit, onCancel }) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    const onMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onCancel]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); onCancel(); return; }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  // Keep composer in viewport bounds (both axes)
  const COMPOSER_WIDTH = 280;
  const COMPOSER_HEIGHT = 120;
  const left = Math.min(clientX, window.innerWidth - COMPOSER_WIDTH - 12);
  const top = Math.min(clientY + 12, window.innerHeight - COMPOSER_HEIGHT - 12);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left,
        top,
        width: COMPOSER_WIDTH,
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        zIndex: Z_INDEX.modal,
        overflow: "hidden",
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add a comment… (Cmd+Enter to submit)"
        rows={3}
        style={{
          display: "block",
          width: "100%",
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${COLORS.border}`,
          color: COLORS.text,
          fontSize: 12,
          fontFamily: FONTS.ui,
          lineHeight: 1.5,
          resize: "none",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 6,
        padding: "6px 10px",
      }}>
        <button
          onClick={onCancel}
          style={{
            padding: "4px 10px",
            background: "transparent",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.textMuted,
            fontSize: 11,
            fontFamily: FONTS.mono,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          style={{
            padding: "4px 12px",
            background: text.trim() ? COLORS.accent : COLORS.accent008,
            border: "none",
            borderRadius: 6,
            color: text.trim() ? "#282c34" : COLORS.textDim,
            fontSize: 11,
            fontFamily: FONTS.mono,
            fontWeight: 700,
            cursor: text.trim() ? "pointer" : "not-allowed",
            transition: "all 0.12s",
          }}
        >
          Comment
        </button>
      </div>
    </div>
  );
}

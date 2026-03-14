import { COLORS, FONTS, Z_INDEX } from "../styles/theme";

const barBtn = {
  padding: "6px 14px",
  border: "none",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: FONTS.mono,
};

export function BatchHotspotBar({ count, hasClipboard, onCopy, onPaste, onDelete, onCancel }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: "10px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        zIndex: Z_INDEX.batchBar,
      }}
    >
      <span style={{ fontSize: 12, color: COLORS.text, fontFamily: FONTS.mono, fontWeight: 600 }}>
        {count} selected
      </span>

      <button
        onClick={onCopy}
        style={{ ...barBtn, background: COLORS.accent015, color: COLORS.accentLight }}
      >
        Copy
      </button>

      {hasClipboard && (
        <button
          onClick={onPaste}
          style={{ ...barBtn, background: "rgba(0,210,211,0.12)", color: COLORS.success }}
        >
          Paste
        </button>
      )}

      <button
        onClick={onDelete}
        style={{ ...barBtn, background: "rgba(255,107,107,0.12)", color: COLORS.danger }}
      >
        Delete
      </button>

      <button
        onClick={onCancel}
        style={{ ...barBtn, background: "transparent", color: COLORS.textMuted, border: `1px solid ${COLORS.border}` }}
      >
        Cancel
      </button>
    </div>
  );
}

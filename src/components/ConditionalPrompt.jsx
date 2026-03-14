import { COLORS, FONTS, styles, Z_INDEX } from "../styles/theme";

export function ConditionalPrompt({ x, y, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        background: COLORS.surface,
        border: `1px solid ${COLORS.condition}`,
        borderRadius: 10,
        padding: "14px 18px",
        boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px rgba(240,147,43,0.15)`,
        zIndex: Z_INDEX.canvasPrompt,
        minWidth: 200,
        pointerEvents: "all",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          color: COLORS.text,
          fontSize: 13,
          fontFamily: FONTS.ui,
          fontWeight: 500,
          marginBottom: 12,
        }}
      >
        Create conditional branches?
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onConfirm}
          style={{
            ...styles.btnPrimary,
            flex: 1,
            padding: "7px 0",
            background: COLORS.condition,
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          Yes
        </button>
        <button
          onClick={onCancel}
          style={{
            ...styles.btnCancel,
            flex: 1,
            padding: "7px 0",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          No
        </button>
      </div>
    </div>
  );
}

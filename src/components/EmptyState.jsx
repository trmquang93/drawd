import { COLORS, FONTS } from "../styles/theme";

export function EmptyState({ onTemplates }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 20,
          background: COLORS.accent008,
          border: `2px dashed ${COLORS.accent02}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          color: COLORS.textDim,
        }}
      >
        &#128241;
      </div>
      <div
        style={{
          color: COLORS.textMuted,
          fontSize: 15,
          fontFamily: FONTS.heading,
          fontWeight: 500,
        }}
      >
        Drop screen designs here
      </div>
      <div
        style={{
          color: COLORS.textDim,
          fontSize: 12,
          fontFamily: FONTS.mono,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Drag &amp; drop or paste from clipboard<br />
        wireframes, screenshots, or mockups
      </div>
      {onTemplates && (
        <button
          onClick={onTemplates}
          style={{
            pointerEvents: "auto",
            marginTop: 8,
            padding: "8px 20px",
            background: COLORS.accent01,
            border: `1px solid ${COLORS.accent}`,
            borderRadius: 8,
            color: COLORS.accent,
            fontSize: 13,
            fontFamily: FONTS.mono,
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = COLORS.accent;
            e.currentTarget.style.color = "#282c34";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = COLORS.accent01;
            e.currentTarget.style.color = COLORS.accent;
          }}
        >
          Start from Template
        </button>
      )}
    </div>
  );
}

import { COLORS, FONTS, Z_INDEX } from "../styles/theme";

export function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed",
      bottom: 40,
      left: "50%",
      transform: "translateX(-50%)",
      background: COLORS.surface,
      border: `1px solid ${COLORS.accent}`,
      borderRadius: 8,
      padding: "10px 20px",
      color: COLORS.text,
      fontFamily: FONTS.mono,
      fontSize: 13,
      zIndex: Z_INDEX.contextMenu + 1,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      pointerEvents: "none",
    }}>
      {message}
    </div>
  );
}

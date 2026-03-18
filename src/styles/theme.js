export const COLORS = {
  bg: "#282c34",
  surface: "#2c313a",
  surfaceHover: "#333842",
  border: "#3e4451",
  borderActive: "#61afef",
  accent: "#61afef",
  accentGlow: "rgba(97,175,239,0.3)",
  accentLight: "#8cc5f6",
  text: "#abb2bf",
  textMuted: "#5c6370",
  textDim: "#4b5263",
  danger: "#e06c75",
  success: "#98c379",
  warning: "#e5c07b",
  canvasBg: "#21252b",
  canvasDot: "#3e4451",
  screenBg: "#2c313a",
  hotspot: "rgba(97,175,239,0.25)",
  hotspotBorder: "#61afef",
  connectionLine: "#61afef",
  condition: "#d19a66",
  // Accent opacity tokens — use these instead of inline rgba(97,175,239,X)
  accent005: "rgba(97,175,239,0.05)",
  accent008: "rgba(97,175,239,0.08)",
  accent01:  "rgba(97,175,239,0.1)",
  accent012: "rgba(97,175,239,0.12)",
  accent015: "rgba(97,175,239,0.15)",
  accent018: "rgba(97,175,239,0.18)",
  accent02:  "rgba(97,175,239,0.2)",
  accent025: "rgba(97,175,239,0.25)",
  accent03:  "rgba(97,175,239,0.3)",
  accent035: "rgba(97,175,239,0.35)",
  accent04:  "rgba(97,175,239,0.4)",
  // Status colors
  statusNew: "#00b894",
  statusModify: "#fdcb6e",
  statusExisting: "#636e72",
  statusExistingBorder: "#444",
  statusTbd: "#f0932b",
  imageAreaBg: "#0d0d15",
  // Multi-object selection
  selection: "rgba(97,175,239,0.08)",
  selectionBorder: "#61afef",
  // Remote cursor palette (8 distinct colors for collaboration)
  cursorPalette: [
    "#e06c75", // red
    "#98c379", // green
    "#e5c07b", // yellow
    "#c678dd", // purple
    "#56b6c2", // cyan
    "#d19a66", // orange
    "#61afef", // blue
    "#be5046", // rust
  ],
};

export const FONTS = {
  ui: "'Outfit', sans-serif",
  mono: "'JetBrains Mono', monospace",
  heading: "'Space Grotesk', sans-serif",
};

export const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap";

export const Z_INDEX = {
  screenGroup: 0,
  selectionOverlay: 1,
  hotspotHandle: 2,
  resizeHandle: 3,
  dragOverlay: 5,
  stickyNote: 5,
  remoteCursor: 40,
  canvasPrompt: 50,
  toolbar: 100,
  batchBar: 900,
  modal: 1000,
  contextMenu: 9999,
};

export const STATUS_CONFIG = {
  new:      { label: "New",      color: COLORS.statusNew,      bg: "rgba(0,184,148,0.15)" },
  modify:   { label: "Modify",   color: COLORS.statusModify,   bg: "rgba(253,203,110,0.15)" },
  existing: { label: "Existing", color: COLORS.statusExisting, bg: "rgba(99,110,114,0.15)" },
};

// Maps each status to the next in the cycle
export const STATUS_CYCLE = { new: "modify", modify: "existing", existing: "new" };

export const styles = {
  monoLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.mono,
  },
  input: {
    display: "block",
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 13,
    fontFamily: FONTS.mono,
    outline: "none",
    boxSizing: "border-box",
  },
  select: {
    display: "block",
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.text,
    fontSize: 13,
    fontFamily: FONTS.mono,
    outline: "none",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  modalTitle: {
    margin: "0 0 20px",
    color: COLORS.text,
    fontFamily: FONTS.heading,
    fontSize: 18,
    fontWeight: 600,
  },
  btnPrimary: {
    padding: "10px 0",
    background: COLORS.accent,
    border: "none",
    borderRadius: 8,
    color: "#282c34",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONTS.mono,
  },
  btnCancel: {
    padding: "10px 18px",
    background: "transparent",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.textMuted,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: FONTS.mono,
  },
  btnDanger: {
    padding: "10px 18px",
    background: "rgba(224,108,117,0.1)",
    border: "1px solid rgba(224,108,117,0.3)",
    borderRadius: 8,
    color: COLORS.danger,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: FONTS.mono,
  },
};

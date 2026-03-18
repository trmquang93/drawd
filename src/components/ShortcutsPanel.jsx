import { useEffect } from "react";
import { COLORS, FONTS, styles } from "../styles/theme";

const SHORTCUTS = [
  {
    category: "General",
    items: [
      { keys: ["?"], desc: "Toggle keyboard shortcuts" },
      { keys: ["Escape"], desc: "Cancel current action / close panel" },
      { keys: ["Delete"], desc: "Remove selected screen or connection" },
    ],
  },
  {
    category: "Canvas",
    items: [
      { keys: ["V"], desc: "Select tool" },
      { keys: ["H"], desc: "Pan tool" },
      { keys: ["Space", "Drag"], desc: "Pan canvas (temporary)" },
      { keys: ["Scroll"], desc: "Zoom in / out" },
      { keys: ["Alt", "Click hotspot"], desc: "Drag to connect" },
      { keys: ["Shift", "Click hotspot"], desc: "Multi-select hotspots" },
    ],
  },
  {
    category: "Editing",
    items: [
      { keys: ["\u2318/Ctrl", "Z"], desc: "Undo" },
      { keys: ["\u2318/Ctrl", "Shift", "Z"], desc: "Redo" },
      { keys: ["\u2318/Ctrl", "V"], desc: "Paste images as screens" },
    ],
  },
  {
    category: "File",
    items: [
      { keys: ["\u2318/Ctrl", "S"], desc: "Save / Save As / Export" },
      { keys: ["\u2318/Ctrl", "O"], desc: "Open file" },
    ],
  },
  {
    category: "Collaboration",
    items: [
      { keys: ["Share button"], desc: "Create or join a collaboration room" },
      { keys: ["Click room code"], desc: "Copy room code to clipboard" },
    ],
  },
];

const kbdStyle = {
  display: "inline-block",
  padding: "3px 8px",
  background: COLORS.bg,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 5,
  fontSize: 11,
  fontFamily: FONTS.mono,
  color: COLORS.text,
  lineHeight: 1.4,
  minWidth: 20,
  textAlign: "center",
};

export function ShortcutsPanel({ onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...styles.modalCard, width: 460, maxHeight: "80vh", overflowY: "auto" }}
      >
        <h3 style={styles.modalTitle}>Keyboard Shortcuts</h3>

        {SHORTCUTS.map((group) => (
          <div key={group.category} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: COLORS.accent,
                textTransform: "uppercase",
                marginBottom: 10,
                fontFamily: FONTS.mono,
              }}
            >
              {group.category}
            </div>
            {group.items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: i < group.items.length - 1 ? `1px solid ${COLORS.border}` : "none",
                }}
              >
                <span style={{ fontSize: 12, color: COLORS.textMuted, fontFamily: FONTS.ui }}>
                  {item.desc}
                </span>
                <span style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                  {item.keys.map((key, ki) => (
                    <span key={ki}>
                      {ki > 0 && (
                        <span style={{ color: COLORS.textDim, fontSize: 10, margin: "0 2px" }}>+</span>
                      )}
                      <kbd style={kbdStyle}>{key}</kbd>
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}

        <div style={{ textAlign: "right", marginTop: 8 }}>
          <button onClick={onClose} style={styles.btnCancel}>Close</button>
        </div>
      </div>
    </div>
  );
}

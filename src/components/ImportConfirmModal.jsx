import { COLORS, FONTS, styles } from "../styles/theme";

export function ImportConfirmModal({ payload, canvasEmpty, onReplace, onMerge, onClose }) {
  const { metadata } = payload;

  return (
    <div
      style={{ ...styles.modalOverlay, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ ...styles.modalCard, width: 380, padding: 24 }}
      >
        <h3 style={{ ...styles.modalTitle, fontSize: 16, marginBottom: 16 }}>
          Import Flow
        </h3>

        <div
          style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, color: COLORS.text, fontFamily: FONTS.ui, marginBottom: 8 }}>
            {metadata.name}
          </div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.mono, lineHeight: 1.6 }}>
            {metadata.screenCount} screen{metadata.screenCount !== 1 ? "s" : ""}
            {" \u00b7 "}
            {metadata.connectionCount} connection{metadata.connectionCount !== 1 ? "s" : ""}
            <br />
            Exported {new Date(metadata.exportedAt).toLocaleString()}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {canvasEmpty ? (
            <button
              onClick={onReplace}
              style={{ ...styles.btnPrimary, flex: 1, padding: "9px 0" }}
            >
              Load
            </button>
          ) : (
            <>
              <button
                onClick={onReplace}
                style={{ ...styles.btnDanger, flex: 1, padding: "9px 0" }}
              >
                Replace Canvas
              </button>
              <button
                onClick={onMerge}
                style={{ ...styles.btnPrimary, flex: 1, padding: "9px 0" }}
              >
                Merge
              </button>
            </>
          )}
          <button onClick={onClose} style={{ ...styles.btnCancel, padding: "9px 18px" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

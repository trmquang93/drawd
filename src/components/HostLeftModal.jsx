import { styles, COLORS, FONTS } from "../styles/theme";

export function HostLeftModal({ onKeepState, onLeave }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={{ ...styles.modalCard, width: 360, textAlign: "center" }}>
        <h3 style={styles.modalTitle}>Session Ended</h3>
        <p style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.mono, lineHeight: 1.6, marginBottom: 20 }}>
          The host has left the collaboration session. You can keep the current state and continue working locally, or leave the session.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onLeave}
            style={{ ...styles.btnCancel, flex: 1 }}
          >
            Leave
          </button>
          <button
            onClick={onKeepState}
            style={{ ...styles.btnPrimary, flex: 1 }}
          >
            Keep State
          </button>
        </div>
      </div>
    </div>
  );
}

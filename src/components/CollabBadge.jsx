import { useState } from "react";
import { COLORS, FONTS } from "../styles/theme";
import { COPY_FEEDBACK_MS } from "../constants";

export function CollabBadge({ roomCode, isReadOnly, isConnected, onLeave }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {/* Room code pill */}
      <button
        onClick={copyCode}
        title={copied ? "Copied!" : "Click to copy room code"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          cursor: "pointer",
          outline: "none",
        }}
      >
        {/* Connection status dot */}
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: isConnected ? COLORS.success : COLORS.warning,
          display: "inline-block",
          flexShrink: 0,
          animation: isConnected ? "none" : "pulse-dot 1s infinite",
        }} />
        <span style={{
          fontSize: 11,
          fontFamily: FONTS.mono,
          fontWeight: 600,
          color: COLORS.textMuted,
          letterSpacing: "0.08em",
        }}>
          {copied ? "Copied!" : roomCode}
        </span>
      </button>

      {/* Viewing badge */}
      {isReadOnly && (
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          fontFamily: FONTS.mono,
          padding: "3px 8px",
          borderRadius: 4,
          background: "rgba(229,192,123,0.15)",
          border: "1px solid rgba(229,192,123,0.3)",
          color: COLORS.warning,
        }}>
          Viewing
        </span>
      )}

      {/* Leave button */}
      <button
        onClick={onLeave}
        title="Leave room"
        style={{
          width: 24,
          height: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(224,108,117,0.08)",
          border: `1px solid rgba(224,108,117,0.2)`,
          borderRadius: 6,
          cursor: "pointer",
          color: COLORS.danger,
          fontSize: 12,
          padding: 0,
          transition: "all 0.15s",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}

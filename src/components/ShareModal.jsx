import { useState, useEffect } from "react";
import { COLORS, FONTS, styles } from "../styles/theme";
import { COPY_FEEDBACK_MS, DOMAIN } from "../constants";

export function ShareModal({ onClose, onCreateRoom, onJoinRoom, initialRoomCode, isCollabAvailable }) {
  const [tab, setTab] = useState(initialRoomCode ? "join" : "create");
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(COLORS.cursorPalette[0]);
  const [joinCode, setJoinCode] = useState(initialRoomCode || "");
  const [createdCode, setCreatedCode] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleCreate = () => {
    if (!displayName.trim()) return;
    onCreateRoom(displayName.trim(), color);
  };

  const handleJoin = () => {
    if (!displayName.trim() || joinCode.trim().length < 6) return;
    onJoinRoom(joinCode.trim().toUpperCase(), displayName.trim(), color);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  const shareLink = createdCode ? `https://${DOMAIN}/#/editor?room=${createdCode}` : "";

  if (!isCollabAvailable) {
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={{ ...styles.modalCard, width: 380 }} onClick={(e) => e.stopPropagation()}>
          <h3 style={styles.modalTitle}>Share Session</h3>
          <p style={{ color: COLORS.textMuted, fontSize: 13, fontFamily: FONTS.mono, lineHeight: 1.6 }}>
            Real-time collaboration requires Supabase configuration. Add <code style={{ color: COLORS.accent }}>VITE_SUPABASE_URL</code> and <code style={{ color: COLORS.accent }}>VITE_SUPABASE_ANON_KEY</code> to your <code style={{ color: COLORS.accent }}>.env</code> file.
          </p>
          <button onClick={onClose} style={{ ...styles.btnCancel, marginTop: 16 }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modalCard, width: 400 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Share Session</h3>

        {/* Tab switcher */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
          {["create", "join"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "8px 0",
                background: tab === t ? COLORS.accent015 : "transparent",
                border: "none",
                color: tab === t ? COLORS.accent : COLORS.textMuted,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: FONTS.mono,
                cursor: "pointer",
                borderRight: t === "create" ? `1px solid ${COLORS.border}` : "none",
              }}
            >
              {t === "create" ? "Create Room" : "Join Room"}
            </button>
          ))}
        </div>

        {/* Display name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoFocus
            style={styles.input}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (tab === "create") handleCreate();
                else handleJoin();
              }
            }}
          />
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Cursor Color
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {COLORS.cursorPalette.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border: color === c ? "3px solid white" : "2px solid transparent",
                  cursor: "pointer",
                  outline: color === c ? `2px solid ${c}` : "none",
                  outlineOffset: 1,
                  transition: "all 0.15s",
                }}
              />
            ))}
          </div>
        </div>

        {tab === "create" && !createdCode && (
          <button
            onClick={handleCreate}
            disabled={!displayName.trim()}
            style={{
              ...styles.btnPrimary,
              width: "100%",
              opacity: displayName.trim() ? 1 : 0.5,
              cursor: displayName.trim() ? "pointer" : "not-allowed",
            }}
          >
            Create Room
          </button>
        )}

        {tab === "create" && createdCode && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Room Code
            </div>
            <div
              onClick={() => copyCode(createdCode)}
              style={{
                fontSize: 32,
                fontWeight: 700,
                fontFamily: FONTS.mono,
                color: COLORS.accent,
                letterSpacing: "0.2em",
                cursor: "pointer",
                padding: "12px 0",
                background: COLORS.accent008,
                borderRadius: 12,
                border: `1px solid ${COLORS.accent025}`,
                marginBottom: 12,
                userSelect: "all",
              }}
              title="Click to copy"
            >
              {createdCode}
            </div>
            <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONTS.mono, marginBottom: 12 }}>
              {copied ? "Copied!" : "Click code to copy"}
            </div>
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
                }}
                style={{
                  ...styles.btnCancel,
                  fontSize: 11,
                  padding: "6px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                Copy Link
              </button>
            </div>
          </div>
        )}

        {tab === "join" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                maxLength={6}
                style={{ ...styles.input, fontSize: 18, fontWeight: 700, letterSpacing: "0.15em", textAlign: "center" }}
                onKeyDown={(e) => { if (e.key === "Enter") handleJoin(); }}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={!displayName.trim() || joinCode.trim().length < 6}
              style={{
                ...styles.btnPrimary,
                width: "100%",
                opacity: displayName.trim() && joinCode.trim().length >= 6 ? 1 : 0.5,
                cursor: displayName.trim() && joinCode.trim().length >= 6 ? "pointer" : "not-allowed",
              }}
            >
              Join Room
            </button>
          </>
        )}

        <button onClick={onClose} style={{ ...styles.btnCancel, width: "100%", marginTop: 10 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

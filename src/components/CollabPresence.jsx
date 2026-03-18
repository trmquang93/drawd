import { useState, useRef, useEffect } from "react";
import { COLORS, FONTS } from "../styles/theme";

function PeerCircle({ peer, isHost, onSetRole }) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const initial = (peer.displayName || "?")[0].toUpperCase();
  const isViewer = peer.role === "viewer";
  const isPeerHost = peer.role === "host";

  return (
    <div style={{ position: "relative" }} ref={menuRef}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => { if (isHost && !isPeerHost) setMenuOpen((v) => !v); }}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: peer.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: FONTS.mono,
          color: "#fff",
          cursor: isHost && !isPeerHost ? "pointer" : "default",
          position: "relative",
          border: "2px solid rgba(255,255,255,0.15)",
          transition: "transform 0.15s",
          transform: hovered ? "scale(1.1)" : "scale(1)",
        }}
      >
        {initial}
        {/* Host crown */}
        {isPeerHost && (
          <span style={{
            position: "absolute", top: -8, right: -4,
            fontSize: 10, lineHeight: 1,
          }}>
            &#9818;
          </span>
        )}
        {/* Viewer eye */}
        {isViewer && (
          <span style={{
            position: "absolute", bottom: -4, right: -4,
            fontSize: 8, lineHeight: 1,
            background: COLORS.warning,
            borderRadius: "50%",
            width: 14, height: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#282c34",
          }}>
            &#9673;
          </span>
        )}
      </div>

      {/* Tooltip */}
      {hovered && !menuOpen && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding: "4px 8px",
          whiteSpace: "nowrap",
          fontSize: 10,
          fontFamily: FONTS.mono,
          color: COLORS.text,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          zIndex: 100,
        }}>
          {peer.displayName} ({peer.role})
        </div>
      )}

      {/* Role dropdown (host only) */}
      {menuOpen && isHost && !isPeerHost && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: "4px",
          minWidth: 140,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: 100,
        }}>
          <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONTS.mono, padding: "4px 8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {peer.displayName}
          </div>
          {["editor", "viewer"].map((r) => (
            <button
              key={r}
              onClick={() => {
                onSetRole(peer.id, r);
                setMenuOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 8px",
                background: peer.role === r ? COLORS.accent008 : "transparent",
                border: "none",
                borderRadius: 6,
                color: peer.role === r ? COLORS.accent : COLORS.textMuted,
                fontSize: 11,
                fontFamily: FONTS.mono,
                fontWeight: peer.role === r ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {r === "editor" ? "Editor" : "Viewer (read-only)"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollabPresence({ peers, isHost, onSetRole }) {
  if (peers.length === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {peers.map((peer) => (
        <PeerCircle
          key={peer.id}
          peer={peer}
          isHost={isHost}
          onSetRole={onSetRole}
        />
      ))}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { TOPBAR_HEIGHT, PARTICIPANTS_PANEL_WIDTH } from "../constants";

function RoleDropdown({ peer, onSetRole }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div style={{ position: "relative", marginLeft: "auto" }} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          padding: "2px 8px",
          background: open ? COLORS.accent008 : "rgba(255,255,255,0.04)",
          border: `1px solid ${COLORS.border}`,
          borderRadius: 4,
          color: COLORS.textMuted,
          fontSize: 10,
          fontFamily: FONTS.mono,
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        {peer.role === "editor" ? "Editor" : peer.role === "reviewer" ? "Reviewer" : "Viewer"} &#9662;
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          right: 0,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 8,
          padding: "4px",
          minWidth: 160,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          zIndex: Z_INDEX.contextMenu,
        }}>
          {[
            { value: "editor", label: "Editor" },
            { value: "reviewer", label: "Reviewer (comment-only)" },
            { value: "viewer", label: "Viewer (read-only)" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { onSetRole(peer.id, value); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                padding: "6px 8px",
                background: peer.role === value ? COLORS.accent008 : "transparent",
                border: "none",
                borderRadius: 6,
                color: peer.role === value ? COLORS.accent : COLORS.textMuted,
                fontSize: 11,
                fontFamily: FONTS.mono,
                fontWeight: peer.role === value ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === "host") {
    return (
      <span style={{
        fontSize: 10,
        fontFamily: FONTS.mono,
        color: COLORS.accent,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 3,
        marginLeft: "auto",
      }}>
        &#9818; Host
      </span>
    );
  }
  if (role === "reviewer") {
    return (
      <span style={{
        fontSize: 10,
        fontFamily: FONTS.mono,
        color: "#e5c07b",
        fontWeight: 500,
        marginLeft: "auto",
      }}>
        Reviewer
      </span>
    );
  }
  if (role === "viewer") {
    return (
      <span style={{
        fontSize: 10,
        fontFamily: FONTS.mono,
        color: COLORS.warning,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: 3,
        marginLeft: "auto",
      }}>
        &#9673; Viewer
      </span>
    );
  }
  return (
    <span style={{
      fontSize: 10,
      fontFamily: FONTS.mono,
      color: COLORS.textDim,
      fontWeight: 500,
      marginLeft: "auto",
    }}>
      Editor
    </span>
  );
}

function ParticipantRow({ name, color, role, isSelf, isHost, peer, onSetRole }) {
  const initial = (name || "?")[0].toUpperCase();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      borderRadius: 8,
      background: isSelf ? "rgba(255,255,255,0.03)" : "transparent",
    }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700,
        fontFamily: FONTS.mono,
        color: "#fff",
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.15)",
      }}>
        {initial}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 12,
          fontFamily: FONTS.mono,
          color: COLORS.text,
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {name}
          {isSelf && (
            <span style={{ color: COLORS.textDim, fontWeight: 400, marginLeft: 4 }}>(You)</span>
          )}
        </div>
      </div>
      {/* Host can change peer roles, but not their own */}
      {isHost && peer && !isSelf ? (
        <RoleDropdown peer={peer} onSetRole={onSetRole} />
      ) : (
        <RoleBadge role={role} />
      )}
    </div>
  );
}

export function ParticipantsPanel({ peers, selfDisplayName, selfColor, selfRole, isHost, onSetRole, onClose }) {
  const totalCount = 1 + peers.length;
  const sortedPeers = [...peers].sort((a, b) =>
    (a.displayName || "").localeCompare(b.displayName || "")
  );

  return (
    <div style={{
      position: "fixed",
      top: TOPBAR_HEIGHT,
      right: 0,
      bottom: 0,
      width: PARTICIPANTS_PANEL_WIDTH,
      background: COLORS.surface,
      borderLeft: `1px solid ${COLORS.border}`,
      zIndex: Z_INDEX.toolbar,
      display: "flex",
      flexDirection: "column",
      boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 10px",
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONTS.heading,
            color: COLORS.text,
          }}>
            Participants
          </span>
          <span style={{
            fontSize: 10,
            fontFamily: FONTS.mono,
            fontWeight: 700,
            color: "#282c34",
            background: COLORS.accent,
            borderRadius: 8,
            padding: "1px 6px",
            lineHeight: 1.5,
            minWidth: 16,
            textAlign: "center",
          }}>
            {totalCount}
          </span>
        </div>
        <button
          onClick={onClose}
          title="Close"
          style={{
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            borderRadius: 4,
            color: COLORS.textMuted,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          &#10005;
        </button>
      </div>

      {/* Participant list */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 4px",
      }}>
        {/* Self always first */}
        <ParticipantRow
          name={selfDisplayName}
          color={selfColor}
          role={selfRole}
          isSelf
          isHost={isHost}
          onSetRole={onSetRole}
        />

        {/* Peers sorted alphabetically */}
        {sortedPeers.map((peer) => (
          <ParticipantRow
            key={peer.id}
            name={peer.displayName}
            color={peer.color}
            role={peer.role}
            isSelf={false}
            isHost={isHost}
            peer={peer}
            onSetRole={onSetRole}
          />
        ))}
      </div>
    </div>
  );
}

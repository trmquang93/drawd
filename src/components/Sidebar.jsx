import { COLORS, FONTS, STATUS_CONFIG, STATUS_CYCLE } from "../styles/theme";
import { useState } from "react";
import { SIDEBAR_WIDTH } from "../constants";

export function Sidebar({ screen, screens, connections, onClose, onRename, onAddHotspot, onEditHotspot, onAddState, onSelectScreen, onUpdateStateName, onUpdateNotes, onUpdateCodeRef, onUpdateCriteria, onUpdateStatus, onUpdateTbd, onUpdateRoles, isReadOnly }) {
  const [draftNotes, setDraftNotes] = useState(screen.notes || "");
  const [notesScreenId, setNotesScreenId] = useState(screen.id);
  const [draftCodeRef, setDraftCodeRef] = useState(screen.codeRef || "");
  const [codeRefScreenId, setCodeRefScreenId] = useState(screen.id);
  const [newCriterion, setNewCriterion] = useState("");
  const [draftTbdNote, setDraftTbdNote] = useState(screen.tbdNote || "");
  const [tbdScreenId, setTbdScreenId] = useState(screen.id);
  const [newRole, setNewRole] = useState("");
  const [rolesScreenId, setRolesScreenId] = useState(screen.id);

  // Reset drafts when screen changes
  if (screen.id !== notesScreenId) {
    setDraftNotes(screen.notes || "");
    setNotesScreenId(screen.id);
  }
  if (screen.id !== codeRefScreenId) {
    setDraftCodeRef(screen.codeRef || "");
    setCodeRefScreenId(screen.id);
  }
  if (screen.id !== tbdScreenId) {
    setDraftTbdNote(screen.tbdNote || "");
    setTbdScreenId(screen.id);
  }
  if (screen.id !== rolesScreenId) {
    setNewRole("");
    setRolesScreenId(screen.id);
  }

  const incomingLinks = connections.filter((c) => c.toScreenId === screen.id);
  const status = screen.status || "new";
  const statusCfg = STATUS_CONFIG[status];

  return (
    <div
      style={{
        width: SIDEBAR_WIDTH,
        background: COLORS.surface,
        borderLeft: `1px solid ${COLORS.border}`,
        overflow: "auto",
        flexShrink: 0,
        padding: 18,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h4
          style={{
            margin: 0,
            color: COLORS.text,
            fontFamily: FONTS.heading,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Screen Details
        </h4>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: COLORS.textDim,
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          &#10005;
        </button>
      </div>

      <div
        style={{
          padding: "10px 12px",
          background: COLORS.bg,
          borderRadius: 8,
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ color: COLORS.text, fontSize: 13, fontWeight: 600, fontFamily: FONTS.mono }}>
          {screen.name}
        </span>
        {!isReadOnly && (
          <button
            onClick={onRename}
            style={{
              background: COLORS.accent01,
              border: `1px solid ${COLORS.accent02}`,
              borderRadius: 6,
              color: COLORS.accentLight,
              fontSize: 10,
              padding: "3px 8px",
              cursor: "pointer",
              fontFamily: FONTS.mono,
            }}
          >
            Rename
          </button>
        )}
      </div>

      {/* TBD toggle */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: screen.tbd ? 8 : 0 }}>
          <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            TBD / Uncertain
          </span>
          <button
            onClick={() => onUpdateTbd?.(screen.id, !screen.tbd, screen.tbdNote || "")}
            style={{
              padding: "3px 9px",
              borderRadius: 4,
              border: `1px solid ${screen.tbd ? "rgba(240,147,43,0.35)" : COLORS.border}`,
              background: screen.tbd ? "rgba(240,147,43,0.18)" : "rgba(255,255,255,0.05)",
              color: screen.tbd ? "#f0932b" : COLORS.textDim,
              fontFamily: FONTS.mono,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {screen.tbd ? "? TBD" : "Mark TBD"}
          </button>
        </div>
        {screen.tbd && (
          <textarea
            value={draftTbdNote}
            onChange={(e) => setDraftTbdNote(e.target.value)}
            onBlur={() => onUpdateTbd?.(screen.id, true, draftTbdNote)}
            placeholder="What's uncertain? e.g. 'Not sure if we need a separate checkout screen'"
            rows={2}
            style={{
              width: "100%",
              padding: "6px 8px",
              background: "rgba(240,147,43,0.06)",
              border: "1px solid rgba(240,147,43,0.25)",
              borderRadius: 6,
              color: COLORS.text,
              fontSize: 11,
              fontFamily: FONTS.mono,
              outline: "none",
              boxSizing: "border-box",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        )}
      </div>

      {/* Build status chip */}
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: FONTS.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Build status
        </span>
        <button
          onClick={() => onUpdateStatus?.(screen.id, STATUS_CYCLE[status])}
          title="Click to cycle: New → Modify → Existing"
          style={{
            padding: "3px 9px",
            borderRadius: 4,
            border: "none",
            background: statusCfg.bg,
            color: statusCfg.color,
            fontFamily: FONTS.mono,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.03em",
          }}
        >
          {statusCfg.label}
        </button>
      </div>
      {/* Roles */}
      <div
        style={{
          padding: "10px 12px",
          background: COLORS.bg,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <div style={{
          fontSize: 10,
          color: COLORS.textMuted,
          fontFamily: FONTS.mono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Access Roles
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: (screen.roles || []).length > 0 ? 6 : 0 }}>
          {(screen.roles || []).map((role, i) => (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                background: COLORS.accent012,
                border: `1px solid ${COLORS.accent025}`,
                borderRadius: 12,
                color: COLORS.accentLight,
                fontSize: 10,
                fontFamily: FONTS.mono,
              }}
            >
              {role}
              <button
                onClick={() => onUpdateRoles?.(screen.id, (screen.roles || []).filter((_, j) => j !== i))}
                style={{
                  background: "none", border: "none", color: COLORS.danger,
                  cursor: "pointer", fontSize: 11, padding: 0, lineHeight: 1,
                }}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newRole.trim()) {
                const trimmed = newRole.trim().toLowerCase();
                if (!(screen.roles || []).includes(trimmed)) {
                  onUpdateRoles?.(screen.id, [...(screen.roles || []), trimmed]);
                }
                setNewRole("");
              }
            }}
            placeholder="e.g. admin, authenticated…"
            style={{
              flex: 1,
              padding: "4px 8px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: COLORS.text,
              fontSize: 11,
              fontFamily: FONTS.mono,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div
        style={{
          padding: "10px 12px",
          background: COLORS.bg,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <div style={{
          fontSize: 10,
          color: COLORS.textMuted,
          fontFamily: FONTS.mono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Description
        </div>
        <div style={{
          fontSize: 11,
          color: screen.description ? COLORS.textMuted : COLORS.textDim,
          fontFamily: FONTS.mono,
          fontStyle: screen.description ? "normal" : "italic",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {screen.description || "No description added"}
        </div>
      </div>

      {/* Implementation Notes */}
      <div
        style={{
          padding: "10px 12px",
          background: COLORS.bg,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <div style={{
          fontSize: 10,
          color: COLORS.textMuted,
          fontFamily: FONTS.mono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Implementation Notes
        </div>
        <textarea
          value={draftNotes}
          onChange={(e) => { if (!isReadOnly) setDraftNotes(e.target.value); }}
          onBlur={() => {
            if (!isReadOnly && draftNotes !== (screen.notes || "")) {
              onUpdateNotes?.(screen.id, draftNotes);
            }
          }}
          readOnly={isReadOnly}
          placeholder="Add implementation notes, technical context..."
          rows={3}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.text,
            fontSize: 11,
            fontFamily: FONTS.mono,
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      </div>

      {/* Code Reference */}
      <div
        style={{
          padding: "10px 12px",
          background: COLORS.bg,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <div style={{
          fontSize: 10,
          color: COLORS.textMuted,
          fontFamily: FONTS.mono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Code Reference
        </div>
        <input
          type="text"
          value={draftCodeRef}
          onChange={(e) => setDraftCodeRef(e.target.value)}
          onBlur={() => {
            if (draftCodeRef !== (screen.codeRef || "")) {
              onUpdateCodeRef?.(screen.id, draftCodeRef);
            }
          }}
          placeholder="e.g. src/screens/LoginScreen.tsx"
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            color: COLORS.text,
            fontSize: 11,
            fontFamily: FONTS.mono,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Acceptance Criteria */}
      <div
        style={{
          padding: "10px 12px",
          background: COLORS.bg,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <div style={{
          fontSize: 10,
          color: COLORS.textMuted,
          fontFamily: FONTS.mono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Acceptance Criteria
        </div>
        {(screen.acceptanceCriteria || []).map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
            <span style={{ color: COLORS.textDim, fontFamily: FONTS.mono, fontSize: 11, marginTop: 2, flexShrink: 0 }}>□</span>
            <span style={{ flex: 1, fontSize: 11, color: COLORS.textMuted, fontFamily: FONTS.mono, lineHeight: 1.5, wordBreak: "break-word" }}>
              {item}
            </span>
            <button
              onClick={() => {
                const updated = [...(screen.acceptanceCriteria || [])];
                updated.splice(i, 1);
                onUpdateCriteria?.(screen.id, updated);
              }}
              style={{ background: "none", border: "none", color: COLORS.danger, cursor: "pointer", fontSize: 12, padding: "0 2px", flexShrink: 0, lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <input
            type="text"
            value={newCriterion}
            onChange={(e) => setNewCriterion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCriterion.trim()) {
                onUpdateCriteria?.(screen.id, [...(screen.acceptanceCriteria || []), newCriterion.trim()]);
                setNewCriterion("");
              }
            }}
            placeholder="Add criterion, press Enter…"
            style={{
              flex: 1,
              padding: "4px 8px",
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: COLORS.text,
              fontSize: 11,
              fontFamily: FONTS.mono,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Screen States */}
      <div
        style={{
          padding: "10px 12px",
          background: COLORS.bg,
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <div style={{
          fontSize: 10,
          color: COLORS.textMuted,
          fontFamily: FONTS.mono,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}>
          Screen States
        </div>
        {screen.stateGroup ? (() => {
          const siblings = screens.filter((s) => s.stateGroup === screen.stateGroup && s.id !== screen.id);
          return (
            <>
              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONTS.mono }}>
                  Current state name
                </label>
                <input
                  type="text"
                  value={screen.stateName}
                  onChange={(e) => onUpdateStateName?.(screen.id, e.target.value)}
                  style={{
                    width: "100%",
                    marginTop: 3,
                    padding: "4px 8px",
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    color: COLORS.text,
                    fontSize: 11,
                    fontFamily: FONTS.mono,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {siblings.map((s) => (
                <div
                  key={s.id}
                  onClick={() => onSelectScreen?.(s.id)}
                  style={{
                    padding: "6px 10px",
                    background: COLORS.accent005,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 6,
                    marginBottom: 4,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "border-color 0.2s",
                  }}
                >
                  <span style={{ fontSize: 11, color: COLORS.text, fontFamily: FONTS.mono }}>
                    {s.stateName || s.name}
                  </span>
                  <span style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONTS.mono }}>
                    &rarr;
                  </span>
                </div>
              ))}
            </>
          );
        })() : (
          <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONTS.mono, fontStyle: "italic" }}>
            No states defined
          </div>
        )}
        {!isReadOnly && (
          <button
            onClick={() => onAddState?.(screen.id)}
            style={{
              width: "100%",
              padding: "6px 0",
              marginTop: 6,
              background: COLORS.accent008,
              border: `1px dashed ${COLORS.accent03}`,
              borderRadius: 6,
              color: COLORS.accentLight,
              fontSize: 11,
              cursor: "pointer",
              fontFamily: FONTS.mono,
            }}
          >
            + Add State
          </button>
        )}
      </div>

      {/* Hotspots list */}
      <h5
        style={{
          margin: "16px 0 8px",
          color: COLORS.textMuted,
          fontFamily: FONTS.mono,
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Tap Areas / Buttons ({screen.hotspots.length})
      </h5>

      {screen.hotspots.map((hs) => {
        const target = screens.find((s) => s.id === hs.targetScreenId);
        return (
          <div
            key={hs.id}
            onClick={() => onEditHotspot(hs)}
            style={{
              padding: "10px 12px",
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              marginBottom: 6,
              cursor: "pointer",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, fontFamily: FONTS.mono }}>
              {hs.label || "Unnamed"}
            </div>
            <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 4, fontFamily: FONTS.mono }}>
              {hs.action === "api"
                ? `api: ${hs.apiMethod || "GET"} ${hs.apiEndpoint || "/endpoint"}`
                : hs.action === "conditional"
                ? `conditional: ${(hs.conditions || []).length} branch${(hs.conditions || []).length !== 1 ? "es" : ""}`
                : <>{hs.action} &rarr; {target?.name || "none"}</>
              }
            </div>
            {hs.action === "api" && hs.onSuccessAction && (
              <div style={{ fontSize: 9, color: COLORS.success, marginTop: 3, fontFamily: FONTS.mono }}>
                on success: {hs.onSuccessAction}
                {hs.onSuccessTargetId && (() => {
                  const t = screens.find((s) => s.id === hs.onSuccessTargetId);
                  return t ? ` \u2192 ${t.name}` : "";
                })()}
              </div>
            )}
            {hs.action === "api" && hs.onErrorAction && (
              <div style={{ fontSize: 9, color: COLORS.danger, marginTop: 2, fontFamily: FONTS.mono }}>
                on error: {hs.onErrorAction}
                {hs.onErrorTargetId && (() => {
                  const t = screens.find((s) => s.id === hs.onErrorTargetId);
                  return t ? ` \u2192 ${t.name}` : "";
                })()}
              </div>
            )}
            {hs.action === "conditional" && (hs.conditions || []).map((cond, ci) => {
              const t = cond.targetScreenId ? screens.find((s) => s.id === cond.targetScreenId) : null;
              return (
                <div key={cond.id || ci} style={{ fontSize: 9, color: "#f0932b", marginTop: ci === 0 ? 3 : 2, fontFamily: FONTS.mono }}>
                  {cond.label || `branch ${ci + 1}`} &rarr; {t?.name || "none"}
                </div>
              );
            })}
          </div>
        );
      })}

      {!isReadOnly && (
        <button
          onClick={() => onAddHotspot(screen.id)}
          style={{
            width: "100%",
            padding: "10px 0",
            marginTop: 8,
            background: COLORS.accent008,
            border: `1px dashed ${COLORS.accent03}`,
            borderRadius: 8,
            color: COLORS.accentLight,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: FONTS.mono,
          }}
        >
          + Add Tap Area
        </button>
      )}

      {/* Incoming connections */}
      {incomingLinks.length > 0 && (
        <>
          <h5
            style={{
              margin: "20px 0 8px",
              color: COLORS.textMuted,
              fontFamily: FONTS.mono,
              fontSize: 10,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Incoming Links
          </h5>
          {incomingLinks.map((c) => {
            const from = screens.find((s) => s.id === c.fromScreenId);
            return (
              <div
                key={c.id}
                style={{
                  padding: "8px 12px",
                  background: COLORS.bg,
                  borderRadius: 8,
                  marginBottom: 4,
                  fontSize: 11,
                  color: COLORS.textMuted,
                  fontFamily: FONTS.mono,
                }}
              >
                &larr; {from?.name} {c.condition ? `(${c.condition})` : c.label ? `(${c.label})` : ""}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

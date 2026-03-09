import { COLORS, FONTS } from "../styles/theme";

export function Sidebar({ screen, screens, connections, onClose, onRename, onAddHotspot, onEditHotspot, onAddState, onSelectScreen, onUpdateStateName }) {
  const incomingLinks = connections.filter((c) => c.toScreenId === screen.id);

  return (
    <div
      style={{
        width: 280,
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
        <button
          onClick={onRename}
          style={{
            background: "rgba(108,92,231,0.1)",
            border: "1px solid rgba(108,92,231,0.2)",
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
      </div>

      {/* Description */}
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
                    background: "rgba(108,92,231,0.05)",
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
        <button
          onClick={() => onAddState?.(screen.id)}
          style={{
            width: "100%",
            padding: "6px 0",
            marginTop: 6,
            background: "rgba(108,92,231,0.08)",
            border: "1px dashed rgba(108,92,231,0.3)",
            borderRadius: 6,
            color: COLORS.accentLight,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: FONTS.mono,
          }}
        >
          + Add State
        </button>
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

      <button
        onClick={() => onAddHotspot(screen.id)}
        style={{
          width: "100%",
          padding: "10px 0",
          marginTop: 8,
          background: "rgba(108,92,231,0.08)",
          border: "1px dashed rgba(108,92,231,0.3)",
          borderRadius: 8,
          color: COLORS.accentLight,
          fontSize: 12,
          cursor: "pointer",
          fontFamily: FONTS.mono,
        }}
      >
        + Add Tap Area
      </button>

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

import { useState } from "react";
import { COLORS, FONTS, STATUS_CONFIG, STATUS_CYCLE, Z_INDEX } from "../styles/theme";
import { SCREENS_PANEL_WIDTH } from "../constants";

export function ScreensPanel({
  screens,
  selectedScreen,
  onScreenClick,
  onUpdateStatus,
  onMarkAllExisting,
  scopeRoot,
  onSetScopeRoot,
  scopeScreenIds,
  featureBrief,
  onFeatureBriefChange,
  taskLink,
  onTaskLinkChange,
  techStack,
  onTechStackChange,
  isReadOnly,
}) {
  const [briefOpen, setBriefOpen] = useState(false);
  const [techOpen, setTechOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // { screenId, x, y }

  const handleContextMenu = (e, screenId) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ screenId, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleStatusClick = (e, screen) => {
    e.stopPropagation();
    onUpdateStatus?.(screen.id, STATUS_CYCLE[screen.status || "new"]);
  };

  return (
    <div
      style={{
        width: SCREENS_PANEL_WIDTH,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
      onClick={closeContextMenu}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h4
            style={{
              margin: 0,
              color: COLORS.text,
              fontFamily: FONTS.heading,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Screens
            <span
              style={{
                fontSize: 11,
                color: COLORS.textMuted,
                fontWeight: 400,
                fontFamily: FONTS.mono,
              }}
            >
              {screens.length}
            </span>
          </h4>
          {screens.length > 0 && (
            <button
              onClick={onMarkAllExisting}
              title="Mark all screens as Existing — then flip just the new ones"
              style={{
                background: "none",
                border: `1px solid ${COLORS.border}`,
                borderRadius: 4,
                color: COLORS.textMuted,
                cursor: "pointer",
                fontSize: 10,
                fontFamily: FONTS.ui,
                padding: "2px 6px",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = COLORS.text; e.currentTarget.style.borderColor = COLORS.textDim; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = COLORS.textMuted; e.currentTarget.style.borderColor = COLORS.border; }}
            >
              All existing
            </button>
          )}
        </div>

        {/* Scope badge */}
        {scopeRoot && scopeScreenIds && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: COLORS.accent, fontFamily: FONTS.mono }}>
              ⊙ Build scope: {scopeScreenIds.size} screen{scopeScreenIds.size !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => onSetScopeRoot?.(null)}
              title="Clear scope"
              style={{
                background: "none",
                border: "none",
                color: COLORS.textMuted,
                cursor: "pointer",
                fontSize: 11,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Feature brief toggle */}
        <button
          onClick={() => setBriefOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: featureBrief ? COLORS.accentLight : COLORS.textDim,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: FONTS.ui,
            padding: 0,
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>{briefOpen ? "▾" : "▸"}</span>
          <span>{featureBrief ? "Feature brief ✓" : "Add feature brief…"}</span>
        </button>

        {briefOpen && (
          <textarea
            value={featureBrief}
            onChange={(e) => onFeatureBriefChange?.(e.target.value)}
            placeholder="What are you building? Describe the feature in plain language so the coding agent understands context…"
            rows={4}
            style={{
              marginTop: 8,
              width: "100%",
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: COLORS.text,
              fontFamily: FONTS.ui,
              fontSize: 11,
              padding: "6px 8px",
              resize: "vertical",
              boxSizing: "border-box",
              outline: "none",
            }}
          />
        )}

        {/* Task / ticket link */}
        <div style={{ marginTop: 6 }}>
          <input
            type="url"
            value={taskLink || ""}
            onChange={(e) => onTaskLinkChange?.(e.target.value)}
            placeholder="Ticket URL (Jira, Linear, GitHub…)"
            style={{
              width: "100%",
              padding: "4px 8px",
              background: COLORS.bg,
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: taskLink ? COLORS.text : COLORS.textDim,
              fontFamily: FONTS.mono,
              fontSize: 10,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Tech stack toggle */}
        <button
          onClick={() => setTechOpen((v) => !v)}
          style={{
            background: "none",
            border: "none",
            color: Object.values(techStack || {}).some(Boolean) ? COLORS.accentLight : COLORS.textDim,
            cursor: "pointer",
            fontSize: 11,
            fontFamily: FONTS.ui,
            padding: "4px 0 0",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>{techOpen ? "▾" : "▸"}</span>
          <span>{Object.values(techStack || {}).some(Boolean) ? "Tech stack ✓" : "Add tech stack…"}</span>
        </button>

        {techOpen && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              ["stateManagement", "State mgmt"],
              ["apiClient", "API client"],
              ["navigation", "Navigation"],
              ["auth", "Auth"],
              ["uiLibrary", "UI library"],
              ["testing", "Testing"],
            ].map(([key, label]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONTS.mono, width: 64, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                <input
                  type="text"
                  value={(techStack || {})[key] || ""}
                  onChange={(e) => onTechStackChange?.({ ...(techStack || {}), [key]: e.target.value })}
                  placeholder="—"
                  style={{
                    flex: 1,
                    padding: "3px 6px",
                    background: COLORS.bg,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 4,
                    color: COLORS.text,
                    fontFamily: FONTS.mono,
                    fontSize: 10,
                    outline: "none",
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {screens.length === 0 && (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              color: COLORS.textDim,
              fontSize: 12,
              fontFamily: FONTS.ui,
            }}
          >
            No screens yet
          </div>
        )}

        {screens.map((screen) => {
          const isSelected = selectedScreen === screen.id;
          const isInScope = scopeRoot ? scopeScreenIds?.has(screen.id) : true;
          const isScopeRoot = screen.id === scopeRoot;
          const status = screen.status || "new";
          const statusCfg = STATUS_CONFIG[status];

          return (
            <div
              key={screen.id}
              onClick={() => onScreenClick(screen.id)}
              onContextMenu={(e) => handleContextMenu(e, screen.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px 8px 13px",
                cursor: "pointer",
                background: isSelected ? COLORS.accent012 : "transparent",
                borderLeft: isSelected
                  ? `3px solid ${COLORS.accent}`
                  : "3px solid transparent",
                transition: "background 0.15s, border-color 0.15s",
                opacity: scopeRoot && !isInScope ? 0.4 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = COLORS.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isSelected
                  ? COLORS.accent012
                  : "transparent";
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 44,
                  height: 72,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: COLORS.bg,
                  border: `1px solid ${isScopeRoot ? COLORS.accent : isSelected ? COLORS.accent : COLORS.border}`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {screen.imageData ? (
                  <img
                    src={screen.imageData}
                    alt={screen.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    draggable={false}
                  />
                ) : (
                  <svg
                    width="20"
                    height="30"
                    viewBox="0 0 20 30"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="1"
                      y="1"
                      width="18"
                      height="28"
                      rx="3"
                      stroke={COLORS.textDim}
                      strokeWidth="1.5"
                      fill="none"
                    />
                    <line
                      x1="7"
                      y1="4"
                      x2="13"
                      y2="4"
                      stroke={COLORS.textDim}
                      strokeWidth="1"
                      strokeLinecap="round"
                    />
                    <circle cx="10" cy="25" r="1.5" fill={COLORS.textDim} />
                  </svg>
                )}
                {isScopeRoot && (
                  <div style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    fontSize: 9,
                    lineHeight: 1,
                    title: "Scope root",
                  }}>⊙</div>
                )}
              </div>

              {/* Name + badges */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? COLORS.accentLight : COLORS.text,
                    fontFamily: FONTS.mono,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {screen.name}
                </div>
                {screen.stateGroup && screen.stateName && (
                  <div
                    style={{
                      fontSize: 9,
                      color: COLORS.accent,
                      fontFamily: FONTS.mono,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {screen.stateName}
                  </div>
                )}
                {/* Scope root badge */}
                {isScopeRoot && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      marginTop: 3,
                      padding: "1px 5px",
                      borderRadius: 3,
                      fontSize: 9,
                      fontFamily: FONTS.mono,
                      fontWeight: 600,
                      color: COLORS.accentLight,
                      background: COLORS.accent02,
                      border: `1px solid ${COLORS.accent035}`,
                    }}
                  >
                    ⊙ root
                  </div>
                )}
                {/* Status chip */}
                <div
                  onClick={(e) => handleStatusClick(e, screen)}
                  title="Click to cycle: New → Modify → Existing"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    marginTop: isScopeRoot ? 2 : 3,
                    padding: "1px 5px",
                    borderRadius: 3,
                    fontSize: 9,
                    fontFamily: FONTS.mono,
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    color: statusCfg.color,
                    background: statusCfg.bg,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  {statusCfg.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 6,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            zIndex: Z_INDEX.contextMenu,
            minWidth: 160,
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => { onSetScopeRoot?.(contextMenu.screenId === scopeRoot ? null : contextMenu.screenId); closeContextMenu(); }}
            style={{
              display: "block",
              width: "100%",
              padding: "9px 14px",
              background: "none",
              border: "none",
              color: COLORS.text,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: FONTS.ui,
              fontSize: 12,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = COLORS.surfaceHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
          >
            {contextMenu.screenId === scopeRoot ? "⊙ Clear scope root" : "⊙ Set as scope root"}
          </button>
          <div style={{ borderTop: `1px solid ${COLORS.border}` }} />
          {(["new", "modify", "existing"]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const screen = screens.find((sc) => sc.id === contextMenu.screenId);
            const isCurrent = (screen?.status || "new") === s;
            return (
              <button
                key={s}
                onClick={() => { onUpdateStatus?.(contextMenu.screenId, s); closeContextMenu(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "7px 14px",
                  background: isCurrent ? COLORS.accent01 : "none",
                  border: "none",
                  color: COLORS.text,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONTS.ui,
                  fontSize: 12,
                }}
                onMouseEnter={(e) => { if (!isCurrent) e.currentTarget.style.background = COLORS.surfaceHover; }}
                onMouseLeave={(e) => { if (!isCurrent) e.currentTarget.style.background = "none"; }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
                Mark as {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

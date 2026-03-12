import { COLORS, FONTS } from "../styles/theme";

export function ScreensPanel({ screens, selectedScreen, onScreenClick }) {
  return (
    <div
      style={{
        width: 220,
        background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
        }}
      >
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

          return (
            <div
              key={screen.id}
              onClick={() => onScreenClick(screen.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px 8px 13px",
                cursor: "pointer",
                background: isSelected ? "rgba(108,92,231,0.12)" : "transparent",
                borderLeft: isSelected
                  ? `3px solid ${COLORS.accent}`
                  : "3px solid transparent",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = COLORS.surfaceHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isSelected
                  ? "rgba(108,92,231,0.12)"
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
                  border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
              </div>

              {/* Name + state badge */}
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

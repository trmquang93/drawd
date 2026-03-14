import { useState } from "react";
import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { HEADER_HEIGHT, DEFAULT_SCREEN_WIDTH, DEFAULT_SCREEN_HEIGHT } from "../constants";

const PADDING = 30;

function computeBounds(groupScreenIds, screens) {
  const members = screens.filter((s) => groupScreenIds.includes(s.id));
  if (members.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of members) {
    const w = s.width || DEFAULT_SCREEN_WIDTH;
    const h = s.imageHeight ? s.imageHeight + HEADER_HEIGHT : DEFAULT_SCREEN_HEIGHT;
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + w);
    maxY = Math.max(maxY, s.y + h);
  }

  return {
    x: minX - PADDING,
    y: minY - PADDING - 20,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2 + 20,
  };
}

export function ScreenGroup({ group, screens, onUpdate, onDelete, onMoveScreens }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(group.name);

  const bounds = computeBounds(group.screenIds, screens);
  if (!bounds) return null;

  const color = group.color || COLORS.accent008;
  const borderColor = group.color
    ? group.color.replace(/[\d.]+\)$/, "0.4)")
    : COLORS.accent03;

  return (
    <div
      style={{
        position: "absolute",
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        background: color,
        border: `1.5px dashed ${borderColor}`,
        borderRadius: 14,
        pointerEvents: "none",
        zIndex: Z_INDEX.screenGroup,
      }}
    >
      {/* Label + controls */}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
          pointerEvents: "all",
        }}
      >
        {isEditingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              onUpdate(group.id, { name: draftName.trim() || group.name });
              setIsEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                onUpdate(group.id, { name: draftName.trim() || group.name });
                setIsEditingName(false);
              }
            }}
            style={{
              background: "rgba(0,0,0,0.5)",
              border: `1px solid ${borderColor}`,
              borderRadius: 4,
              color: COLORS.text,
              fontFamily: FONTS.mono,
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 6px",
              outline: "none",
              minWidth: 80,
            }}
          />
        ) : (
          <span
            onClick={() => { setDraftName(group.name); setIsEditingName(true); }}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: COLORS.accentLight,
              fontFamily: FONTS.mono,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "text",
              padding: "2px 6px",
              background: "rgba(0,0,0,0.35)",
              border: `1px solid ${borderColor}`,
              borderRadius: 4,
              userSelect: "none",
            }}
          >
            {group.name}
          </span>
        )}
        {group.folderHint && (
          <span
            style={{
              fontSize: 9,
              color: COLORS.textDim,
              fontFamily: FONTS.mono,
              background: "rgba(0,0,0,0.3)",
              padding: "2px 6px",
              borderRadius: 4,
            }}
          >
            {group.folderHint}
          </span>
        )}
        <button
          onClick={() => onDelete(group.id)}
          style={{
            background: "none",
            border: "none",
            color: COLORS.textDim,
            cursor: "pointer",
            fontSize: 12,
            padding: "1px 4px",
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

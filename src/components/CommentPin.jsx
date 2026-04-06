import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { COLORS, FONTS, Z_INDEX } from "../styles/theme";

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * A small pin marker rendered on the canvas anchored to a target.
 * For screen/hotspot targets, position it with left/top absolute inside
 * the screen image area. For connections, position via SVG transform.
 */
export function CommentPin({ comment, count, isSelected, onClick, onDeselect }) {
  const color = comment.authorColor || "#61afef";
  const resolved = comment.resolved;
  const pinRef = useRef(null);
  const [rect, setRect] = useState(null);

  // Compute fixed-position for the popover based on the pin's viewport rect.
  // useLayoutEffect ensures the DOM has settled before reading getBoundingClientRect.
  useLayoutEffect(() => {
    if (isSelected) setRect(pinRef.current?.getBoundingClientRect() ?? null);
    else setRect(null);
  }, [isSelected]);

  // Close popover when clicking outside the pin+popover container
  useEffect(() => {
    if (!isSelected) return;
    const handler = (e) => {
      if (pinRef.current && !pinRef.current.contains(e.target)) {
        onDeselect?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isSelected, onDeselect]);
  const POPOVER_WIDTH = 240;
  const popoverLeft = rect
    ? Math.min(rect.left + rect.width / 2 + 8, window.innerWidth - POPOVER_WIDTH - 12)
    : 0;
  const popoverTop = rect ? rect.bottom + 6 : 0;

  return (
    <div
      ref={pinRef}
      onClick={(e) => { e.stopPropagation(); onClick?.(comment.id); }}
      style={{
        position: "absolute",
        left: `${comment.anchor.xPct}%`,
        top: `${comment.anchor.yPct}%`,
        transform: "translate(-50%, -100%)",
        cursor: "pointer",
        zIndex: 20,
        userSelect: "none",
      }}
    >
      {/* Pin body */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        filter: resolved ? "grayscale(0.7) opacity(0.55)" : undefined,
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: "50% 50% 50% 0",
          transform: "rotate(-45deg)",
          background: isSelected ? "#fff" : color,
          border: `2px solid ${isSelected ? color : "rgba(0,0,0,0.35)"}`,
          boxShadow: isSelected ? `0 0 0 2px ${color}` : "0 2px 6px rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.12s ease",
        }}>
          {count > 1 && (
            <span style={{
              transform: "rotate(45deg)",
              fontSize: 8,
              fontWeight: 700,
              fontFamily: FONTS.mono,
              color: isSelected ? color : "#fff",
              lineHeight: 1,
            }}>
              {count > 9 ? "9+" : count}
            </span>
          )}
        </div>
      </div>

      {/* Expanded popover — rendered fixed to escape overflow:hidden on ScreenNode */}
      {isSelected && rect && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: popoverLeft,
            top: popoverTop,
            width: POPOVER_WIDTH,
            background: COLORS.surface,
            border: `1px solid ${color}`,
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            zIndex: Z_INDEX.modal,
            padding: "10px 12px",
          }}
        >
          {/* Header: avatar + author + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: color,
              flexShrink: 0,
              border: "1px solid rgba(255,255,255,0.2)",
            }} />
            <span style={{
              fontSize: 11,
              fontFamily: FONTS.mono,
              fontWeight: 600,
              color: COLORS.text,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {comment.authorName || "Anonymous"}
            </span>
            <span style={{
              fontSize: 10,
              color: COLORS.textDim,
              fontFamily: FONTS.mono,
              flexShrink: 0,
            }}>
              {timeAgo(comment.createdAt)}
            </span>
          </div>

          {/* Comment text */}
          <div style={{
            fontSize: 12,
            color: COLORS.text,
            fontFamily: FONTS.ui,
            lineHeight: 1.5,
            wordBreak: "break-word",
          }}>
            {comment.text}
          </div>

          {/* Resolved indicator */}
          {resolved && (
            <div style={{
              marginTop: 8,
              fontSize: 10,
              color: COLORS.success,
              fontFamily: FONTS.mono,
            }}>
              {comment.resolvedBy ? `Resolved by ${comment.resolvedBy}` : "Resolved"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SVG-based pin for connection comments, positioned at parametric t along a bezier.
 */
export function ConnectionCommentPin({ cx, cy, comment, isSelected, onClick }) {
  const color = comment.authorColor || "#61afef";
  const resolved = comment.resolved;

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onClick?.(comment.id); }}
      style={{ cursor: "pointer" }}
      opacity={resolved ? 0.45 : 1}
    >
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill={isSelected ? "#fff" : color}
        stroke={isSelected ? color : "rgba(0,0,0,0.4)"}
        strokeWidth={isSelected ? 2 : 1.5}
        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
      />
      <circle cx={cx} cy={cy} r={3} fill={isSelected ? color : "#fff"} />
    </g>
  );
}

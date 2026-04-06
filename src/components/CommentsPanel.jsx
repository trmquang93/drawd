import { useState } from "react";
import { COLORS, FONTS, Z_INDEX } from "../styles/theme";
import { TOPBAR_HEIGHT } from "../constants";
import { timeAgo, targetLabel } from "../utils/commentUtils";

const PANEL_WIDTH = 300;

function CommentCard({
  comment, screens, connections,
  canModerate, selfPeerId,
  onResolve, onUnresolve, onDelete,
  isSelected, onSelect,
}) {
  const canDelete = canModerate || (comment.authorPeerId && comment.authorPeerId === selfPeerId);

  return (
    <div
      onClick={() => onSelect(comment.id)}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        marginBottom: 6,
        background: isSelected ? COLORS.accent008 : "rgba(255,255,255,0.02)",
        border: `1px solid ${isSelected ? COLORS.accent03 : COLORS.border}`,
        cursor: "pointer",
        transition: "all 0.12s",
        opacity: comment.resolved ? 0.6 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: comment.authorColor || "#61afef",
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
        <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONTS.mono, flexShrink: 0 }}>
          {timeAgo(comment.createdAt)}
        </span>
      </div>

      {/* Target context */}
      <div style={{
        fontSize: 10,
        fontFamily: FONTS.mono,
        color: COLORS.accent,
        marginBottom: 5,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {targetLabel(comment, screens, connections)}
      </div>

      {/* Comment text */}
      <div style={{
        fontSize: 12,
        color: COLORS.textMuted,
        fontFamily: FONTS.ui,
        lineHeight: 1.45,
        wordBreak: "break-word",
      }}>
        {comment.text}
      </div>

      {/* Resolved note */}
      {comment.resolved && comment.resolvedBy && (
        <div style={{
          marginTop: 5,
          fontSize: 10,
          color: COLORS.success,
          fontFamily: FONTS.mono,
        }}>
          Resolved by {comment.resolvedBy}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        {!comment.resolved && (
          <button
            onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
            style={{
              padding: "2px 8px",
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.success,
              fontSize: 10,
              fontFamily: FONTS.mono,
              cursor: "pointer",
            }}
          >
            Resolve
          </button>
        )}
        {comment.resolved && (canModerate || (comment.authorPeerId && comment.authorPeerId === selfPeerId)) && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnresolve(comment.id); }}
            style={{
              padding: "2px 8px",
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.textMuted,
              fontSize: 10,
              fontFamily: FONTS.mono,
              cursor: "pointer",
            }}
          >
            Reopen
          </button>
        )}
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
            style={{
              padding: "2px 8px",
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 4,
              color: COLORS.danger,
              fontSize: 10,
              fontFamily: FONTS.mono,
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

export function CommentsPanel({
  comments, screens, connections,
  canModerate, selfPeerId, selfDisplayName,
  onResolve, onUnresolve, onDelete,
  selectedCommentId, onSelectComment,
  onClose,
}) {
  const [showResolved, setShowResolved] = useState(false);

  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  return (
    <div style={{
      position: "fixed",
      top: TOPBAR_HEIGHT,
      right: 0,
      bottom: 0,
      width: PANEL_WIDTH,
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
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: FONTS.heading,
            color: COLORS.text,
          }}>
            Comments
          </span>
          {open.length > 0 && (
            <span style={{
              fontSize: 10,
              fontFamily: FONTS.mono,
              fontWeight: 700,
              color: "#282c34",
              background: COLORS.accent,
              borderRadius: 8,
              padding: "1px 6px",
              lineHeight: 1.5,
            }}>
              {open.length}
            </span>
          )}
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

      {/* Comment list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px 0" }}>
        {open.length === 0 && !showResolved && (
          <div style={{
            textAlign: "center",
            padding: "40px 16px",
            color: COLORS.textDim,
            fontSize: 12,
            fontFamily: FONTS.mono,
          }}>
            No open comments.
            <br />
            <span style={{ fontSize: 11, marginTop: 6, display: "block" }}>
              Use the comment tool (C) to add one.
            </span>
          </div>
        )}
        {open.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            screens={screens}
            connections={connections}
            canModerate={canModerate}
            selfPeerId={selfPeerId}
            onResolve={onResolve}
            onUnresolve={onUnresolve}
            onDelete={onDelete}
            isSelected={c.id === selectedCommentId}
            onSelect={onSelectComment}
          />
        ))}

        {resolved.length > 0 && (
          <button
            onClick={() => setShowResolved((v) => !v)}
            style={{
              display: "block",
              width: "100%",
              padding: "6px 8px",
              marginTop: 4,
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              borderRadius: 6,
              color: COLORS.textMuted,
              fontSize: 11,
              fontFamily: FONTS.mono,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            {showResolved ? "Hide" : "Show"} {resolved.length} resolved
          </button>
        )}

        {showResolved && resolved.map((c) => (
          <CommentCard
            key={c.id}
            comment={c}
            screens={screens}
            connections={connections}
            canModerate={canModerate}
            selfPeerId={selfPeerId}
            onResolve={onResolve}
            onUnresolve={onUnresolve}
            onDelete={onDelete}
            isSelected={c.id === selectedCommentId}
            onSelect={onSelectComment}
          />
        ))}

        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}

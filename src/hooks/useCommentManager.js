import { useState, useCallback } from "react";
import { generateId } from "../utils/generateId";

/**
 * Comment shape:
 * {
 *   id,
 *   text,
 *   authorName,
 *   authorPeerId,      // null when not in a collab session
 *   authorColor,       // hex colour string from collab palette or fallback
 *   targetType: "screen" | "hotspot" | "connection",
 *   targetId,          // screenId, hotspotId, or connectionId
 *   screenId,          // parent screen for hotspot targets; same as targetId for screen targets
 *   anchor: {          // target-relative position so the pin follows moved elements
 *     xPct, yPct       // for screen/hotspot: % within the rendered screen rect
 *     // for connection: { t } — parametric position along the bezier (0–1)
 *   },
 *   resolved,
 *   resolvedAt,
 *   resolvedBy,        // authorName of the resolver
 *   createdAt,
 *   updatedAt,
 * }
 *
 * Permission model (checked by callers / UI, enforced here in delete):
 *   host / editor  → full CRUD on any comment
 *   reviewer       → add, resolve any comment, delete only their own
 *   viewer         → read-only; cannot call any mutating action
 */

const FALLBACK_AUTHOR_COLOR = "#61afef";

export function useCommentManager() {
  const [comments, setComments] = useState([]);

  // ── Add ─────────────────────────────────────────────────────────────────

  const addComment = useCallback(({
    text,
    authorName,
    authorPeerId = null,
    authorColor = FALLBACK_AUTHOR_COLOR,
    targetType,
    targetId,
    screenId,
    anchor = { xPct: 50, yPct: 50 },
  }) => {
    const now = new Date().toISOString();
    const comment = {
      id: generateId(),
      text: text.trim(),
      authorName,
      authorPeerId,
      authorColor,
      targetType,
      targetId,
      screenId,
      anchor,
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    setComments((prev) => [...prev, comment]);
    return comment.id;
  }, []);

  // ── Update text ──────────────────────────────────────────────────────────

  const updateComment = useCallback((id, text) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, text: text.trim(), updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  // ── Resolve / unresolve ──────────────────────────────────────────────────

  const resolveComment = useCallback((id, resolvedBy = "") => {
    const now = new Date().toISOString();
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, resolved: true, resolvedAt: now, resolvedBy, updatedAt: now }
          : c
      )
    );
  }, []);

  const unresolveComment = useCallback((id) => {
    const now = new Date().toISOString();
    setComments((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, resolved: false, resolvedAt: null, resolvedBy: null, updatedAt: now }
          : c
      )
    );
  }, []);

  // ── Delete ───────────────────────────────────────────────────────────────

  const deleteComment = useCallback((id) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Cascade cleanup helpers ──────────────────────────────────────────────
  // Called when a target (screen / hotspot / connection) is deleted so that
  // comments do not become orphaned. Callers are responsible for invoking
  // these from every deletion path (single + batch + conditional group).

  const deleteCommentsForScreen = useCallback((screenId) => {
    setComments((prev) => prev.filter((c) => c.screenId !== screenId));
  }, []);

  const deleteCommentsForScreens = useCallback((screenIds) => {
    const idSet = new Set(screenIds);
    setComments((prev) => prev.filter((c) => !idSet.has(c.screenId)));
  }, []);

  const deleteCommentsForHotspot = useCallback((hotspotId) => {
    setComments((prev) =>
      prev.filter((c) => !(c.targetType === "hotspot" && c.targetId === hotspotId))
    );
  }, []);

  const deleteCommentsForHotspots = useCallback((hotspotIds) => {
    const idSet = new Set(hotspotIds);
    setComments((prev) =>
      prev.filter((c) => !(c.targetType === "hotspot" && idSet.has(c.targetId)))
    );
  }, []);

  const deleteCommentsForConnection = useCallback((connectionId) => {
    setComments((prev) =>
      prev.filter((c) => !(c.targetType === "connection" && c.targetId === connectionId))
    );
  }, []);

  const deleteCommentsForConnections = useCallback((connectionIds) => {
    const idSet = new Set(connectionIds);
    setComments((prev) =>
      prev.filter((c) => !(c.targetType === "connection" && idSet.has(c.targetId)))
    );
  }, []);

  return {
    comments,
    setComments,
    addComment,
    updateComment,
    resolveComment,
    unresolveComment,
    deleteComment,
    deleteCommentsForScreen,
    deleteCommentsForScreens,
    deleteCommentsForHotspot,
    deleteCommentsForHotspots,
    deleteCommentsForConnection,
    deleteCommentsForConnections,
  };
}

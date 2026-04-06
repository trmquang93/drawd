export const commentTools = [
  {
    name: "list_comments",
    description: "List comments in the flow. Can filter by target, type, or resolved status.",
    inputSchema: {
      type: "object",
      properties: {
        targetId: { type: "string", description: "Filter by screenId, hotspotId, or connectionId" },
        targetType: { type: "string", enum: ["screen", "hotspot", "connection"], description: "Filter by target type" },
        resolved: { type: "boolean", description: "Filter by resolved status (omit for all)" },
      },
    },
  },
  {
    name: "create_comment",
    description: "Add a comment anchored to a screen, hotspot, or connection.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Comment text" },
        targetType: { type: "string", enum: ["screen", "hotspot", "connection"], description: "What the comment is anchored to" },
        targetId: { type: "string", description: "ID of the target (screenId, hotspotId, or connectionId)" },
        screenId: { type: "string", description: "Parent screenId (required for hotspot targets; same as targetId for screen targets)" },
        authorName: { type: "string", description: "Display name for the comment author (default: 'MCP Agent')" },
        anchorXPct: { type: "number", description: "Horizontal anchor position as % of target width (0–100, default 50)" },
        anchorYPct: { type: "number", description: "Vertical anchor position as % of target height (0–100, default 50)" },
      },
      required: ["text", "targetType", "targetId"],
    },
  },
  {
    name: "update_comment",
    description: "Edit the text of an existing comment.",
    inputSchema: {
      type: "object",
      properties: {
        commentId: { type: "string", description: "Comment ID to update" },
        text: { type: "string", description: "New comment text" },
      },
      required: ["commentId", "text"],
    },
  },
  {
    name: "resolve_comment",
    description: "Mark a comment as resolved.",
    inputSchema: {
      type: "object",
      properties: {
        commentId: { type: "string", description: "Comment ID to resolve" },
        resolvedBy: { type: "string", description: "Name of the resolver (default: 'MCP Agent')" },
      },
      required: ["commentId"],
    },
  },
  {
    name: "delete_comment",
    description: "Permanently delete a comment.",
    inputSchema: {
      type: "object",
      properties: {
        commentId: { type: "string", description: "Comment ID to delete" },
      },
      required: ["commentId"],
    },
  },
];

export function handleCommentTool(name, args, state) {
  switch (name) {
    case "list_comments": {
      const comments = state.listComments({
        targetId: args.targetId,
        targetType: args.targetType,
        resolved: args.resolved,
      });
      return { comments, count: comments.length };
    }

    case "create_comment": {
      const comment = state.addComment({
        text: args.text,
        targetType: args.targetType,
        targetId: args.targetId,
        screenId: args.screenId || (args.targetType === "screen" ? args.targetId : undefined),
        authorName: args.authorName || "MCP Agent",
        anchor: {
          xPct: args.anchorXPct ?? 50,
          yPct: args.anchorYPct ?? 50,
        },
      });
      return { commentId: comment.id, authorName: comment.authorName, targetType: comment.targetType };
    }

    case "update_comment": {
      const comment = state.updateComment(args.commentId, args.text);
      return { success: true, commentId: comment?.id ?? args.commentId };
    }

    case "resolve_comment": {
      const comment = state.resolveComment(args.commentId, args.resolvedBy || "MCP Agent");
      return { success: true, commentId: comment?.id ?? args.commentId, resolvedBy: comment?.resolvedBy ?? args.resolvedBy ?? "MCP Agent" };
    }

    case "delete_comment": {
      state.deleteComment(args.commentId);
      return { success: true };
    }

    default:
      throw new Error(`Unknown comment tool: ${name}`);
  }
}

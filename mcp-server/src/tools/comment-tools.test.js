import { describe, it, expect, vi } from "vitest";
import { handleCommentTool } from "./comment-tools.js";

const makeMockState = () => ({
  listComments: vi.fn(() => [{ id: "c1" }, { id: "c2" }]),
  addComment: vi.fn((opts) => ({
    id: "c-new",
    authorName: opts.authorName || "MCP Agent",
    targetType: opts.targetType,
    screenId: opts.screenId,
    anchor: opts.anchor,
  })),
  updateComment: vi.fn((id) => ({ id })),
  resolveComment: vi.fn((id, resolvedBy) => ({ id, resolvedBy })),
  deleteComment: vi.fn(),
});

// ── list_comments ─────────────────────────────────────────────────────────────

describe("handleCommentTool — list_comments", () => {
  it("passes filter args to state.listComments", () => {
    const state = makeMockState();
    handleCommentTool("list_comments", { targetId: "s1", targetType: "screen", resolved: false }, state);
    expect(state.listComments).toHaveBeenCalledWith({
      targetId: "s1",
      targetType: "screen",
      resolved: false,
    });
  });

  it("returns { comments, count } with count matching array length", () => {
    const state = makeMockState();
    const result = handleCommentTool("list_comments", {}, state);
    expect(result.comments).toHaveLength(2);
    expect(result.count).toBe(2);
  });
});

// ── create_comment ────────────────────────────────────────────────────────────

describe("handleCommentTool — create_comment", () => {
  it("maps anchorXPct/anchorYPct to an anchor object", () => {
    const state = makeMockState();
    handleCommentTool("create_comment", {
      text: "hi",
      targetType: "screen",
      targetId: "s1",
      anchorXPct: 30,
      anchorYPct: 70,
    }, state);
    expect(state.addComment).toHaveBeenCalledWith(
      expect.objectContaining({ anchor: { xPct: 30, yPct: 70 } })
    );
  });

  it("defaults anchor to { xPct: 50, yPct: 50 } when not provided", () => {
    const state = makeMockState();
    handleCommentTool("create_comment", {
      text: "hi",
      targetType: "screen",
      targetId: "s1",
    }, state);
    expect(state.addComment).toHaveBeenCalledWith(
      expect.objectContaining({ anchor: { xPct: 50, yPct: 50 } })
    );
  });

  it("defaults screenId to targetId for screen-targeted comments", () => {
    const state = makeMockState();
    handleCommentTool("create_comment", {
      text: "hi",
      targetType: "screen",
      targetId: "s1",
    }, state);
    expect(state.addComment).toHaveBeenCalledWith(
      expect.objectContaining({ screenId: "s1" })
    );
  });

  it("does not override screenId for hotspot-targeted comments", () => {
    const state = makeMockState();
    handleCommentTool("create_comment", {
      text: "hi",
      targetType: "hotspot",
      targetId: "h1",
      screenId: "s2",
    }, state);
    expect(state.addComment).toHaveBeenCalledWith(
      expect.objectContaining({ screenId: "s2" })
    );
  });

  it("defaults authorName to 'MCP Agent'", () => {
    const state = makeMockState();
    handleCommentTool("create_comment", {
      text: "hi",
      targetType: "screen",
      targetId: "s1",
    }, state);
    expect(state.addComment).toHaveBeenCalledWith(
      expect.objectContaining({ authorName: "MCP Agent" })
    );
  });

  it("returns { commentId, authorName, targetType }", () => {
    const state = makeMockState();
    const result = handleCommentTool("create_comment", {
      text: "hi",
      targetType: "screen",
      targetId: "s1",
    }, state);
    expect(result).toHaveProperty("commentId", "c-new");
    expect(result).toHaveProperty("authorName", "MCP Agent");
    expect(result).toHaveProperty("targetType", "screen");
  });
});

// ── update_comment ────────────────────────────────────────────────────────────

describe("handleCommentTool — update_comment", () => {
  it("calls state.updateComment with commentId and text", () => {
    const state = makeMockState();
    handleCommentTool("update_comment", { commentId: "c1", text: "new text" }, state);
    expect(state.updateComment).toHaveBeenCalledWith("c1", "new text");
  });

  it("returns { success: true, commentId }", () => {
    const state = makeMockState();
    const result = handleCommentTool("update_comment", { commentId: "c1", text: "new" }, state);
    expect(result).toEqual({ success: true, commentId: "c1" });
  });
});

// ── resolve_comment ───────────────────────────────────────────────────────────

describe("handleCommentTool — resolve_comment", () => {
  it("defaults resolvedBy to 'MCP Agent' when not provided", () => {
    const state = makeMockState();
    handleCommentTool("resolve_comment", { commentId: "c1" }, state);
    expect(state.resolveComment).toHaveBeenCalledWith("c1", "MCP Agent");
  });

  it("passes custom resolvedBy through to state.resolveComment", () => {
    const state = makeMockState();
    handleCommentTool("resolve_comment", { commentId: "c1", resolvedBy: "Alice" }, state);
    expect(state.resolveComment).toHaveBeenCalledWith("c1", "Alice");
  });
});

// ── delete_comment ────────────────────────────────────────────────────────────

describe("handleCommentTool — delete_comment", () => {
  it("calls state.deleteComment with commentId", () => {
    const state = makeMockState();
    handleCommentTool("delete_comment", { commentId: "c1" }, state);
    expect(state.deleteComment).toHaveBeenCalledWith("c1");
  });

  it("returns { success: true }", () => {
    const state = makeMockState();
    const result = handleCommentTool("delete_comment", { commentId: "c1" }, state);
    expect(result).toEqual({ success: true });
  });
});

// ── Unknown tool ──────────────────────────────────────────────────────────────

describe("handleCommentTool — unknown tool", () => {
  it("throws for an unrecognized tool name", () => {
    const state = makeMockState();
    expect(() => handleCommentTool("bad_tool", {}, state)).toThrow("Unknown comment tool");
  });
});

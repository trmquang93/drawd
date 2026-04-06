import { describe, it, expect, beforeEach, vi } from "vitest";
import { FlowState } from "./state.js";

// Prevent filesystem writes in all tests by mocking _autoSave on each instance.
// The mutation methods (addComment, updateComment, etc.) all call _autoSave() as
// their final step; mocking it lets us test the state logic without touching the fs.
const makeState = () => {
  const state = new FlowState();
  state._autoSave = vi.fn();
  return state;
};

// ── Constructor ───────────────────────────────────────────────────────────────

describe("FlowState constructor", () => {
  it("initializes comments as an empty array", () => {
    const state = makeState();
    expect(state.comments).toEqual([]);
  });
});

// ── addComment ────────────────────────────────────────────────────────────────

describe("FlowState.addComment", () => {
  it("adds a comment and returns the created object", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hello", targetType: "screen", targetId: "s1" });
    expect(state.comments).toHaveLength(1);
    expect(comment).toBe(state.comments[0]);
  });

  it("trims whitespace from text", () => {
    const state = makeState();
    const comment = state.addComment({ text: "  hello  ", targetType: "screen", targetId: "s1" });
    expect(comment.text).toBe("hello");
  });

  it("defaults authorName to 'MCP Agent'", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    expect(comment.authorName).toBe("MCP Agent");
  });

  it("uses provided authorName when given", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1", authorName: "Alice" });
    expect(comment.authorName).toBe("Alice");
  });

  it("defaults screenId to targetId for screen-targeted comments", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    expect(comment.screenId).toBe("s1");
  });

  it("uses provided screenId for hotspot-targeted comments", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "hotspot", targetId: "h1", screenId: "s1" });
    expect(comment.screenId).toBe("s1");
  });

  it("sets resolved: false initially", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    expect(comment.resolved).toBe(false);
    expect(comment.resolvedAt).toBeNull();
    expect(comment.resolvedBy).toBeNull();
  });

  it("calls _autoSave", () => {
    const state = makeState();
    state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    expect(state._autoSave).toHaveBeenCalled();
  });
});

// ── updateComment ─────────────────────────────────────────────────────────────

describe("FlowState.updateComment", () => {
  it("updates text and updatedAt for the matching comment", () => {
    const state = makeState();
    const comment = state.addComment({ text: "original", targetType: "screen", targetId: "s1" });
    const before = comment.updatedAt;
    const updated = state.updateComment(comment.id, "  new text  ");
    expect(updated.text).toBe("new text");
    expect(updated.updatedAt).toBeDefined();
    // updatedAt may be the same millisecond; just verify the field was set
    expect(typeof updated.updatedAt).toBe("string");
    expect(updated).toBe(comment); // same object mutated
  });

  it("throws when commentId is not found", () => {
    const state = makeState();
    expect(() => state.updateComment("nonexistent", "text")).toThrow("Comment not found");
  });
});

// ── resolveComment ────────────────────────────────────────────────────────────

describe("FlowState.resolveComment", () => {
  it("sets resolved: true, resolvedAt, and resolvedBy", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    state.resolveComment(comment.id, "Bob");
    expect(comment.resolved).toBe(true);
    expect(comment.resolvedAt).not.toBeNull();
    expect(comment.resolvedBy).toBe("Bob");
  });

  it("defaults resolvedBy to 'MCP Agent'", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    state.resolveComment(comment.id);
    expect(comment.resolvedBy).toBe("MCP Agent");
  });

  it("throws when commentId is not found", () => {
    const state = makeState();
    expect(() => state.resolveComment("nonexistent")).toThrow("Comment not found");
  });
});

// ── unresolveComment ──────────────────────────────────────────────────────────

describe("FlowState.unresolveComment", () => {
  it("clears resolved, resolvedAt, and resolvedBy", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    state.resolveComment(comment.id, "Bob");
    state.unresolveComment(comment.id);
    expect(comment.resolved).toBe(false);
    expect(comment.resolvedAt).toBeNull();
    expect(comment.resolvedBy).toBeNull();
  });

  it("throws when commentId is not found", () => {
    const state = makeState();
    expect(() => state.unresolveComment("nonexistent")).toThrow("Comment not found");
  });
});

// ── deleteComment ─────────────────────────────────────────────────────────────

describe("FlowState.deleteComment", () => {
  it("removes the comment with the matching id", () => {
    const state = makeState();
    const comment = state.addComment({ text: "hi", targetType: "screen", targetId: "s1" });
    state.deleteComment(comment.id);
    expect(state.comments).toHaveLength(0);
  });

  it("throws when commentId is not found", () => {
    const state = makeState();
    expect(() => state.deleteComment("nonexistent")).toThrow("Comment not found");
  });
});

// ── listComments ──────────────────────────────────────────────────────────────

describe("FlowState.listComments", () => {
  let state;

  beforeEach(() => {
    state = makeState();
    // Seed a variety of comments directly to avoid _autoSave complexity
    state.comments = [
      { id: "c1", targetId: "s1", targetType: "screen", resolved: false },
      { id: "c2", targetId: "s1", targetType: "screen", resolved: true },
      { id: "c3", targetId: "h1", targetType: "hotspot", resolved: false },
      { id: "c4", targetId: "conn1", targetType: "connection", resolved: true },
    ];
  });

  it("returns all comments when no filters are provided", () => {
    expect(state.listComments()).toHaveLength(4);
  });

  it("filters by targetId", () => {
    const result = state.listComments({ targetId: "s1" });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.targetId === "s1")).toBe(true);
  });

  it("filters by targetType", () => {
    const result = state.listComments({ targetType: "hotspot" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c3");
  });

  it("filters by resolved: true", () => {
    const result = state.listComments({ resolved: true });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.resolved === true)).toBe(true);
  });

  it("filters by resolved: false", () => {
    const result = state.listComments({ resolved: false });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.resolved === false)).toBe(true);
  });

  it("combines multiple filters", () => {
    const result = state.listComments({ targetId: "s1", resolved: false });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  it("returns empty array when no comments match", () => {
    const result = state.listComments({ targetId: "nonexistent" });
    expect(result).toEqual([]);
  });
});

// ── getSummary comment counts ─────────────────────────────────────────────────

describe("FlowState.getSummary comment counts", () => {
  it("includes commentCount reflecting total comments", () => {
    const state = makeState();
    state.comments = [
      { id: "c1", resolved: false },
      { id: "c2", resolved: true },
      { id: "c3", resolved: false },
    ];
    const summary = state.getSummary();
    expect(summary.commentCount).toBe(3);
  });

  it("unresolvedCommentCount excludes resolved comments", () => {
    const state = makeState();
    state.comments = [
      { id: "c1", resolved: false },
      { id: "c2", resolved: true },
      { id: "c3", resolved: false },
    ];
    const summary = state.getSummary();
    expect(summary.unresolvedCommentCount).toBe(2);
  });
});

// ── createNew ─────────────────────────────────────────────────────────────────

describe("FlowState.createNew", () => {
  it("resets comments to empty array", () => {
    const state = makeState();
    state.comments = [{ id: "c1", resolved: false }];
    // Pass null filePath to skip the file write
    state.createNew(null);
    expect(state.comments).toEqual([]);
  });
});

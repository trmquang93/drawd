import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// vi.mock is hoisted above imports, so generateId below is the mock vi.fn().
vi.mock("../utils/generateId.js", () => ({
  generateId: vi.fn(() => "mock-id"),
}));

import { generateId } from "../utils/generateId.js";
import { useCommentManager } from "./useCommentManager.js";

const NOW = new Date("2026-01-15T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  generateId.mockReturnValue("mock-id");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeInput = (overrides = {}) => ({
  text: "Test comment",
  authorName: "Alice",
  targetType: "screen",
  targetId: "s1",
  screenId: "s1",
  ...overrides,
});

// ── addComment ────────────────────────────────────────────────────────────────

describe("addComment", () => {
  it("adds a comment and returns its id", () => {
    const { result } = renderHook(() => useCommentManager());
    let id;
    act(() => {
      id = result.current.addComment(makeInput());
    });
    expect(result.current.comments).toHaveLength(1);
    expect(id).toBe("mock-id");
    expect(result.current.comments[0].id).toBe("mock-id");
  });

  it("trims whitespace from the text", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ text: "  hello  " }));
    });
    expect(result.current.comments[0].text).toBe("hello");
  });

  it("uses fallback author color (#61afef) when authorColor is not provided", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    expect(result.current.comments[0].authorColor).toBe("#61afef");
  });

  it("defaults anchor to { xPct: 50, yPct: 50 } when not provided", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    expect(result.current.comments[0].anchor).toEqual({ xPct: 50, yPct: 50 });
  });

  it("sets resolved: false, resolvedAt: null, resolvedBy: null, and timestamps", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    const c = result.current.comments[0];
    expect(c.resolved).toBe(false);
    expect(c.resolvedAt).toBeNull();
    expect(c.resolvedBy).toBeNull();
    expect(c.createdAt).toBe(NOW.toISOString());
    expect(c.updatedAt).toBe(NOW.toISOString());
  });

  it("appends without replacing existing comments", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ text: "first" }));
      result.current.addComment(makeInput({ text: "second" }));
    });
    expect(result.current.comments).toHaveLength(2);
  });
});

// ── updateComment ─────────────────────────────────────────────────────────────

describe("updateComment", () => {
  it("updates the text for a matching id", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ text: "original" }));
    });
    act(() => {
      result.current.updateComment("mock-id", "updated");
    });
    expect(result.current.comments[0].text).toBe("updated");
  });

  it("trims whitespace from the new text", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    act(() => {
      result.current.updateComment("mock-id", "  trimmed  ");
    });
    expect(result.current.comments[0].text).toBe("trimmed");
  });

  it("does not modify other comments", () => {
    generateId.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ text: "first" }));
      result.current.addComment(makeInput({ text: "second" }));
    });
    act(() => {
      result.current.updateComment("id-1", "changed");
    });
    expect(result.current.comments[1].text).toBe("second");
  });

  it("is a no-op when id is not found", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ text: "original" }));
    });
    act(() => {
      result.current.updateComment("nonexistent", "new text");
    });
    expect(result.current.comments[0].text).toBe("original");
  });
});

// ── resolveComment ────────────────────────────────────────────────────────────

describe("resolveComment", () => {
  it("sets resolved: true, resolvedAt, resolvedBy, and updates updatedAt", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    act(() => {
      result.current.resolveComment("mock-id", "Bob");
    });
    const c = result.current.comments[0];
    expect(c.resolved).toBe(true);
    expect(c.resolvedAt).toBe(NOW.toISOString());
    expect(c.resolvedBy).toBe("Bob");
    expect(c.updatedAt).toBe(NOW.toISOString());
  });

  it("defaults resolvedBy to empty string when not provided", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    act(() => {
      result.current.resolveComment("mock-id");
    });
    expect(result.current.comments[0].resolvedBy).toBe("");
  });
});

// ── unresolveComment ──────────────────────────────────────────────────────────

describe("unresolveComment", () => {
  it("clears resolved, resolvedAt, and resolvedBy", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    act(() => {
      result.current.resolveComment("mock-id", "Bob");
    });
    act(() => {
      result.current.unresolveComment("mock-id");
    });
    const c = result.current.comments[0];
    expect(c.resolved).toBe(false);
    expect(c.resolvedAt).toBeNull();
    expect(c.resolvedBy).toBeNull();
  });

  it("updates updatedAt", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    act(() => {
      result.current.resolveComment("mock-id", "Bob");
    });
    const laterTime = new Date(NOW.getTime() + 5000);
    vi.setSystemTime(laterTime);
    act(() => {
      result.current.unresolveComment("mock-id");
    });
    expect(result.current.comments[0].updatedAt).toBe(laterTime.toISOString());
  });
});

// ── deleteComment ─────────────────────────────────────────────────────────────

describe("deleteComment", () => {
  it("removes the comment with the matching id", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput());
    });
    act(() => {
      result.current.deleteComment("mock-id");
    });
    expect(result.current.comments).toHaveLength(0);
  });

  it("does not remove comments with non-matching ids", () => {
    generateId.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ text: "keep" }));
      result.current.addComment(makeInput({ text: "remove" }));
    });
    act(() => {
      result.current.deleteComment("id-2");
    });
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].text).toBe("keep");
  });
});

// ── Cascade delete helpers ────────────────────────────────────────────────────

describe("deleteCommentsForScreen", () => {
  it("removes all comments with the matching screenId", () => {
    generateId.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2");

    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ screenId: "s1", targetType: "screen", targetId: "s1" }));
      result.current.addComment(makeInput({ screenId: "s2", targetType: "screen", targetId: "s2" }));
    });
    act(() => {
      result.current.deleteCommentsForScreen("s1");
    });
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].screenId).toBe("s2");
  });

  it("also removes hotspot-targeted comments whose screenId matches", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({
        targetType: "hotspot",
        targetId: "h1",
        screenId: "s1",
      }));
    });
    act(() => {
      result.current.deleteCommentsForScreen("s1");
    });
    expect(result.current.comments).toHaveLength(0);
  });
});

describe("deleteCommentsForScreens", () => {
  it("removes comments for multiple screenIds and preserves others", () => {
    generateId
      .mockReturnValueOnce("id-1")
      .mockReturnValueOnce("id-2")
      .mockReturnValueOnce("id-3");

    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ screenId: "s1" }));
      result.current.addComment(makeInput({ screenId: "s2" }));
      result.current.addComment(makeInput({ screenId: "s3" }));
    });
    act(() => {
      result.current.deleteCommentsForScreens(["s1", "s2"]);
    });
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].screenId).toBe("s3");
  });
});

describe("deleteCommentsForHotspot", () => {
  it("removes comments with targetType=hotspot and matching targetId", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ targetType: "hotspot", targetId: "h1", screenId: "s1" }));
    });
    act(() => {
      result.current.deleteCommentsForHotspot("h1");
    });
    expect(result.current.comments).toHaveLength(0);
  });

  it("does not remove screen-targeted comments that happen to share the same id", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ targetType: "screen", targetId: "h1", screenId: "h1" }));
    });
    act(() => {
      result.current.deleteCommentsForHotspot("h1");
    });
    expect(result.current.comments).toHaveLength(1);
  });
});

describe("deleteCommentsForHotspots", () => {
  it("batch-removes hotspot comments and preserves others", () => {
    generateId.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2").mockReturnValueOnce("id-3");

    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ targetType: "hotspot", targetId: "h1", screenId: "s1" }));
      result.current.addComment(makeInput({ targetType: "hotspot", targetId: "h2", screenId: "s1" }));
      result.current.addComment(makeInput({ targetType: "screen", targetId: "s1", screenId: "s1" }));
    });
    act(() => {
      result.current.deleteCommentsForHotspots(["h1", "h2"]);
    });
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].targetType).toBe("screen");
  });
});

describe("deleteCommentsForConnection", () => {
  it("removes comments with targetType=connection and matching targetId", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ targetType: "connection", targetId: "c1", screenId: "s1" }));
    });
    act(() => {
      result.current.deleteCommentsForConnection("c1");
    });
    expect(result.current.comments).toHaveLength(0);
  });

  it("does not remove hotspot-targeted comments with the same id", () => {
    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ targetType: "hotspot", targetId: "c1", screenId: "s1" }));
    });
    act(() => {
      result.current.deleteCommentsForConnection("c1");
    });
    expect(result.current.comments).toHaveLength(1);
  });
});

describe("deleteCommentsForConnections", () => {
  it("batch-removes connection comments and preserves others", () => {
    generateId.mockReturnValueOnce("id-1").mockReturnValueOnce("id-2").mockReturnValueOnce("id-3");

    const { result } = renderHook(() => useCommentManager());
    act(() => {
      result.current.addComment(makeInput({ targetType: "connection", targetId: "c1", screenId: "s1" }));
      result.current.addComment(makeInput({ targetType: "connection", targetId: "c2", screenId: "s1" }));
      result.current.addComment(makeInput({ targetType: "screen", targetId: "s1", screenId: "s1" }));
    });
    act(() => {
      result.current.deleteCommentsForConnections(["c1", "c2"]);
    });
    expect(result.current.comments).toHaveLength(1);
    expect(result.current.comments[0].targetType).toBe("screen");
  });
});

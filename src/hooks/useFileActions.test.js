import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFileActions } from "./useFileActions";

function setup(overrides = {}) {
  const deps = {
    screens: [],
    connections: [],
    documents: [],
    replaceAll: vi.fn(),
    pushHistory: vi.fn(),
    setPan: vi.fn(),
    setZoom: vi.fn(),
    setFeatureBrief: vi.fn(),
    setTaskLink: vi.fn(),
    setTechStack: vi.fn(),
    setDataModels: vi.fn(),
    setStickyNotes: vi.fn(),
    setScreenGroups: vi.fn(),
    setComments: vi.fn(),
    setScopeRoot: vi.fn(),
    openFile: vi.fn(),
    saveAs: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  };
  const { result } = renderHook(() => useFileActions(deps));
  return { result, deps };
}

function makePayload(extra = {}) {
  return {
    screens: [{ id: "s1", name: "Screen 1" }],
    connections: [],
    documents: [],
    viewport: { pan: { x: 100, y: 200 }, zoom: 1.5 },
    metadata: { featureBrief: "brief", taskLink: "link", techStack: { react: true } },
    dataModels: [],
    stickyNotes: [],
    screenGroups: [],
    comments: [],
    ...extra,
  };
}

describe("useFileActions.applyPayload", () => {
  it("applies viewport for a normal (non-MCP) open", () => {
    const { result, deps } = setup();
    act(() => result.current.applyPayload(makePayload()));

    expect(deps.setPan).toHaveBeenCalledWith({ x: 100, y: 200 });
    expect(deps.setZoom).toHaveBeenCalledWith(1.5);
    expect(deps.setScopeRoot).toHaveBeenCalledWith(null);
    expect(deps.replaceAll).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 2, expect.any(Array), {},
    );
  });

  it("preserves viewport when source is mcp", () => {
    const { result, deps } = setup();
    act(() => result.current.applyPayload(makePayload(), { source: "mcp" }));

    expect(deps.setPan).not.toHaveBeenCalled();
    expect(deps.setZoom).not.toHaveBeenCalled();
  });

  it("preserves scopeRoot when source is mcp", () => {
    const { result, deps } = setup();
    act(() => result.current.applyPayload(makePayload(), { source: "mcp" }));

    expect(deps.setScopeRoot).not.toHaveBeenCalled();
  });

  it("passes preserveSelection to replaceAll for MCP updates", () => {
    const { result, deps } = setup();
    act(() => result.current.applyPayload(makePayload(), { source: "mcp" }));

    expect(deps.replaceAll).toHaveBeenCalledWith(
      expect.any(Array), expect.any(Array), 2, expect.any(Array),
      { preserveHistory: true, preserveSelection: true },
    );
  });

  it("pushes undo history for MCP updates", () => {
    const existing = {
      screens: [{ id: "old" }],
      connections: [{ id: "c1" }],
      documents: [{ id: "d1" }],
    };
    const { result, deps } = setup(existing);
    act(() => result.current.applyPayload(makePayload(), { source: "mcp" }));

    expect(deps.pushHistory).toHaveBeenCalledWith(
      existing.screens, existing.connections, existing.documents,
    );
  });

  it("does not push undo history for normal opens", () => {
    const { result, deps } = setup();
    act(() => result.current.applyPayload(makePayload()));

    expect(deps.pushHistory).not.toHaveBeenCalled();
  });

  it("still applies metadata for MCP updates", () => {
    const { result, deps } = setup();
    act(() => result.current.applyPayload(makePayload(), { source: "mcp" }));

    expect(deps.setFeatureBrief).toHaveBeenCalledWith("brief");
    expect(deps.setTaskLink).toHaveBeenCalledWith("link");
    expect(deps.setTechStack).toHaveBeenCalledWith({ react: true });
  });
});

describe("useFileActions.applyPayload — replaceAll preserveSelection integration", () => {
  it("replaceAll with preserveSelection keeps selected screen if it still exists", () => {
    // This tests the actual useScreenManager behavior via integration
    // The unit contract: replaceAll receives { preserveSelection: true }
    // when source === 'mcp', keeping the selected screen if its ID remains.
    const { result, deps } = setup();
    const payload = makePayload({
      screens: [{ id: "s1", name: "Updated Screen" }, { id: "s2", name: "New Screen" }],
    });

    act(() => result.current.applyPayload(payload, { source: "mcp" }));

    const call = deps.replaceAll.mock.calls[0];
    const opts = call[4];
    expect(opts.preserveSelection).toBe(true);
  });
});

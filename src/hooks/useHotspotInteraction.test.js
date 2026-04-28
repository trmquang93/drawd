import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHotspotInteraction } from "./useHotspotInteraction";

// Minimal fake mousedown event accepted by onImageAreaMouseDown.
// The handler reads e.currentTarget.getBoundingClientRect() + clientX/Y and
// calls preventDefault/stopPropagation. canvasRef is NOT touched on the
// "draw" path so a stub ref is sufficient.
function makeMouseEvent({ clientX = 100, clientY = 200 } = {}) {
  return {
    clientX,
    clientY,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
    currentTarget: {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 390,
        height: 844,
        right: 390,
        bottom: 844,
      }),
    },
  };
}

const baseHookProps = (screens) => ({
  screens,
  canvasRef: { current: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 1000 }) } },
  pan: { x: 0, y: 0 },
  zoom: 1,
  connecting: null,
  setSelectedConnection: () => {},
  captureDragSnapshot: () => {},
  commitDragSnapshot: () => {},
  moveHotspot: () => {},
  resizeHotspot: () => {},
  updateScreenDimensions: () => {},
  assignScreenImage: () => {},
  activeTool: "select",
});

const canonicalScreen = (overrides = {}) => ({
  id: "s-canon",
  name: "LoginScreen",
  x: 0,
  y: 0,
  width: 390,
  imageWidth: 390,
  imageHeight: 844,
  imageData: "data:image/png;base64,CANONICAL",
  hotspots: [],
  componentId: "c1",
  componentRole: "canonical",
  ...overrides,
});

// IMPORTANT: an instance does NOT carry imageData/imageHeight on disk —
// those fields are merged in at render time by resolveInstanceVisuals.
// useHotspotInteraction receives the RAW screens[] (see Drawd.jsx:277),
// so an instance object here intentionally has those fields blank.
const instanceScreen = (overrides = {}) => ({
  id: "s-inst",
  name: "LoginScreen — Onboarding placement",
  x: 1000,
  y: 0,
  width: undefined,
  imageWidth: undefined,
  imageHeight: undefined,
  imageData: null,
  hotspots: [],
  componentId: "c1",
  componentRole: "instance",
  ...overrides,
});

describe("useHotspotInteraction.onImageAreaMouseDown — instance screens", () => {
  it("enters draw mode on a canonical screen (baseline sanity)", () => {
    const canonical = canonicalScreen();
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical])),
    );

    expect(result.current.hotspotInteraction).toBeNull();

    act(() => {
      result.current.onImageAreaMouseDown(makeMouseEvent(), canonical.id);
    });

    expect(result.current.hotspotInteraction).not.toBeNull();
    expect(result.current.hotspotInteraction.mode).toBe("draw");
    expect(result.current.hotspotInteraction.screenId).toBe(canonical.id);
  });

  // BUG REPRO: dragging on an instance's image area must start "draw" mode
  // exactly like a canonical. Today the handler short-circuits because the
  // raw instance has no imageData/imageHeight (they live only on the
  // canonical and are merged in by resolveInstanceVisuals at render time).
  it("enters draw mode on an instance screen whose canonical has an image", () => {
    const canonical = canonicalScreen();
    const instance = instanceScreen();
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical, instance])),
    );

    act(() => {
      result.current.onImageAreaMouseDown(makeMouseEvent(), instance.id);
    });

    expect(result.current.hotspotInteraction).not.toBeNull();
    expect(result.current.hotspotInteraction?.mode).toBe("draw");
    expect(result.current.hotspotInteraction?.screenId).toBe(instance.id);
  });

  it("enters draw mode on an instance even when it already has local hotspots", () => {
    const canonical = canonicalScreen();
    const instance = instanceScreen({
      hotspots: [{ id: "h-local", label: "Skip", x: 50, y: 50, w: 30, h: 10 }],
    });
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical, instance])),
    );

    act(() => {
      result.current.onImageAreaMouseDown(makeMouseEvent(), instance.id);
    });

    expect(result.current.hotspotInteraction?.mode).toBe("draw");
    expect(result.current.hotspotInteraction?.screenId).toBe(instance.id);
  });

  it("does NOT enter draw mode when the canonical has no image (orphan/empty)", () => {
    // Regression guard: the existing "no image" guard must still skip
    // genuinely image-less screens. This ensures any fix doesn't accidentally
    // open draw mode on instances pointing at an empty canonical.
    const canonical = canonicalScreen({ imageData: null, imageHeight: undefined, imageWidth: undefined });
    const instance = instanceScreen();
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical, instance])),
    );

    act(() => {
      result.current.onImageAreaMouseDown(makeMouseEvent(), instance.id);
    });

    expect(result.current.hotspotInteraction).toBeNull();
  });

  it("orphan instance (canonical missing) does NOT enter draw mode", () => {
    // If the canonical was deleted but auto-promotion didn't run for some
    // reason, the instance is effectively imageless. Drawing should be a no-op.
    const orphan = instanceScreen();
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([orphan])),
    );

    act(() => {
      result.current.onImageAreaMouseDown(makeMouseEvent(), orphan.id);
    });

    expect(result.current.hotspotInteraction).toBeNull();
  });
});

// Criterion 1 (success criteria): on an instance screen, hotspot drag/resize
// and the connect-handle drag must all work. None of these handlers should
// role-check the screen — they read screen.hotspots directly, which on an
// instance holds its own additive locals.
describe("useHotspotInteraction — instance hotspot interactions", () => {
  it("onHotspotMouseDown on an instance's local hotspot enters 'selected' mode", () => {
    const canonical = canonicalScreen();
    const localHs = { id: "h-local", label: "Skip", x: 50, y: 50, w: 30, h: 10 };
    const instance = instanceScreen({ hotspots: [localHs] });
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical, instance])),
    );

    act(() => {
      result.current.onHotspotMouseDown(makeMouseEvent(), instance.id, localHs.id);
    });

    expect(result.current.hotspotInteraction).not.toBeNull();
    expect(result.current.hotspotInteraction?.mode).toBe("selected");
    expect(result.current.hotspotInteraction?.screenId).toBe(instance.id);
    expect(result.current.hotspotInteraction?.hotspotId).toBe(localHs.id);
  });

  it("onResizeHandleMouseDown on an instance's local hotspot enters 'resize' mode", () => {
    const canonical = canonicalScreen();
    const localHs = { id: "h-local", label: "Skip", x: 50, y: 50, w: 30, h: 10 };
    const instance = instanceScreen({ hotspots: [localHs] });
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical, instance])),
    );

    act(() => {
      result.current.onResizeHandleMouseDown(makeMouseEvent(), instance.id, localHs.id, "br");
    });

    expect(result.current.hotspotInteraction?.mode).toBe("resize");
    expect(result.current.hotspotInteraction?.screenId).toBe(instance.id);
    expect(result.current.hotspotInteraction?.hotspotId).toBe(localHs.id);
    expect(result.current.hotspotInteraction?.handle).toBe("br");
    // Snapshot of starting rect captured for delta math during drag.
    expect(result.current.hotspotInteraction?.startRect).toEqual({
      x: localHs.x, y: localHs.y, w: localHs.w, h: localHs.h,
    });
  });

  it("onHotspotDragHandleMouseDown on an instance hotspot enters 'hotspot-drag' mode", () => {
    // The connect-handle drag is what wires up new connections from an
    // instance's local hotspot. Must enter hotspot-drag mode regardless of role.
    const canonical = canonicalScreen();
    const localHs = { id: "h-local", label: "Skip", x: 50, y: 50, w: 30, h: 10 };
    const instance = instanceScreen({ hotspots: [localHs] });
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical, instance])),
    );

    act(() => {
      result.current.onHotspotDragHandleMouseDown(makeMouseEvent(), instance.id, localHs.id);
    });

    expect(result.current.hotspotInteraction?.mode).toBe("hotspot-drag");
    expect(result.current.hotspotInteraction?.screenId).toBe(instance.id);
    expect(result.current.hotspotInteraction?.hotspotId).toBe(localHs.id);
  });

  it("alt-click on an instance's local hotspot starts hotspot-drag (connect shortcut)", () => {
    // Alt+mousedown on a hotspot is the keyboard shortcut for the connect
    // handle. Must also work on an instance's local hotspot.
    const canonical = canonicalScreen();
    const localHs = { id: "h-local", label: "Skip", x: 50, y: 50, w: 30, h: 10 };
    const instance = instanceScreen({ hotspots: [localHs] });
    const { result } = renderHook(() =>
      useHotspotInteraction(baseHookProps([canonical, instance])),
    );

    act(() => {
      result.current.onHotspotMouseDown(
        { ...makeMouseEvent(), altKey: true },
        instance.id,
        localHs.id,
      );
    });

    expect(result.current.hotspotInteraction?.mode).toBe("hotspot-drag");
    expect(result.current.hotspotInteraction?.screenId).toBe(instance.id);
    expect(result.current.hotspotInteraction?.hotspotId).toBe(localHs.id);
  });
});

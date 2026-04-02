import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const { screenNodeSpy } = vi.hoisted(() => ({
  screenNodeSpy: vi.fn(),
}));

vi.mock("./ScreenNode", () => ({
  ScreenNode: (props) => {
    screenNodeSpy(props);
    return <div data-testid={`screen-node-${props.screen.id}`}>{props.screen.name}</div>;
  },
}));

vi.mock("./ConnectionLines", () => ({
  ConnectionLines: () => <div data-testid="connection-lines" />,
}));

vi.mock("./ConditionalPrompt", () => ({
  ConditionalPrompt: () => <div data-testid="conditional-prompt" />,
}));

vi.mock("./ConnectionTypePrompt", () => ({
  ConnectionTypePrompt: () => <div data-testid="connection-type-prompt" />,
}));

vi.mock("./InlineConditionLabels", () => ({
  InlineConditionLabels: () => <div data-testid="inline-condition-labels" />,
}));

vi.mock("./SelectionOverlay", () => ({
  SelectionOverlay: () => <div data-testid="selection-overlay" />,
}));

vi.mock("./EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock("./ToolBar", () => ({
  ToolBar: () => <div data-testid="toolbar" />,
}));

vi.mock("./StickyNote", () => ({
  StickyNote: () => <div data-testid="sticky-note" />,
}));

vi.mock("./ScreenGroup", () => ({
  ScreenGroup: () => <div data-testid="screen-group" />,
}));

vi.mock("./RemoteCursors", () => ({
  RemoteCursors: () => <div data-testid="remote-cursors" />,
}));

import { CanvasArea } from "./CanvasArea";

function makeProps(overrides = {}) {
  return {
    canvasRef: { current: null },
    pan: { x: 0, y: 0 },
    zoom: 1,
    canvasCursor: "default",
    onCanvasMouseDown: vi.fn(),
    onCanvasMouseMove: vi.fn(),
    onCanvasMouseUp: vi.fn(),
    onCanvasMouseLeave: vi.fn(),
    onCanvasDrop: vi.fn(),
    screenGroups: [],
    selectedScreenGroup: null,
    updateScreenGroup: vi.fn(),
    deleteScreenGroup: vi.fn(),
    addScreenToGroup: vi.fn(),
    removeScreenFromGroup: vi.fn(),
    addScreenGroup: vi.fn(),
    setSelectedScreenGroup: vi.fn(),
    setSelectedStickyNote: vi.fn(),
    setSelectedScreen: vi.fn(),
    setSelectedConnection: vi.fn(),
    setHotspotInteraction: vi.fn(),
    screens: [],
    selectedScreen: null,
    clearSelection: vi.fn(),
    onDragStart: vi.fn(),
    isSpaceHeld: { current: false },
    addHotspotViaConnect: vi.fn(),
    removeScreen: vi.fn(),
    onDotDragStart: vi.fn(),
    onConnectComplete: vi.fn(),
    setHoverTarget: vi.fn(),
    hoverTarget: null,
    connecting: null,
    hotspotInteraction: null,
    selectedHotspotId: null,
    selectedHotspots: [],
    onHotspotMouseDown: vi.fn(),
    onHotspotDoubleClick: vi.fn(),
    onImageAreaMouseDown: vi.fn(),
    onHotspotDragHandleMouseDown: vi.fn(),
    onResizeHandleMouseDown: vi.fn(),
    onScreenDimensions: vi.fn(),
    drawRect: null,
    updateScreenDescription: vi.fn(),
    addState: vi.fn(),
    handleDropImage: vi.fn(),
    activeTool: "select",
    scopeRoot: null,
    scopeScreenIds: null,
    canvasSelection: [],
    toggleSelection: vi.fn(),
    onMultiDragStart: vi.fn(),
    isReadOnly: false,
    onFormSummary: vi.fn(),
    stickyNotes: [],
    selectedStickyNote: null,
    updateStickyNote: vi.fn(),
    deleteStickyNote: vi.fn(),
    addStickyNote: vi.fn(),
    rubberBandRect: null,
    connections: [],
    previewLine: null,
    hotspotPreviewLine: null,
    selectedConnection: null,
    onConnectionClick: vi.fn(),
    onConnectionDoubleClick: vi.fn(),
    onEndpointMouseDown: vi.fn(),
    endpointDragPreview: null,
    repositionGhost: null,
    conditionalPrompt: null,
    onConditionalPromptConfirm: vi.fn(),
    onConditionalPromptCancel: vi.fn(),
    connectionTypePrompt: null,
    onConnectionTypeNavigate: vi.fn(),
    onConnectionTypeStateVariant: vi.fn(),
    collab: { isConnected: false, remoteCursors: [] },
    editingConditionGroup: null,
    updateConnection: vi.fn(),
    setEditingConditionGroup: vi.fn(),
    groupContextMenu: null,
    setGroupContextMenu: vi.fn(),
    setActiveTool: vi.fn(),
    handleImageUpload: vi.fn(),
    addScreenAtCenter: vi.fn(),
    isDraggingOver: false,
    onCanvasDragEnter: vi.fn(),
    onCanvasDragLeave: vi.fn(),
    ...overrides,
  };
}

describe("CanvasArea", () => {
  beforeEach(() => {
    screenNodeSpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders screens without throwing when form summary handler is provided", () => {
    const onFormSummary = vi.fn();
    render(
      <CanvasArea
        {...makeProps({
          screens: [{ id: "screen-1", name: "Login", x: 10, y: 20, hotspots: [] }],
          onFormSummary,
        })}
      />
    );

    expect(screen.getByTestId("screen-node-screen-1").textContent).toBe("Login");
    expect(screenNodeSpy).toHaveBeenCalledTimes(1);
    expect(screenNodeSpy.mock.calls[0][0].onFormSummary).toBe(onFormSummary);
  });

  it("renders drop zone overlay when isDraggingOver is true", () => {
    render(<CanvasArea {...makeProps({ isDraggingOver: true })} />);
    expect(screen.getByTestId("drop-zone-overlay")).toBeTruthy();
    expect(screen.getByText("Drop images to create screens")).toBeTruthy();
  });

  it("does not render drop zone overlay when isDraggingOver is false", () => {
    render(<CanvasArea {...makeProps({ isDraggingOver: false })} />);
    expect(screen.queryByTestId("drop-zone-overlay")).toBeNull();
  });
});
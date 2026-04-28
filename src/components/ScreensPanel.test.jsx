import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ScreensPanel } from "./ScreensPanel";

afterEach(cleanup);

const baseScreens = [
  { id: "a", name: "Login", status: "new", x: 0, y: 0 },
  { id: "b", name: "Home", status: "new", x: 0, y: 0 },
];

function renderPanel(overrides = {}) {
  const props = {
    screens: baseScreens,
    selectedScreen: null,
    onScreenClick: vi.fn(),
    onUpdateStatus: vi.fn(),
    onMarkAllStatus: vi.fn(),
    scopeRoot: null,
    onSetScopeRoot: vi.fn(),
    scopeScreenIds: null,
    featureBrief: "",
    onFeatureBriefChange: vi.fn(),
    taskLink: "",
    onTaskLinkChange: vi.fn(),
    techStack: "",
    onTechStackChange: vi.fn(),
    onSetComponent: vi.fn(),
    isReadOnly: false,
    ...overrides,
  };
  return { props, ...render(<ScreensPanel {...props} />) };
}

describe("ScreensPanel — bulk status button", () => {
  it("hides the button when there are no screens", () => {
    renderPanel({ screens: [] });
    expect(screen.queryByTestId("bulk-status-button")).toBeNull();
  });

  it("shows label 'All new' when every screen is new", () => {
    renderPanel();
    expect(screen.getByTestId("bulk-status-button").textContent).toContain("All new");
  });

  it("shows label 'All existing' when every screen is existing", () => {
    renderPanel({
      screens: [
        { id: "a", name: "x", status: "existing" },
        { id: "b", name: "y", status: "existing" },
      ],
    });
    expect(screen.getByTestId("bulk-status-button").textContent).toContain("All existing");
  });

  it("falls back to 'All existing' label when statuses are mixed", () => {
    renderPanel({
      screens: [
        { id: "a", name: "x", status: "new" },
        { id: "b", name: "y", status: "modify" },
      ],
    });
    expect(screen.getByTestId("bulk-status-button").textContent).toContain("All existing");
  });

  it("treats undefined status as 'new' when computing the bulk label", () => {
    renderPanel({
      screens: [
        { id: "a", name: "x" },
        { id: "b", name: "y", status: "new" },
      ],
    });
    expect(screen.getByTestId("bulk-status-button").textContent).toContain("All new");
  });

  it("left-click cycles from uniform 'new' to 'modify'", () => {
    const { props } = renderPanel();
    fireEvent.click(screen.getByTestId("bulk-status-button"));
    expect(props.onMarkAllStatus).toHaveBeenCalledWith("modify");
  });

  it("left-click cycles from uniform 'modify' to 'existing'", () => {
    const { props } = renderPanel({
      screens: [
        { id: "a", name: "x", status: "modify" },
        { id: "b", name: "y", status: "modify" },
      ],
    });
    fireEvent.click(screen.getByTestId("bulk-status-button"));
    expect(props.onMarkAllStatus).toHaveBeenCalledWith("existing");
  });

  it("left-click cycles from uniform 'existing' back to 'new' (round trip)", () => {
    const { props } = renderPanel({
      screens: [
        { id: "a", name: "x", status: "existing" },
        { id: "b", name: "y", status: "existing" },
      ],
    });
    fireEvent.click(screen.getByTestId("bulk-status-button"));
    expect(props.onMarkAllStatus).toHaveBeenCalledWith("new");
  });

  it("left-click on mixed state defaults to 'existing' (preserves legacy one-shot behavior)", () => {
    const { props } = renderPanel({
      screens: [
        { id: "a", name: "x", status: "new" },
        { id: "b", name: "y", status: "modify" },
      ],
    });
    fireEvent.click(screen.getByTestId("bulk-status-button"));
    expect(props.onMarkAllStatus).toHaveBeenCalledWith("existing");
  });

  it("right-click opens a 3-option menu", () => {
    renderPanel();
    expect(screen.queryByTestId("bulk-status-menu")).toBeNull();
    fireEvent.contextMenu(screen.getByTestId("bulk-status-button"));

    const menu = screen.getByTestId("bulk-status-menu");
    expect(menu).toBeTruthy();
    expect(menu.textContent).toContain("Mark all as New");
    expect(menu.textContent).toContain("Mark all as Modify");
    expect(menu.textContent).toContain("Mark all as Existing");
  });

  it("right-click menu jumps directly to the chosen status and closes", () => {
    const { props } = renderPanel();
    fireEvent.contextMenu(screen.getByTestId("bulk-status-button"));
    fireEvent.click(screen.getByText("Mark all as Modify"));
    expect(props.onMarkAllStatus).toHaveBeenCalledWith("modify");
    expect(screen.queryByTestId("bulk-status-menu")).toBeNull();
  });

  it("read-only mode disables both left-click cycle and right-click menu", () => {
    const { props } = renderPanel({ isReadOnly: true });
    const btn = screen.getByTestId("bulk-status-button");

    fireEvent.click(btn);
    expect(props.onMarkAllStatus).not.toHaveBeenCalled();

    fireEvent.contextMenu(btn);
    expect(screen.queryByTestId("bulk-status-menu")).toBeNull();
  });
});

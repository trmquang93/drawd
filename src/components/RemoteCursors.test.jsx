import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { RemoteCursors } from "./RemoteCursors";

function makeCursor(id, overrides = {}) {
  return {
    id,
    displayName: `User-${id}`,
    color: "#ff0000",
    x: 100,
    y: 200,
    lastUpdate: Date.now(),
    ...overrides,
  };
}

describe("RemoteCursors", () => {
  it("renders nothing when cursors is empty", () => {
    const { container } = render(<RemoteCursors cursors={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when cursors is null", () => {
    const { container } = render(<RemoteCursors cursors={null} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders one element per cursor", () => {
    const cursors = [makeCursor("a"), makeCursor("b")];
    const { container } = render(<RemoteCursors cursors={cursors} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs).toHaveLength(2);
  });

  it("displays the cursor display name", () => {
    const cursors = [makeCursor("a", { displayName: "Alice" })];
    const { container } = render(<RemoteCursors cursors={cursors} />);
    expect(container.textContent).toContain("Alice");
  });
});

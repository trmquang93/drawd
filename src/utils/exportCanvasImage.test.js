import { describe, it, expect } from "vitest";
import {
  selectExportItems,
  computeExportBounds,
  buildCanvasSvg,
  screenContentToHref,
} from "./exportCanvasImage";

function makeScreen(overrides = {}) {
  return {
    id: "s1",
    name: "Screen 1",
    x: 0,
    y: 0,
    width: 220,
    imageHeight: 120,
    imageData: null,
    svgContent: null,
    wireframe: null,
    hotspots: [],
    ...overrides,
  };
}

function makeConnection(overrides = {}) {
  return {
    id: "c1",
    fromScreenId: "s1",
    toScreenId: "s2",
    label: "",
    condition: "",
    connectionPath: null,
    hotspotId: null,
    ...overrides,
  };
}

function makeSticky(overrides = {}) {
  return { id: "n1", x: 500, y: 100, width: 220, color: "yellow", content: "", ...overrides };
}

function makeGroup(overrides = {}) {
  return { id: "g1", name: "Auth", screenIds: ["s1", "s2"], color: "rgba(97,175,239,0.08)", ...overrides };
}

describe("selectExportItems", () => {
  const screens = [makeScreen({ id: "s1" }), makeScreen({ id: "s2", x: 400 }), makeScreen({ id: "s3", x: 800 })];
  const connections = [
    makeConnection({ id: "c-a", fromScreenId: "s1", toScreenId: "s2" }),
    makeConnection({ id: "c-b", fromScreenId: "s2", toScreenId: "s3" }),
    makeConnection({ id: "c-c", fromScreenId: "s1", toScreenId: "s3" }),
  ];
  const stickyNotes = [makeSticky({ id: "n1" }), makeSticky({ id: "n2" })];
  const screenGroups = [
    makeGroup({ id: "g-12", screenIds: ["s1", "s2"] }),
    makeGroup({ id: "g-23", screenIds: ["s2", "s3"] }),
  ];

  it("returns everything when no selection or scope is provided", () => {
    const out = selectExportItems({ screens, connections, stickyNotes, screenGroups });
    expect(out.screens).toHaveLength(3);
    expect(out.connections).toHaveLength(3);
    expect(out.stickyNotes).toHaveLength(2);
    expect(out.screenGroups).toHaveLength(2);
  });

  it("filters by scopeScreenIds and drops connections that leave the scope", () => {
    const out = selectExportItems({
      screens,
      connections,
      stickyNotes,
      screenGroups,
      scopeScreenIds: new Set(["s1", "s2"]),
    });
    expect(out.screens.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(out.connections.map((c) => c.id)).toEqual(["c-a"]);
    // sticky notes are not scope-bound
    expect(out.stickyNotes).toHaveLength(2);
    // only the group whose members are all in scope
    expect(out.screenGroups.map((g) => g.id)).toEqual(["g-12"]);
  });

  it("honours an explicit selection over scope and includes only selected sticky notes", () => {
    const out = selectExportItems({
      screens,
      connections,
      stickyNotes,
      screenGroups,
      selection: [
        { type: "screen", id: "s2" },
        { type: "screen", id: "s3" },
        { type: "sticky", id: "n2" },
      ],
      // Provide a scope that should be ignored once selection is present.
      scopeScreenIds: new Set(["s1"]),
    });
    expect(out.screens.map((s) => s.id)).toEqual(["s2", "s3"]);
    expect(out.connections.map((c) => c.id)).toEqual(["c-b"]);
    expect(out.stickyNotes.map((n) => n.id)).toEqual(["n2"]);
    expect(out.screenGroups.map((g) => g.id)).toEqual(["g-23"]);
  });

  it("returns empty sticky list when selection contains no sticky entries", () => {
    const out = selectExportItems({
      screens,
      connections,
      stickyNotes,
      screenGroups,
      selection: [{ type: "screen", id: "s1" }],
    });
    expect(out.stickyNotes).toEqual([]);
  });
});

describe("computeExportBounds", () => {
  it("returns null when there is nothing to export", () => {
    expect(
      computeExportBounds({ screens: [], connections: [], stickyNotes: [], screenGroups: [] }),
    ).toBeNull();
  });

  it("expands the union of screen bounds by the requested padding on each side", () => {
    const items = {
      screens: [makeScreen({ id: "s1", x: 0, y: 0 }), makeScreen({ id: "s2", x: 400, y: 200 })],
      connections: [],
      stickyNotes: [],
      screenGroups: [],
    };
    const b = computeExportBounds(items, 40);
    // Screen s1 spans (0,0)-(220, 157), s2 spans (400,200)-(620, 357). Padding = 40.
    expect(b.minX).toBe(-40);
    expect(b.minY).toBe(-40);
    expect(b.width).toBe(620 + 80);
    expect(b.height).toBe(357 + 80);
  });

  it("includes sticky notes in the bounds", () => {
    const items = {
      screens: [],
      connections: [],
      stickyNotes: [makeSticky({ id: "n1", x: 100, y: 100 })],
      screenGroups: [],
    };
    const b = computeExportBounds(items, 0);
    expect(b.minX).toBe(100);
    expect(b.minY).toBe(100);
    expect(b.width).toBe(220);
    expect(b.height).toBe(120);
  });

  it("expands bounds to fit a screen group's padded rectangle", () => {
    const screens = [makeScreen({ id: "s1", x: 100, y: 100 })];
    const items = {
      screens,
      connections: [],
      stickyNotes: [],
      screenGroups: [makeGroup({ id: "g1", screenIds: ["s1"] })],
    };
    const b = computeExportBounds(items, 0);
    // Group adds 30px padding on left/right/bottom and 30+20px on top.
    expect(b.minX).toBe(70); // 100 - 30
    expect(b.minY).toBe(50); // 100 - 30 - 20
  });
});

describe("buildCanvasSvg", () => {
  it("returns null when bounds is missing", () => {
    expect(
      buildCanvasSvg({
        screens: [],
        connections: [],
        stickyNotes: [],
        screenGroups: [],
        bounds: null,
      }),
    ).toBeNull();
  });

  it("emits a self-contained SVG with viewBox covering the bounds", () => {
    const items = {
      screens: [makeScreen({ id: "s1", x: 0, y: 0 })],
      connections: [],
      stickyNotes: [],
      screenGroups: [],
    };
    const bounds = computeExportBounds(items, 40);
    const svg = buildCanvasSvg({ ...items, bounds });
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(`viewBox="${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}"`);
    // Background rect is present
    expect(svg).toContain(`fill="#21252b"`);
    // Screen card + name appear
    expect(svg).toContain(">Screen 1<");
  });

  it("renders connections as bezier paths with arrowheads when both endpoints exist", () => {
    const screens = [makeScreen({ id: "s1", x: 0, y: 0 }), makeScreen({ id: "s2", x: 400, y: 0 })];
    const connections = [makeConnection({ id: "c1", fromScreenId: "s1", toScreenId: "s2", label: "Tap" })];
    const items = { screens, connections, stickyNotes: [], screenGroups: [] };
    const bounds = computeExportBounds(items, 40);
    const svg = buildCanvasSvg({ ...items, bounds });
    expect(svg).toContain('marker-end="url(#d-arrow)"');
    expect(svg).toContain('<path d="M ');
    expect(svg).toContain(">Tap<");
  });

  it("uses the api-success color when the connection path is api-success", () => {
    const screens = [makeScreen({ id: "s1" }), makeScreen({ id: "s2", x: 400 })];
    const connections = [
      makeConnection({ id: "c1", fromScreenId: "s1", toScreenId: "s2", connectionPath: "api-success" }),
    ];
    const items = { screens, connections, stickyNotes: [], screenGroups: [] };
    const svg = buildCanvasSvg({ ...items, bounds: computeExportBounds(items, 40) });
    expect(svg).toContain('marker-end="url(#d-arrow-success)"');
    expect(svg).toContain('stroke="#98c379"');
  });

  it("renders sticky notes with the correct color palette", () => {
    const items = {
      screens: [],
      connections: [],
      stickyNotes: [makeSticky({ id: "n1", color: "blue", content: "Hello\nWorld" })],
      screenGroups: [],
    };
    const svg = buildCanvasSvg({ ...items, bounds: computeExportBounds(items, 0) });
    expect(svg).toContain('fill="#001a2d"'); // blue background
    expect(svg).toContain(">Hello<");
    expect(svg).toContain(">World<");
  });

  it("escapes XML-special characters in screen names and labels", () => {
    const screens = [makeScreen({ id: "s1", name: 'A & B <C>' }), makeScreen({ id: "s2", x: 400 })];
    const connections = [makeConnection({ id: "c1", fromScreenId: "s1", toScreenId: "s2", label: '<click>' })];
    const items = { screens, connections, stickyNotes: [], screenGroups: [] };
    const svg = buildCanvasSvg({ ...items, bounds: computeExportBounds(items, 40) });
    expect(svg).toContain("A &amp; B &lt;C&gt;");
    expect(svg).toContain("&lt;click&gt;");
    expect(svg).not.toMatch(/A & B/);
  });

  it("emits a screen group rectangle with its name label", () => {
    const screens = [makeScreen({ id: "s1" }), makeScreen({ id: "s2", x: 400 })];
    const items = {
      screens,
      connections: [],
      stickyNotes: [],
      screenGroups: [makeGroup({ id: "g1", name: "Auth Flow", screenIds: ["s1", "s2"] })],
    };
    const svg = buildCanvasSvg({ ...items, bounds: computeExportBounds(items, 40) });
    expect(svg).toContain("Auth Flow");
    expect(svg).toContain('stroke-dasharray="6 4"');
  });
});

describe("screenContentToHref", () => {
  it("returns the imageData URL directly when present", () => {
    const screen = makeScreen({ imageData: "data:image/png;base64,AAA" });
    expect(screenContentToHref(screen)).toBe("data:image/png;base64,AAA");
  });

  it("encodes svgContent into a base64 data URL", () => {
    const screen = makeScreen({ svgContent: "<svg/>" });
    const href = screenContentToHref(screen);
    expect(href).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("converts a wireframe into a base64 SVG data URL", () => {
    const screen = makeScreen({
      wireframe: { components: [], viewport: { width: 100, height: 200 } },
    });
    const href = screenContentToHref(screen);
    expect(href).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("returns null for a blank screen", () => {
    expect(screenContentToHref(makeScreen())).toBeNull();
  });
});

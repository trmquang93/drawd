import { describe, it, expect } from "vitest";
import { handleDesignTokenTool, designTokenTools } from "../design-token-tools.js";
import { extractDesignTokens, _internal } from "../../utils/extract-design-tokens.js";

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeScreen(id, name, html) {
  return {
    id,
    name,
    x: 0,
    y: 0,
    sourceHtml: html,
    imageData: null,
    hotspots: [],
  };
}

function makeState(screens, screenGroups = []) {
  return {
    screens,
    connections: [],
    documents: [],
    dataModels: [],
    stickyNotes: [],
    screenGroups,
    comments: [],
    metadata: { name: "Test Flow" },
    filePath: "/tmp/test.drawd",
  };
}

// ── Synthetic HTML helpers ───────────────────────────────────────────────────

const MONO_HTML = `
<div style="display:flex; flex-direction:column; background-color:#0B0B0F; color:#FFFFFF; padding:16px; gap:12px;">
  <div style="font-family:Inter; font-size:28px; color:#FFFFFF;">Title</div>
  <div style="background-color:#1F1F29; border-radius:12px; padding:16px;">
    <div style="font-family:Inter; font-size:14px; color:#A0A0AB;">Subtitle</div>
  </div>
  <div style="background-color:#7C5CFF; border-radius:8px; padding:12px 24px;">
    <div style="font-family:Inter; font-size:16px; color:#FFFFFF;">Button</div>
  </div>
</div>`;

const MONO_HTML_2 = `
<div style="display:flex; flex-direction:column; background-color:#0B0B0F; color:#FFFFFF; padding:16px; gap:8px;">
  <div style="font-family:Inter; font-size:20px; color:#FFFFFF;">Page 2</div>
  <div style="background-color:#1F1F29; border-radius:12px; padding:16px 24px;">
    <div style="font-size:14px; color:#A0A0AB;">Content</div>
  </div>
</div>`;

const BICHROMATIC_HTML = `
<div style="display:flex; flex-direction:column; background-color:#FFFFFF; color:#1A1A1A; padding:20px; gap:16px;">
  <div style="font-family:SF Pro Display; font-size:36px; color:#1A1A1A;">Header</div>
  <div style="background-color:#F5F5F5; border-radius:20px; padding:16px;">
    <div style="font-family:SF Pro Display; font-size:14px; color:#666666;">Card</div>
  </div>
  <div style="background-color:#007AFF; border-radius:9999px; padding:12px 32px;">
    <div style="font-family:SF Pro Display; font-size:16px; color:#FFFFFF;">Action</div>
  </div>
</div>`;

const FONT_VARIETY_HTML = `
<div style="display:flex; flex-direction:column; background:#222; padding:8px;">
  <div style="font-family:'Roboto Mono', monospace; font-size:12px; color:#0f0;">Code</div>
  <div style="font-family:Poppins, sans-serif; font-size:24px; color:#fff;">Heading</div>
  <div style="font-family:Inter; font-size:14px; color:#ccc;">Body</div>
</div>`;

const MIXED_RADII_HTML = `
<div style="display:flex; flex-direction:column; background-color:#111; padding:4px; gap:4px;">
  <div style="border-radius:4px; background-color:#333; padding:8px;">
    <div style="font-size:12px; color:#fff;">Small</div>
  </div>
  <div style="border-radius:16px; background-color:#333; padding:12px;">
    <div style="font-size:16px; color:#fff;">Medium</div>
  </div>
  <div style="border-radius:9999px; background-color:#333; padding:8px 16px;">
    <div style="font-size:14px; color:#fff;">Pill</div>
  </div>
  <div style="border:2px solid #ff5722; border-radius:8px; padding:8px;">
    <div style="font-size:14px; color:#fff;">Alert</div>
  </div>
</div>`;

// ── Tool definition tests ────────────────────────────────────────────────────

describe("designTokenTools tool definitions", () => {
  it("declares exactly 1 tool: get_design_tokens", () => {
    expect(designTokenTools).toHaveLength(1);
    expect(designTokenTools[0].name).toBe("get_design_tokens");
  });

  it("has a valid input schema with optional scopeRoot and screenIds", () => {
    const schema = designTokenTools[0].inputSchema;
    expect(schema.type).toBe("object");
    expect(schema.properties.scopeRoot).toBeDefined();
    expect(schema.properties.screenIds).toBeDefined();
    expect(schema.required).toBeUndefined();
  });
});

// ── Extractor unit tests ─────────────────────────────────────────────────────

describe("extractFromHtml", () => {
  it("extracts text colors from color property", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="color:#FF0000;">Red</div>'
    );
    expect(tokens.textColors.has("#ff0000")).toBe(true);
  });

  it("extracts background colors from background-color", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="background-color:#0B0B0F;">Bg</div>'
    );
    expect(tokens.bgColors.has("#0b0b0f")).toBe(true);
  });

  it("extracts solid colors from background shorthand", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="background:#222;">Bg</div>'
    );
    expect(tokens.bgColors.has("#222222")).toBe(true);
  });

  it("skips gradients in background shorthand", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="background:linear-gradient(to right, #000, #fff);">Grad</div>'
    );
    expect(tokens.bgColors.size).toBe(0);
  });

  it("extracts font families", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="font-family:Inter, sans-serif;">Text</div>'
    );
    expect(tokens.fontFamilies.has("Inter")).toBe(true);
    expect(tokens.fontFamilies.has("sans-serif")).toBe(true);
  });

  it("extracts font sizes in px", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="font-size:16px;">Text</div>'
    );
    expect(tokens.fontSizes.has(16)).toBe(true);
  });

  it("extracts border-radius values", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="border-radius:12px;">Box</div>'
    );
    expect(tokens.radii.has(12)).toBe(true);
  });

  it("extracts spacing from padding, margin, and gap", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="padding:16px; margin:8px; gap:12px;">Content</div>'
    );
    expect(tokens.spacing.has(16)).toBe(true);
    expect(tokens.spacing.has(8)).toBe(true);
    expect(tokens.spacing.has(12)).toBe(true);
  });

  it("handles shorthand spacing (e.g., padding: 8px 16px)", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="padding:8px 16px;">Content</div>'
    );
    expect(tokens.spacing.has(8)).toBe(true);
    expect(tokens.spacing.has(16)).toBe(true);
  });

  it("extracts border colors into accent", () => {
    const tokens = _internal.extractFromHtml(
      '<div style="border:2px solid #ff5722;">Alert</div>'
    );
    expect(tokens.accentColors.has("#ff5722")).toBe(true);
  });
});

describe("normalizeColor", () => {
  it("normalizes 3-digit hex to 6-digit", () => {
    expect(_internal.normalizeColor("#abc")).toBe("#aabbcc");
  });

  it("lowercases hex", () => {
    expect(_internal.normalizeColor("#ABCDEF")).toBe("#abcdef");
  });

  it("strips fully-opaque 8-digit hex alpha", () => {
    expect(_internal.normalizeColor("#aabbccff")).toBe("#aabbcc");
  });
});

// ── Cross-screen aggregation tests ───────────────────────────────────────────

describe("extractDesignTokens — monochromatic flow", () => {
  const screens = [
    makeScreen("s1", "Login", MONO_HTML),
    makeScreen("s2", "Dashboard", MONO_HTML_2),
  ];

  const result = extractDesignTokens(screens);

  it("identifies #0b0b0f as a background color (appears on both screens)", () => {
    expect(result.colors.background).toContain("#0b0b0f");
  });

  it("identifies #1f1f29 as background or surface (appears on both screens)", () => {
    const all = [...result.colors.background, ...result.colors.surface];
    expect(all).toContain("#1f1f29");
  });

  it("identifies #ffffff and #a0a0ab as text colors", () => {
    expect(result.colors.text).toContain("#ffffff");
    expect(result.colors.text).toContain("#a0a0ab");
  });

  it("returns Inter as a font family", () => {
    expect(result.typography.fontFamilies).toContain("Inter");
  });

  it("returns font sizes sorted", () => {
    expect(result.typography.sizes).toEqual(
      [...result.typography.sizes].sort((a, b) => a - b)
    );
    expect(result.typography.sizes).toContain(14);
    expect(result.typography.sizes).toContain(28);
  });

  it("returns radii sorted", () => {
    expect(result.radii).toEqual([...result.radii].sort((a, b) => a - b));
    expect(result.radii).toContain(12);
  });

  it("returns spacing sorted", () => {
    expect(result.spacing).toEqual([...result.spacing].sort((a, b) => a - b));
    expect(result.spacing).toContain(8);
    expect(result.spacing).toContain(16);
  });
});

describe("extractDesignTokens — bichromatic flow", () => {
  const screens = [
    makeScreen("s1", "Light Home", BICHROMATIC_HTML),
    makeScreen("s2", "Light Detail", BICHROMATIC_HTML),
  ];

  const result = extractDesignTokens(screens);

  it("identifies #ffffff as background", () => {
    expect(result.colors.background).toContain("#ffffff");
  });

  it("includes #f5f5f5 in surface or background", () => {
    const all = [...result.colors.background, ...result.colors.surface];
    expect(all).toContain("#f5f5f5");
  });

  it("includes SF Pro Display in font families", () => {
    expect(result.typography.fontFamilies).toContain("SF Pro Display");
  });

  it("includes pill radius 9999", () => {
    expect(result.radii).toContain(9999);
  });
});

describe("extractDesignTokens — font variety", () => {
  const screens = [
    makeScreen("s1", "Code Editor", FONT_VARIETY_HTML),
    makeScreen("s2", "Code Editor 2", FONT_VARIETY_HTML),
  ];

  const result = extractDesignTokens(screens);

  it("extracts multiple font families", () => {
    expect(result.typography.fontFamilies).toContain("Roboto Mono");
    expect(result.typography.fontFamilies).toContain("Poppins");
    expect(result.typography.fontFamilies).toContain("Inter");
  });

  it("extracts multiple font sizes", () => {
    expect(result.typography.sizes).toContain(12);
    expect(result.typography.sizes).toContain(14);
    expect(result.typography.sizes).toContain(24);
  });
});

describe("extractDesignTokens — mixed radii", () => {
  const screens = [
    makeScreen("s1", "Components", MIXED_RADII_HTML),
  ];

  const result = extractDesignTokens(screens);

  it("extracts varied radii values", () => {
    expect(result.radii).toContain(4);
    expect(result.radii).toContain(8);
    expect(result.radii).toContain(16);
    expect(result.radii).toContain(9999);
  });

  it("extracts border accent color #ff5722", () => {
    expect(result.colors.accent).toContain("#ff5722");
  });
});

describe("extractDesignTokens — empty / no HTML", () => {
  it("returns empty tokens for no screens", () => {
    const result = extractDesignTokens([]);
    expect(result.colors.background).toEqual([]);
    expect(result.typography.fontFamilies).toEqual([]);
    expect(result.radii).toEqual([]);
    expect(result.spacing).toEqual([]);
  });

  it("returns empty tokens when screens have no sourceHtml", () => {
    const screens = [
      { id: "s1", name: "Blank", sourceHtml: null },
    ];
    const result = extractDesignTokens(screens);
    expect(result.colors.background).toEqual([]);
  });
});

// ── Tool handler tests ───────────────────────────────────────────────────────

describe("handleDesignTokenTool — get_design_tokens", () => {
  it("returns full tokens for all screens", () => {
    const state = makeState([
      makeScreen("s1", "Login", MONO_HTML),
      makeScreen("s2", "Dashboard", MONO_HTML_2),
    ]);

    const result = handleDesignTokenTool("get_design_tokens", {}, state);
    expect(result.colors).toBeDefined();
    expect(result.typography).toBeDefined();
    expect(result.radii).toBeDefined();
    expect(result.spacing).toBeDefined();
    expect(result._meta.screensAnalyzed).toBe(2);
    expect(result._meta.screensTotal).toBe(2);
  });

  it("filters by screenIds", () => {
    const state = makeState([
      makeScreen("s1", "Login", MONO_HTML),
      makeScreen("s2", "Dashboard", MONO_HTML_2),
      makeScreen("s3", "Settings", BICHROMATIC_HTML),
    ]);

    const result = handleDesignTokenTool(
      "get_design_tokens",
      { screenIds: ["s1", "s2"] },
      state
    );
    expect(result._meta.screensAnalyzed).toBe(2);
    // The bichromatic screen's colors should not appear
    expect(result.colors.text).not.toContain("#1a1a1a");
  });

  it("filters by scopeRoot (screen group)", () => {
    const state = makeState(
      [
        makeScreen("s1", "Login", MONO_HTML),
        makeScreen("s2", "Dashboard", MONO_HTML_2),
        makeScreen("s3", "Settings", BICHROMATIC_HTML),
      ],
      [{ id: "g1", name: "Auth Screens", screenIds: ["s1", "s2"] }]
    );

    const result = handleDesignTokenTool(
      "get_design_tokens",
      { scopeRoot: "g1" },
      state
    );
    expect(result._meta.screensAnalyzed).toBe(2);
  });

  it("screenIds takes precedence over scopeRoot", () => {
    const state = makeState(
      [
        makeScreen("s1", "Login", MONO_HTML),
        makeScreen("s2", "Dashboard", MONO_HTML_2),
        makeScreen("s3", "Settings", BICHROMATIC_HTML),
      ],
      [{ id: "g1", name: "Auth Screens", screenIds: ["s1", "s2"] }]
    );

    const result = handleDesignTokenTool(
      "get_design_tokens",
      { screenIds: ["s3"], scopeRoot: "g1" },
      state
    );
    expect(result._meta.screensAnalyzed).toBe(1);
    // Should have bichromatic colors, not monochromatic
    expect(result.colors.text).toContain("#1a1a1a");
  });

  it("throws on invalid screenIds", () => {
    const state = makeState([makeScreen("s1", "Login", MONO_HTML)]);
    expect(() =>
      handleDesignTokenTool(
        "get_design_tokens",
        { screenIds: ["nonexistent"] },
        state
      )
    ).toThrow("No screens matched");
  });

  it("throws on invalid scopeRoot", () => {
    const state = makeState([makeScreen("s1", "Login", MONO_HTML)]);
    expect(() =>
      handleDesignTokenTool(
        "get_design_tokens",
        { scopeRoot: "nonexistent" },
        state
      )
    ).toThrow("Screen group not found");
  });

  it("reports skipped screens (no HTML) in _meta", () => {
    const state = makeState([
      makeScreen("s1", "Login", MONO_HTML),
      { id: "s2", name: "Blank", sourceHtml: null, hotspots: [] },
    ]);

    const result = handleDesignTokenTool("get_design_tokens", {}, state);
    expect(result._meta.screensAnalyzed).toBe(1);
    expect(result._meta.screensTotal).toBe(2);
    expect(result._meta.screensSkipped).toBe(1);
  });

  it("throws on unknown tool name", () => {
    const state = makeState([]);
    expect(() =>
      handleDesignTokenTool("unknown_tool", {}, state)
    ).toThrow("Unknown design-token tool");
  });
});

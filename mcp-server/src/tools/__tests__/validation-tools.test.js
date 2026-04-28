// @vitest-environment node

import { describe, it, expect } from "vitest";
import {
  validationTools,
  handleValidationTool,
  _internal,
} from "../validation-tools.js";

const { validateHtml, SATORI_ALLOWED_PROPERTIES } = _internal;

describe("validationTools tool definitions", () => {
  it("declares 1 tool (validate_html)", () => {
    const names = validationTools.map((t) => t.name);
    expect(names).toEqual(["validate_html"]);
  });

  it("tool has description and input schema", () => {
    const tool = validationTools[0];
    expect(tool.description.length).toBeGreaterThan(20);
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.inputSchema.properties.html).toBeDefined();
    expect(tool.inputSchema.required).toContain("html");
  });
});

describe("handleValidationTool", () => {
  it("throws on missing html parameter", () => {
    expect(() => handleValidationTool("validate_html", {})).toThrow(
      "html parameter is required",
    );
  });

  it("throws on unknown tool name", () => {
    expect(() => handleValidationTool("unknown_tool", { html: "<div/>" })).toThrow(
      "Unknown validation tool",
    );
  });

  it("returns { warnings } structure", () => {
    const result = handleValidationTool("validate_html", {
      html: '<div style="display:flex;"><span style="white-space:nowrap;">Hi</span></div>',
    });
    expect(result).toHaveProperty("warnings");
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

describe("rule: unsupported-position", () => {
  it("flags position: absolute", () => {
    const warnings = validateHtml(
      '<div style="position:absolute;top:0;left:0;">content</div>',
    );
    const match = warnings.find((w) => w.rule === "unsupported-position");
    expect(match).toBeDefined();
    expect(match.message).toContain("absolute");
  });

  it("flags position: fixed", () => {
    const warnings = validateHtml(
      '<div style="position:fixed;bottom:0;">content</div>',
    );
    const match = warnings.find((w) => w.rule === "unsupported-position");
    expect(match).toBeDefined();
    expect(match.message).toContain("fixed");
  });

  it("does not flag position: relative", () => {
    const warnings = validateHtml(
      '<div style="position:relative;display:flex;"><span style="white-space:nowrap;">Hi</span></div>',
    );
    const posWarnings = warnings.filter((w) => w.rule === "unsupported-position");
    expect(posWarnings).toHaveLength(0);
  });
});

describe("rule: no-style-block", () => {
  it("flags <style> blocks", () => {
    const warnings = validateHtml(
      '<style>.foo { color: red; }</style><div style="display:flex;"><span style="white-space:nowrap;">Hi</span></div>',
    );
    const match = warnings.find((w) => w.rule === "no-style-block");
    expect(match).toBeDefined();
    expect(match.message).toContain("<style>");
    expect(match.path).toBe("(document)");
  });

  it("does not flag HTML without style blocks", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span style="white-space:nowrap;">Hi</span></div>',
    );
    const match = warnings.find((w) => w.rule === "no-style-block");
    expect(match).toBeUndefined();
  });
});

describe("rule: multi-child-needs-flex", () => {
  it("flags parent with multiple children but no display:flex", () => {
    const warnings = validateHtml(
      '<div><span style="white-space:nowrap;">A</span><span style="white-space:nowrap;">B</span><span style="white-space:nowrap;">C</span></div>',
    );
    const match = warnings.find((w) => w.rule === "multi-child-needs-flex");
    expect(match).toBeDefined();
    expect(match.message).toContain("3 children");
  });

  it("passes when parent has display:flex", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span style="white-space:nowrap;">A</span><span style="white-space:nowrap;">B</span></div>',
    );
    const flexWarnings = warnings.filter((w) => w.rule === "multi-child-needs-flex");
    expect(flexWarnings).toHaveLength(0);
  });

  it("passes when parent has display:none", () => {
    const warnings = validateHtml(
      '<div style="display:none;"><span>A</span><span>B</span></div>',
    );
    const flexWarnings = warnings.filter((w) => w.rule === "multi-child-needs-flex");
    expect(flexWarnings).toHaveLength(0);
  });

  it("does not flag single-child containers", () => {
    const warnings = validateHtml(
      '<div><span style="white-space:nowrap;">Only child</span></div>',
    );
    const flexWarnings = warnings.filter((w) => w.rule === "multi-child-needs-flex");
    expect(flexWarnings).toHaveLength(0);
  });
});

describe("rule: no-br-tag", () => {
  it("flags <br/> elements", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span style="white-space:nowrap;">Hello</span><br/><span style="white-space:nowrap;">World</span></div>',
    );
    const match = warnings.find((w) => w.rule === "no-br-tag");
    expect(match).toBeDefined();
    expect(match.message).toContain("<br/>");
  });

  it("flags <br> (no self-close slash)", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span style="white-space:nowrap;">Hello</span><br><span style="white-space:nowrap;">World</span></div>',
    );
    const match = warnings.find((w) => w.rule === "no-br-tag");
    expect(match).toBeDefined();
  });

  it("does not flag HTML without br tags", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span style="white-space:nowrap;">Hello World</span></div>',
    );
    const brWarnings = warnings.filter((w) => w.rule === "no-br-tag");
    expect(brWarnings).toHaveLength(0);
  });
});

describe("rule: text-needs-nowrap", () => {
  it("flags text-containing element without white-space:nowrap", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span>Hello World</span></div>',
    );
    const match = warnings.find((w) => w.rule === "text-needs-nowrap");
    expect(match).toBeDefined();
    expect(match.message).toContain("white-space: nowrap");
  });

  it("passes when white-space:nowrap is set", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span style="white-space:nowrap;">Hello</span></div>',
    );
    const nowrapWarnings = warnings.filter((w) => w.rule === "text-needs-nowrap");
    expect(nowrapWarnings).toHaveLength(0);
  });

  it("passes when white-space:pre is set", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><span style="white-space:pre;">Hello</span></div>',
    );
    const nowrapWarnings = warnings.filter((w) => w.rule === "text-needs-nowrap");
    expect(nowrapWarnings).toHaveLength(0);
  });

  it("flags p tags with text", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><p>Some paragraph text</p></div>',
    );
    const match = warnings.find((w) => w.rule === "text-needs-nowrap");
    expect(match).toBeDefined();
  });
});

describe("rule: unsupported-css-property", () => {
  it("flags animation property", () => {
    const warnings = validateHtml(
      '<div style="animation:spin 1s linear infinite;display:flex;">content</div>',
    );
    const match = warnings.find((w) => w.rule === "unsupported-css-property");
    expect(match).toBeDefined();
    expect(match.message).toContain("animation");
  });

  it("flags transition property", () => {
    const warnings = validateHtml(
      '<div style="transition:all 0.3s ease;display:flex;">content</div>',
    );
    const match = warnings.find((w) => w.rule === "unsupported-css-property");
    expect(match).toBeDefined();
    expect(match.message).toContain("transition");
  });

  it("flags grid-template-columns", () => {
    const warnings = validateHtml(
      '<div style="display:grid;grid-template-columns:1fr 1fr;">content</div>',
    );
    const match = warnings.find((w) => w.rule === "unsupported-css-property");
    expect(match).toBeDefined();
    expect(match.message).toContain("grid-template-columns");
  });

  it("does not flag supported properties", () => {
    const warnings = validateHtml(
      '<div style="display:flex;padding:10px;margin:5px;border-radius:4px;"><span style="white-space:nowrap;color:red;font-size:14px;">Hi</span></div>',
    );
    const cssWarnings = warnings.filter((w) => w.rule === "unsupported-css-property");
    expect(cssWarnings).toHaveLength(0);
  });
});

describe("validate_html: clean HTML returns empty warnings", () => {
  it("fully valid HTML returns no warnings", () => {
    const html = `
      <div style="display:flex;flex-direction:column;width:390px;height:844px;">
        <div style="display:flex;padding:16px;">
          <span style="white-space:nowrap;font-size:24px;font-weight:bold;">Title</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:16px;">
          <span style="white-space:nowrap;color:#666;">Subtitle</span>
        </div>
      </div>
    `;
    const result = handleValidationTool("validate_html", { html });
    expect(result.warnings).toHaveLength(0);
  });
});

describe("validate_html: path generation", () => {
  it("generates meaningful element paths", () => {
    const warnings = validateHtml(
      '<div style="display:flex;"><div style="display:flex;"><span>text</span></div></div>',
    );
    const match = warnings.find((w) => w.rule === "text-needs-nowrap");
    expect(match).toBeDefined();
    expect(match.path).toContain("div[0]");
    expect(match.path).toContain("span[0]");
  });
});

describe("CSS allowlist completeness", () => {
  it("contains core layout properties", () => {
    const core = ["display", "width", "height", "margin", "padding", "flex"];
    for (const p of core) {
      expect(SATORI_ALLOWED_PROPERTIES.has(p)).toBe(true);
    }
  });

  it("does not contain animation/transition/grid", () => {
    const disallowed = ["animation", "transition", "grid-template-columns", "grid-area"];
    for (const p of disallowed) {
      expect(SATORI_ALLOWED_PROPERTIES.has(p)).toBe(false);
    }
  });
});

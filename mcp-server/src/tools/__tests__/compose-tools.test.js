// @vitest-environment node
//
// Tests for the compose MCP tool definitions and handler.

import { describe, it, expect, beforeEach } from "vitest";
import { composeTools, handleComposeTool } from "../compose-tools.js";
import { clearFragments, expandFragments } from "../../compose/store.js";

beforeEach(() => {
  clearFragments();
});

describe("compose tool registration", () => {
  const names = composeTools.map((t) => t.name);

  it("registers all 5 compose tools", () => {
    expect(names).toContain("compose_page");
    expect(names).toContain("compose_button");
    expect(names).toContain("compose_list_row");
    expect(names).toContain("compose_section_header");
    expect(names).toContain("compose_card");
    expect(names).toHaveLength(5);
  });

  it("every tool has an inputSchema with type:object", () => {
    for (const tool of composeTools) {
      expect(tool.inputSchema.type).toBe("object");
    }
  });

  it("every tool exposes the inline parameter", () => {
    for (const tool of composeTools) {
      expect(tool.inputSchema.properties.inline).toBeDefined();
      expect(tool.inputSchema.properties.inline.type).toBe("boolean");
    }
  });

  it("every tool exposes the tokens parameter", () => {
    for (const tool of composeTools) {
      expect(tool.inputSchema.properties.tokens).toBeDefined();
    }
  });
});

describe("handleComposeTool", () => {
  it("returns { html } for each tool", () => {
    const cases = [
      ["compose_page", { children: "<div style=\"display:flex;\">hi</div>" }],
      ["compose_button", { label: "OK" }],
      ["compose_list_row", { title: "Row" }],
      ["compose_section_header", { title: "Header" }],
      ["compose_card", { title: "Card" }],
    ];
    for (const [name, args] of cases) {
      const result = handleComposeTool(name, args);
      expect(result).toHaveProperty("html");
      expect(typeof result.html).toBe("string");
      expect(result.html.length).toBeGreaterThan(0);
    }
  });

  it("throws for unknown tool", () => {
    expect(() => handleComposeTool("compose_unknown", {})).toThrow("Unknown compose tool");
  });

  it("inline:false returns reference in html field", () => {
    const result = handleComposeTool("compose_button", { label: "X", inline: false });
    expect(result.html).toMatch(/<x-button id="ref_[^"]+"\/>$/);
  });
});

describe("end-to-end composability via handler", () => {
  it("nests button in card in page and expands", () => {
    const btn = handleComposeTool("compose_button", { label: "Submit", inline: false });
    const card = handleComposeTool("compose_card", {
      title: "Register",
      footer: btn.html,
      inline: false,
    });
    const page = handleComposeTool("compose_page", {
      safeArea: { top: 59, bottom: 34 },
      children: card.html,
    });

    // Page is inline by default so it has real HTML with nested references
    expect(page.html).toContain("<x-card");

    // Expand all references
    const expanded = expandFragments(page.html);
    expect(expanded).toContain("Submit");
    expect(expanded).toContain("Register");
    expect(expanded).toContain("height:59px");
    expect(expanded).not.toContain("<x-");
  });
});

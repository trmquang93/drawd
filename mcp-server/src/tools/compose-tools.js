// MCP tool definitions for compose_* HTML building blocks.
//
// These tools return Satori-compatible HTML fragments that agents can nest
// inside each other and pass directly to create_screen's `html` parameter.
// Stateless — no flow file required.

import {
  composePage,
  composeButton,
  composeListRow,
  composeSectionHeader,
  composeCard,
  DEFAULT_TOKENS,
} from "../compose/index.js";

const INLINE_DESC =
  "When true (default), returns the full HTML fragment inline. When false, stores the fragment server-side and returns a lightweight reference tag (e.g. `<x-button id=\"ref_...\"/>`) that the renderer expands at draw time. Use inline:false to dramatically reduce per-screen token cost when reusing the same block across many screens.";

const TOKENS_DESC =
  "Optional design-token overrides. Any subset of: primary, primaryText, secondary, secondaryText, secondaryBorder, destructive, destructiveText, text, textSecondary, background, cardBackground, separator, sectionHeader, radius, fontFamily. Unspecified keys use iOS defaults.";

const CHILDREN_DESC =
  "Inner HTML content. Can be raw HTML or the output of other compose_* tools. Fragments are concatenated in source order.";

const ICON_DESC = "Inline SVG string for the icon (must be Satori-compatible — no <style> tags, no CSS classes).";

export const composeTools = [
  {
    name: "compose_page",
    description:
      "Build an iOS-safe-area-aware page wrapper. Returns a full-viewport flex column with top/bottom safe-area spacers so your content sits within the chrome-free zone. Use the safeArea values from get_chrome_info. Children are placed in a padded content area between the spacers.",
    inputSchema: {
      type: "object",
      properties: {
        safeArea: {
          type: "object",
          description:
            "Safe area insets (px). Get these from get_chrome_info. Defaults to iPhone auto-chrome values (top:59, bottom:34).",
          properties: {
            top: { type: "number" },
            bottom: { type: "number" },
            left: { type: "number" },
            right: { type: "number" },
          },
        },
        background: {
          type: "string",
          description: "Page background color. Defaults to tokens.background (#FFFFFF).",
        },
        children: { type: "string", description: CHILDREN_DESC },
        tokens: { type: "object", description: TOKENS_DESC },
        inline: { type: "boolean", description: INLINE_DESC },
      },
    },
  },
  {
    name: "compose_button",
    description:
      "Build a tappable button. Three variants: \"primary\" (filled), \"secondary\" (outlined), \"destructive\" (red filled). Supports optional leading/trailing icon SVGs.",
    inputSchema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Button label text." },
        variant: {
          type: "string",
          description: "Visual variant.",
          enum: ["primary", "secondary", "destructive"],
        },
        leadingIcon: { type: "string", description: ICON_DESC },
        trailingIcon: { type: "string", description: ICON_DESC },
        tokens: { type: "object", description: TOKENS_DESC },
        inline: { type: "boolean", description: INLINE_DESC },
      },
      required: ["label"],
    },
  },
  {
    name: "compose_list_row",
    description:
      "Build a standard list row with optional leading icon, title, subtitle, and trailing chevron. Ideal for settings screens, menus, and navigation lists.",
    inputSchema: {
      type: "object",
      properties: {
        leadingIcon: { type: "string", description: ICON_DESC },
        title: { type: "string", description: "Primary text." },
        subtitle: { type: "string", description: "Secondary text below the title." },
        trailingChevron: {
          type: "boolean",
          description: "Show a trailing chevron (›). Defaults to true.",
        },
        tokens: { type: "object", description: TOKENS_DESC },
        inline: { type: "boolean", description: INLINE_DESC },
      },
      required: ["title"],
    },
  },
  {
    name: "compose_section_header",
    description:
      "Build a section header with an uppercase title and optional trailing action link. Use above a group of list rows or cards.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Section title (auto-uppercased)." },
        action: {
          type: "string",
          description: "Optional action text aligned to the right (e.g. \"See All\").",
        },
        tokens: { type: "object", description: TOKENS_DESC },
        inline: { type: "boolean", description: INLINE_DESC },
      },
      required: ["title"],
    },
  },
  {
    name: "compose_card",
    description:
      "Build a rounded card container with optional title, body, and footer sections. Body and footer accept arbitrary HTML — nest compose_button, compose_list_row, or raw HTML inside.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Card header text." },
        body: {
          type: "string",
          description: "Card body HTML. Can be the output of other compose_* tools.",
        },
        footer: {
          type: "string",
          description: "Card footer HTML (rendered below a separator).",
        },
        tokens: { type: "object", description: TOKENS_DESC },
        inline: { type: "boolean", description: INLINE_DESC },
      },
    },
  },
];

export function handleComposeTool(name, args) {
  switch (name) {
    case "compose_page":
      return { html: composePage(args) };
    case "compose_button":
      return { html: composeButton(args) };
    case "compose_list_row":
      return { html: composeListRow(args) };
    case "compose_section_header":
      return { html: composeSectionHeader(args) };
    case "compose_card":
      return { html: composeCard(args) };
    default:
      throw new Error(`Unknown compose tool: ${name}`);
  }
}

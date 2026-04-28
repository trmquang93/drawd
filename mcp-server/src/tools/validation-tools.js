/**
 * Validation tools — dry-run Satori constraint checking for the Drawd MCP.
 *
 * One tool:
 *   - validate_html   Parse HTML/CSS and return Satori rule violations without rendering.
 */

// ── Satori CSS property allowlist ────────────────────────────────────────────
// Derived from Satori's supported CSS properties documentation.
const SATORI_ALLOWED_PROPERTIES = new Set([
  // Layout
  "display", "position", "top", "right", "bottom", "left",
  "width", "height", "min-width", "min-height", "max-width", "max-height",
  "margin", "margin-top", "margin-right", "margin-bottom", "margin-left",
  "padding", "padding-top", "padding-right", "padding-bottom", "padding-left",
  "overflow", "overflow-x", "overflow-y",

  // Flexbox
  "flex", "flex-direction", "flex-wrap", "flex-flow",
  "flex-grow", "flex-shrink", "flex-basis",
  "justify-content", "align-items", "align-self", "align-content",
  "gap", "row-gap", "column-gap",
  "order",

  // Typography
  "font-family", "font-size", "font-weight", "font-style",
  "text-align", "text-transform", "text-decoration", "text-overflow",
  "text-shadow", "line-height", "letter-spacing", "word-spacing",
  "white-space", "word-break", "word-wrap", "overflow-wrap",
  "tab-size",

  // Visual
  "color", "background", "background-color", "background-image",
  "background-size", "background-position", "background-repeat",
  "background-clip",
  "border", "border-top", "border-right", "border-bottom", "border-left",
  "border-width", "border-top-width", "border-right-width",
  "border-bottom-width", "border-left-width",
  "border-style", "border-top-style", "border-right-style",
  "border-bottom-style", "border-left-style",
  "border-color", "border-top-color", "border-right-color",
  "border-bottom-color", "border-left-color",
  "border-radius", "border-top-left-radius", "border-top-right-radius",
  "border-bottom-left-radius", "border-bottom-right-radius",
  "box-shadow", "opacity",
  "outline", "outline-color", "outline-style", "outline-width",
  "box-sizing",

  // Transform
  "transform", "transform-origin",

  // Misc
  "object-fit", "object-position",
  "filter",
  "mask-image",
  "clip-path",
]);

// ── HTML parser (minimal, tag-aware) ─────────────────────────────────────────

/**
 * A minimal HTML parser that builds a tree structure sufficient for
 * Satori constraint validation. Not a full HTML parser — handles the
 * subset of HTML that agents produce for screen rendering.
 */
function parseHtmlToTree(html) {
  const nodes = [];
  const stack = [];
  // Track index among siblings for path generation
  const childCounters = [{}]; // counters per level

  const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)\s*>/g;
  let match;

  while ((match = TAG_RE.exec(html)) !== null) {
    const [fullMatch, tagName, attrs, selfClose] = match;
    const isClose = fullMatch.startsWith("</");
    const tag = tagName.toLowerCase();

    if (isClose) {
      stack.pop();
      childCounters.pop();
    } else {
      const node = {
        tag,
        attrs: parseAttrs(attrs),
        children: [],
        textContent: "",
        selfClosing: selfClose === "/" || isSelfClosingTag(tag),
      };

      // Extract style
      node.style = parseInlineStyle(node.attrs.style || "");

      // Get text content between this tag and the next tag
      const afterTag = match.index + fullMatch.length;
      const nextTagIdx = html.indexOf("<", afterTag);
      if (nextTagIdx > afterTag) {
        node.textContent = html.slice(afterTag, nextTagIdx).trim();
      }

      // Assign to parent or root
      if (stack.length > 0) {
        const parent = stack[stack.length - 1];
        parent.children.push(node);
      } else {
        nodes.push(node);
      }

      // Push onto stack if not self-closing
      if (!node.selfClosing) {
        stack.push(node);
        childCounters.push({});
      }
    }
  }

  return nodes;
}

function isSelfClosingTag(tag) {
  return [
    "img", "br", "hr", "input", "meta", "link", "area",
    "base", "col", "embed", "source", "track", "wbr",
  ].includes(tag);
}

function parseAttrs(attrString) {
  const attrs = {};
  const ATTR_RE = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m;
  while ((m = ATTR_RE.exec(attrString)) !== null) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

function parseInlineStyle(styleStr) {
  const style = {};
  if (!styleStr) return style;
  const declarations = styleStr.split(";");
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim().toLowerCase();
    const value = decl.slice(colonIdx + 1).trim();
    if (prop) style[prop] = value;
  }
  return style;
}

// ── Validation rules ─────────────────────────────────────────────────────────

/**
 * Walk the tree and collect warnings.
 */
function validateTree(nodes) {
  const warnings = [];

  function walk(node, pathParts) {
    const path = pathParts.join(" > ");

    // Rule: unsupported-position
    if (node.style.position === "absolute" || node.style.position === "fixed") {
      warnings.push({
        path,
        rule: "unsupported-position",
        message: `position: ${node.style.position} is not supported`,
      });
    }

    // Rule: no-br-tag
    if (node.tag === "br") {
      warnings.push({
        path,
        rule: "no-br-tag",
        message: "<br/> is not supported in Satori; use margin/padding for spacing",
      });
    }

    // Rule: multi-child-needs-flex
    if (node.children.length > 1) {
      const display = node.style.display;
      if (!display || (display !== "flex" && display !== "none" && display !== "contents")) {
        warnings.push({
          path,
          rule: "multi-child-needs-flex",
          message: `${node.children.length} children but no display: flex`,
        });
      }
    }

    // Rule: text-needs-nowrap
    // If the node has direct text content and no white-space: nowrap
    if (node.textContent && isTextContainer(node)) {
      const ws = node.style["white-space"];
      if (!ws || (ws !== "nowrap" && ws !== "pre")) {
        warnings.push({
          path,
          rule: "text-needs-nowrap",
          message: "Text leaf missing white-space: nowrap",
        });
      }
    }

    // Rule: unsupported-css-property
    for (const prop of Object.keys(node.style)) {
      if (!SATORI_ALLOWED_PROPERTIES.has(prop)) {
        warnings.push({
          path,
          rule: "unsupported-css-property",
          message: `CSS property "${prop}" is not supported by Satori`,
        });
      }
    }

    // Recurse into children
    const tagCounts = {};
    for (const child of node.children) {
      const count = tagCounts[child.tag] || 0;
      tagCounts[child.tag] = count + 1;
      const childPath = `${child.tag}[${count}]`;
      walk(child, [...pathParts, childPath]);
    }
  }

  // Walk root nodes
  const tagCounts = {};
  for (const node of nodes) {
    const count = tagCounts[node.tag] || 0;
    tagCounts[node.tag] = count + 1;
    walk(node, [`${node.tag}[${count}]`]);
  }

  return warnings;
}

function isTextContainer(node) {
  // A node is a text container if it has text content and is an inline
  // or block element that contains text (span, p, h1-h6, a, label, etc.)
  const textTags = [
    "span", "p", "a", "label", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "em", "b", "i", "u", "small", "mark", "sub", "sup",
    "div", "li", "td", "th", "dt", "dd", "figcaption", "button",
  ];
  return textTags.includes(node.tag);
}

/**
 * Top-level validation: checks for <style> blocks and then validates the tree.
 */
function validateHtml(html) {
  const warnings = [];

  // Rule: no-style-block
  const styleBlockRe = /<style\b[^>]*>[\s\S]*?<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleBlockRe.exec(html)) !== null) {
    warnings.push({
      path: "(document)",
      rule: "no-style-block",
      message: "<style> blocks are not supported; use inline styles only",
    });
  }

  // Parse and validate the tree
  const tree = parseHtmlToTree(html);
  const treeWarnings = validateTree(tree);
  warnings.push(...treeWarnings);

  return warnings;
}

// ── Tool definition ──────────────────────────────────────────────────────────

export const validationTools = [
  {
    name: "validate_html",
    description:
      "Validate HTML/CSS against Satori rendering constraints WITHOUT rasterizing. " +
      "Returns a structured list of warnings (unsupported CSS, missing flex, position issues, etc.). " +
      "Use this before create_screen/update_screen_image to catch layout bugs in milliseconds " +
      "instead of waiting for a full render. Empty warnings[] means HTML passes validation.",
    inputSchema: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "The HTML string to validate against Satori constraints.",
        },
      },
      required: ["html"],
    },
  },
];

export function handleValidationTool(name, args) {
  if (name === "validate_html") {
    const { html } = args;
    if (!html || typeof html !== "string") {
      throw new Error("html parameter is required and must be a string");
    }
    const warnings = validateHtml(html);
    return { warnings };
  }
  throw new Error(`Unknown validation tool: ${name}`);
}

// Export internals for testing
export const _internal = {
  parseHtmlToTree,
  validateTree,
  validateHtml,
  SATORI_ALLOWED_PROPERTIES,
};

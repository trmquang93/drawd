import { writeHTMLMessage } from "./figKiwiWriter.js";
import figmaSchema from "./figmaSchema.json";

// ─── GUID allocation ─────────────────────────────────────────────────────────

let nextLocalID = 1;

function resetIDs() {
  nextLocalID = 1;
}

function newGUID() {
  return { sessionID: 100, localID: nextLocalID++ };
}

// ─── Position keys ───────────────────────────────────────────────────────────

// Figma uses single-character ASCII sort keys for sibling ordering.
// "!" is the first printable after space, then '"', '#', '$', etc.
function positionKey(index) {
  return String.fromCharCode(33 + index); // '!' = 33
}

// ─── Paint conversion ────────────────────────────────────────────────────────

// Parses a single CSS color token (hex or rgb/rgba) into {r,g,b,a} (0–1 each).
function parseCssColor(token) {
  if (!token) return null;
  token = token.trim();
  const rgba = token.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgba) {
    return {
      r: parseFloat(rgba[1]) / 255,
      g: parseFloat(rgba[2]) / 255,
      b: parseFloat(rgba[3]) / 255,
      a: rgba[4] !== undefined ? parseFloat(rgba[4]) : 1,
    };
  }
  const hex = token.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3)
      return { r: parseInt(h[0]+h[0],16)/255, g: parseInt(h[1]+h[1],16)/255, b: parseInt(h[2]+h[2],16)/255, a: 1 };
    if (h.length === 6)
      return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255, a: 1 };
    if (h.length === 8)
      return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255, a: parseInt(h.slice(6,8),16)/255 };
  }
  return null;
}

// Splits a CSS gradient argument string on top-level commas
// (i.e. ignoring commas inside rgba() calls).
function splitGradientArgs(str) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "(") depth++;
    else if (str[i] === ")") depth--;
    else if (str[i] === "," && depth === 0) {
      parts.push(str.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(str.slice(start).trim());
  return parts;
}

// Converts a CSS linear-gradient(…) string to a Figma GRADIENT_LINEAR Paint.
// Returns null if the string cannot be parsed.
function parseCssLinearGradient(raw) {
  const inner = raw.match(/linear-gradient\((.+)\)/s);
  if (!inner) return null;

  const args = splitGradientArgs(inner[1]);
  let angleDeg = 180; // default: to bottom
  let stopArgs = args;

  const first = args[0].trim().toLowerCase();
  const angleMatch = first.match(/^(-?[\d.]+)deg$/);
  if (angleMatch) {
    angleDeg = parseFloat(angleMatch[1]);
    stopArgs = args.slice(1);
  } else if (first.startsWith("to ")) {
    const dirs = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270,
                   "to top right": 45, "to top left": 315,
                   "to bottom right": 135, "to bottom left": 225 };
    angleDeg = dirs[first] ?? 180;
    stopArgs = args.slice(1);
  }

  // Parse color stops — each arg is "color [position%]"
  const stops = [];
  for (let i = 0; i < stopArgs.length; i++) {
    const s = stopArgs[i].trim();
    // Match optional position percentage at the end
    const posMatch = s.match(/^(.*?)\s+([\d.]+)%\s*$/);
    const colorToken = posMatch ? posMatch[1].trim() : s;
    const position = posMatch
      ? parseFloat(posMatch[2]) / 100
      : stopArgs.length === 1 ? 0 : i / (stopArgs.length - 1);
    const color = parseCssColor(colorToken);
    if (color) stops.push({ color: { r: color.r, g: color.g, b: color.b, a: color.a }, position });
  }
  if (stops.length < 2) return null;

  // Compute Figma gradient transform for the given CSS angle.
  // The transform maps gradient space (x: 0=start, 1=end) to object normalized space (0–1).
  // Direction vector in object space: (sin θ, −cos θ) for CSS angle θ.
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const transform = {
    m00: dx,  m01: 0, m02: 0.5 - dx / 2,
    m10: dy,  m11: 0, m12: 0.5 - dy / 2,
  };

  return { type: "GRADIENT_LINEAR", stops, transform, opacity: 1, visible: true, blendMode: "NORMAL" };
}

function convertFills(fills) {
  if (!fills || fills.length === 0) return [];
  const result = [];
  for (const f of fills) {
    if (f.type === "SOLID") {
      result.push({
        type: "SOLID",
        color: { r: f.color.r, g: f.color.g, b: f.color.b, a: f.opacity ?? 1 },
        opacity: f.opacity ?? 1,
        visible: true,
        blendMode: "NORMAL",
      });
    } else if (f.type === "GRADIENT_LINEAR" && f._raw) {
      const gradient = parseCssLinearGradient(f._raw);
      if (gradient) result.push(gradient);
    }
  }
  return result;
}

function convertStrokes(strokes) {
  if (!strokes || strokes.length === 0) return [];
  return strokes
    .filter((s) => s.type === "SOLID")
    .map((s) => ({
      type: "SOLID",
      color: {
        r: s.color.r,
        g: s.color.g,
        b: s.color.b,
        a: s.opacity ?? 1,
      },
      opacity: s.opacity ?? 1,
      visible: true,
      blendMode: "NORMAL",
    }));
}

// ─── Effect conversion ───────────────────────────────────────────────────────

function convertEffects(effects) {
  if (!effects || effects.length === 0) return [];
  return effects.map((e) => ({
    type: e.type,
    color: e.color,
    offset: e.offset || { x: 0, y: 0 },
    radius: e.radius || 0,
    spread: e.spread || 0,
    visible: e.visible !== false,
    blendMode: e.blendMode || "NORMAL",
  }));
}

// ─── Corner radius ───────────────────────────────────────────────────────────

function applyCornerRadius(target, node) {
  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    target.cornerRadius = 0;
    target.rectangleTopLeftCornerRadius = tl;
    target.rectangleTopRightCornerRadius = tr;
    target.rectangleBottomRightCornerRadius = br;
    target.rectangleBottomLeftCornerRadius = bl;
    target.rectangleCornerRadiiIndependent = true;
  } else if (node.cornerRadius) {
    target.cornerRadius = node.cornerRadius;
  }
}

// ─── Font style derivation ───────────────────────────────────────────────────

function deriveFontStyle(fontWeight, italic) {
  const bold = fontWeight >= 700;
  if (bold && italic) return "Bold Italic";
  if (bold) return "Bold";
  if (italic) return "Italic";
  return "Regular";
}

// ─── Node mapping ────────────────────────────────────────────────────────────

function mapNode(node, parentGUID, siblingIndex, result) {
  const guid = newGUID();

  const base = {
    guid,
    phase: "CREATED",
    parentIndex: { guid: parentGUID, position: positionKey(siblingIndex) },
    type: node.type === "RECTANGLE" ? "ROUNDED_RECTANGLE" : node.type,
    name: node.name || "Layer",
    visible: true,
    opacity: node.opacity ?? 1,
    size: { x: Math.max(node.width || 1, 1), y: Math.max(node.height || 1, 1) },
    transform: {
      m00: 1,
      m01: 0,
      m02: node.x || 0,
      m10: 0,
      m11: 1,
      m12: node.y || 0,
    },
    dashPattern: [],
    strokeWeight: node.strokeWeight || 0,
    strokeAlign: node.strokeAlign === "OUTSIDE" ? "OUTSIDE" : node.strokeAlign === "CENTER" ? "CENTER" : "INSIDE",
    strokeJoin: "MITER",
    fillPaints: [],
    effects: convertEffects(node.effects),
    horizontalConstraint: "MIN",
    verticalConstraint: "MIN",
  };

  // Fill paints
  if (node.type === "TEXT" && node.style?.fills) {
    base.fillPaints = convertFills(node.style.fills);
  } else if (node.fills) {
    base.fillPaints = convertFills(node.fills);
  }

  // Stroke paints
  if (node.strokes?.length) {
    base.strokePaints = convertStrokes(node.strokes);
  }

  // Corner radius
  applyCornerRadius(base, node);

  // Clip content (FRAME only)
  if (node.type === "FRAME" || node.type === "RECTANGLE") {
    base.frameMaskDisabled = node.clipsContent === false;
  }

  // Auto-layout
  if (node.layoutMode && node.layoutMode !== "NONE") {
    base.stackMode = node.layoutMode;
    base.stackSpacing = node.itemSpacing || 0;
    base.stackHorizontalPadding = node.paddingLeft || 0;
    base.stackVerticalPadding = node.paddingTop || 0;
    base.stackPaddingRight = node.paddingRight || 0;
    base.stackPaddingBottom = node.paddingBottom || 0;
    base.stackPrimaryAlignItems = node.primaryAxisAlignItems || "MIN";
    base.stackCounterAlignItems = node.counterAxisAlignItems || "MIN";
    base.stackPrimarySizing = "FIXED";
    base.stackCounterSizing = "FIXED";
  } else {
    base.stackMode = "NONE";
  }

  // TEXT node specific
  if (node.type === "TEXT") {
    const s = node.style || {};
    base.fontSize = s.fontSize || 16;
    base.textAlignHorizontal = s.textAlignHorizontal || "LEFT";
    base.textAlignVertical = s.textAlignVertical || "TOP";
    base.textAutoResize = node.singleLine ? "WIDTH_AND_HEIGHT" : "HEIGHT";
    base.fontName = {
      family: s.fontFamily || "Inter",
      style: deriveFontStyle(s.fontWeight || 400, s.italic || false),
      postscript: "",
    };
    base.textData = {
      characters: node.characters || "",
      layoutVersion: 9,
      layoutSize: {
        x: node.singleLine ? (node.width || 1) : Math.ceil(node.width || 1) + 1,
        y: node.height || 1,
      },
    };
    if (s.lineHeightPx) {
      base.lineHeight = { value: s.lineHeightPx, units: "PIXELS" };
    }
    if (s.letterSpacing) {
      base.letterSpacing = { value: s.letterSpacing, units: "PIXELS" };
    }
    // textTracking is in thousandths of an em (CSS letterSpacing px / fontSize px * 1000)
    base.textTracking = s.letterSpacing
      ? (s.letterSpacing / (s.fontSize || 16)) * 1000
      : 0;
    if (s.textDecoration && s.textDecoration !== "NONE") {
      base.textDecoration = s.textDecoration;
    }
    base.textBidiVersion = 1;
    base.autoRename = true;
  }

  // Auto-layout child properties — use STRETCH when DOM traversal detected it,
  // falling back to AUTO (keep intrinsic size). STRETCH fills the parent's cross-axis,
  // matching CSS flexbox's default align-items: stretch behavior.
  base.stackChildAlignSelf = node.stackChildAlignSelf || "AUTO";
  base.stackPositioning = "AUTO";
  if (node.primaryGrow > 0) {
    base.stackChildPrimaryGrow = node.primaryGrow;
  }

  result.push(base);

  // Recurse into children
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      mapNode(node.children[i], guid, i, result);
    }
  }

  return guid;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Converts a DOM traversal node tree into fig-kiwi NodeChange[] format
 * and returns the complete clipboard HTML string.
 *
 * @param {Object} rootNode - Root node from domTraversalFn / htmlToFigmaNodes
 * @returns {string} HTML string for clipboard (text/html MIME type)
 */
export function buildFigmaClipboardHtml(rootNode) {
  resetIDs();

  const documentGUID = { sessionID: 0, localID: 0 };
  const pageGUID = newGUID();

  const nodeChanges = [
    {
      guid: documentGUID,
      phase: "CREATED",
      type: "DOCUMENT",
      name: "Document",
      visible: true,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    },
    {
      guid: pageGUID,
      parentIndex: { guid: documentGUID, position: "!" },
      phase: "CREATED",
      type: "CANVAS",
      name: "Page 1",
      visible: true,
      opacity: 1,
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    },
  ];

  mapNode(rootNode, pageGUID, 0, nodeChanges);

  const pasteID = Math.floor(Math.random() * 1e9);

  return writeHTMLMessage({
    meta: { fileKey: "drawd", pasteID, dataType: "scene" },
    schema: figmaSchema,
    message: {
      type: "NODE_CHANGES",
      sessionID: 0,
      ackID: 0,
      pasteID,
      pasteFileKey: "drawd",
      pasteIsPartiallyOutsideEnclosingFrame: false,
      pastePageId: pageGUID,
      pasteEditorType: "DESIGN",
      isCut: false,
      publishedAssetGuids: [],
      nodeChanges,
    },
  });
}

/**
 * Copies a DOM traversal node tree to the clipboard as Figma-native
 * editable layers (binary Kiwi format in text/html).
 *
 * @param {Object} rootNode - Root node from domTraversalFn / htmlToFigmaNodes
 * @returns {Promise<void>}
 */
export async function copyAsFigmaClipboard(rootNode) {
  const html = buildFigmaClipboardHtml(rootNode);
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
    }),
  ]);
}

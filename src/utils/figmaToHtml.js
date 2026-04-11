// Figma node tree → HTML/CSS converter.
// Reverse of mcp-server/src/figma-export/dom-traversal.js:
// that file extracts DOM → Figma nodes; this file converts Figma nodes → HTML.
//
// Input: a node from doc._figFile.pages[].rootNodes[] (parsed by @grida/refig)
// Output: a full HTML document string that can be rendered in an iframe

// ─── Font fallback map ──────────────────────────────────────────────────────

const FONT_FALLBACKS = {
  "sf pro": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  "sf pro display": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  "sf pro text": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  "sf pro rounded": "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  "sf mono": "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
  "sf compact": "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  "new york": "'New York', 'Georgia', 'Times New Roman', serif",
  "inter": "'Inter', sans-serif",
  "roboto": "'Roboto', sans-serif",
  "roboto mono": "'Roboto Mono', monospace",
  "open sans": "'Open Sans', sans-serif",
  "lato": "'Lato', sans-serif",
  "montserrat": "'Montserrat', sans-serif",
  "poppins": "'Poppins', sans-serif",
  "nunito": "'Nunito', sans-serif",
  "raleway": "'Raleway', sans-serif",
  "source sans pro": "'Source Sans Pro', sans-serif",
  "source code pro": "'Source Code Pro', monospace",
  "fira code": "'Fira Code', monospace",
  "jetbrains mono": "'JetBrains Mono', monospace",
  "helvetica": "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "helvetica neue": "'Helvetica Neue', Helvetica, Arial, sans-serif",
  "arial": "Arial, Helvetica, sans-serif",
  "georgia": "Georgia, 'Times New Roman', serif",
  "times new roman": "'Times New Roman', Times, serif",
};

function resolveFontFamily(family) {
  if (!family) return "sans-serif";
  const key = family.toLowerCase().trim();
  return FONT_FALLBACKS[key] || `'${family}', sans-serif`;
}

// ─── Color conversion ────────────────────────────────────────────────────────

function figmaColorToCss(color, opacity) {
  if (!color) return null;
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = opacity ?? color.a ?? 1;
  if (a >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

// ─── Fill conversion ─────────────────────────────────────────────────────────

function convertFillsToCss(fills) {
  if (!fills?.length) return {};
  const styles = {};
  let hasImage = false;

  // Process fills in reverse (Figma draws last fill on top)
  for (let i = fills.length - 1; i >= 0; i--) {
    const fill = fills[i];
    if (fill.visible === false) continue;

    if (fill.type === "SOLID") {
      styles.backgroundColor = figmaColorToCss(fill.color, fill.opacity);
    } else if (fill.type === "GRADIENT_LINEAR") {
      // Kiwi format uses `stops` + `transform`; REST API uses `gradientStops` + `gradientHandlePositions`
      const gradStops = fill.stops ?? fill.gradientStops;
      if (gradStops?.length >= 2) {
        styles.background = convertGradientToCss(fill);
      }
    } else if (fill.type === "IMAGE" || fill.type === "image") {
      hasImage = true;
    }
  }

  if (hasImage && !styles.backgroundColor && !styles.background) {
    // Image fill with no pixel data — show a subtle placeholder
    styles.backgroundColor = "#e8e8e8";
    styles.backgroundImage =
      "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.03) 8px, rgba(0,0,0,0.03) 16px)";
  }

  return styles;
}

function convertGradientToCss(fill) {
  // Support both kiwi (`stops`, `transform`) and REST API (`gradientStops`, `gradientHandlePositions`)
  const stops = fill.stops ?? fill.gradientStops;
  if (!stops?.length || stops.length < 2) return "";

  // Reconstruct CSS angle from Figma gradient transform.
  let angleDeg = 180;
  if (fill.transform) {
    // Kiwi format: transform object with m00, m10 — direction vector is (m00, m10).
    // CSS angle θ = atan2(dx, -dy) where dx=m00, dy=m10.
    const dx = fill.transform.m00 ?? 0;
    const dy = fill.transform.m10 ?? 0;
    angleDeg = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
  } else if (fill.gradientHandlePositions?.length >= 2) {
    // REST API format: array of {x, y} handle positions.
    // Handle 0 is the start point, handle 1 is the end point.
    const p0 = fill.gradientHandlePositions[0];
    const p1 = fill.gradientHandlePositions[1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    angleDeg = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
  }

  const colorStops = stops
    .map((s) => {
      const color = figmaColorToCss(s.color, s.color?.a);
      const pos = Math.round(s.position * 100);
      return `${color} ${pos}%`;
    })
    .join(", ");

  return `linear-gradient(${angleDeg}deg, ${colorStops})`;
}

// ─── Stroke conversion ──────────────────────────────────────────────────────

function convertStrokesToCss(strokes, strokeWeight, strokeAlign) {
  if (!strokes?.length || !strokeWeight) return {};
  const firstVisible = strokes.find((s) => s.visible !== false && s.type === "SOLID");
  if (!firstVisible) return {};

  const color = figmaColorToCss(firstVisible.color, firstVisible.opacity);
  const styles = {};

  if (strokeAlign === "INSIDE") {
    // Use outline or box-shadow inset to avoid affecting layout
    styles.boxShadow = `inset 0 0 0 ${strokeWeight}px ${color}`;
  } else {
    styles.border = `${strokeWeight}px solid ${color}`;
  }

  return styles;
}

// ─── Effect conversion (box-shadow) ──────────────────────────────────────────

function convertEffectsToCss(effects) {
  if (!effects?.length) return {};
  const shadows = [];

  for (const e of effects) {
    if (e.visible === false) continue;
    const color = figmaColorToCss(e.color, e.color?.a);
    if (!color) continue;

    const ox = e.offset?.x ?? 0;
    const oy = e.offset?.y ?? 0;
    const radius = e.radius ?? 0;
    const spread = e.spread ?? 0;

    if (e.type === "DROP_SHADOW") {
      shadows.push(`${ox}px ${oy}px ${radius}px ${spread}px ${color}`);
    } else if (e.type === "INNER_SHADOW") {
      shadows.push(`inset ${ox}px ${oy}px ${radius}px ${spread}px ${color}`);
    }
  }

  if (shadows.length === 0) return {};
  return { boxShadow: shadows.join(", ") };
}

// ─── Corner radius ───────────────────────────────────────────────────────────

function convertCornerRadiusToCss(node) {
  // Check for independent corner radii
  const tl = node.rectangleTopLeftCornerRadius;
  const tr = node.rectangleTopRightCornerRadius;
  const br = node.rectangleBottomRightCornerRadius;
  const bl = node.rectangleBottomLeftCornerRadius;

  if (tl != null || tr != null || br != null || bl != null) {
    return { borderRadius: `${tl || 0}px ${tr || 0}px ${br || 0}px ${bl || 0}px` };
  }

  const r = node.cornerRadius;
  if (r && r > 0) return { borderRadius: `${r}px` };

  // Also check rectangleCornerRadii array (intermediate format)
  if (node.rectangleCornerRadii) {
    const [rtl, rtr, rbr, rbl] = node.rectangleCornerRadii;
    return { borderRadius: `${rtl}px ${rtr}px ${rbr}px ${rbl}px` };
  }

  return {};
}

// ─── Font style derivation ───────────────────────────────────────────────────

function deriveFontWeight(styleStr) {
  if (!styleStr) return 400;
  const s = styleStr.toLowerCase();
  if (s.includes("thin") || s.includes("hairline")) return 100;
  if (s.includes("extralight") || s.includes("ultralight")) return 200;
  if (s.includes("light")) return 300;
  if (s.includes("medium")) return 500;
  if (s.includes("semibold") || s.includes("demibold")) return 600;
  if (s.includes("extrabold") || s.includes("ultrabold")) return 800;
  if (s.includes("black") || s.includes("heavy")) return 900;
  if (s.includes("bold")) return 700;
  return 400;
}

function isItalicStyle(styleStr) {
  if (!styleStr) return false;
  return styleStr.toLowerCase().includes("italic");
}

// ─── Layout mapping ─────────────────────────────────────────────────────────

function mapPrimaryAlign(value) {
  switch (value) {
    case "CENTER": return "center";
    case "MAX": return "flex-end";
    case "SPACE_BETWEEN": return "space-between";
    case "SPACE_EVENLY": case "SPACE_AROUND": return "space-evenly";
    default: return "flex-start";
  }
}

function mapCounterAlign(value) {
  switch (value) {
    case "CENTER": return "center";
    case "MAX": return "flex-end";
    case "BASELINE": return "baseline";
    case "STRETCH": return "stretch";
    default: return "flex-start";
  }
}

function mapTextAlign(value) {
  switch (value) {
    case "CENTER": return "center";
    case "RIGHT": return "right";
    case "JUSTIFIED": return "justify";
    default: return "left";
  }
}

// ─── Escape HTML ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Style object to inline CSS string ──────────────────────────────────────

function stylesToString(styles) {
  return Object.entries(styles)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => {
      // Convert camelCase to kebab-case
      const prop = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${prop}: ${v}`;
    })
    .join("; ");
}

// ─── Get node dimensions ────────────────────────────────────────────────────

function getNodeSize(node) {
  const w = node.size?.x ?? node.width ?? 0;
  const h = node.size?.y ?? node.height ?? 0;
  return { width: w, height: h };
}

function getNodePosition(node) {
  // Position from kiwi transform object, or REST relativeTransform 2D array, or direct x/y
  const x = node.transform?.m02 ?? node.relativeTransform?.[0]?.[2] ?? node.x ?? 0;
  const y = node.transform?.m12 ?? node.relativeTransform?.[1]?.[2] ?? node.y ?? 0;
  return { x, y };
}

// ─── Node type detection ────────────────────────────────────────────────────

function isTextNode(node) {
  return node.type === "TEXT";
}

function isContainerNode(node) {
  return ["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"].includes(node.type);
}

function hasAutoLayout(node) {
  const mode = node.stackMode ?? node.layoutMode;
  return mode === "HORIZONTAL" || mode === "VERTICAL";
}

// ─── Vector network → SVG path ──────────────────────────────────────────────

/**
 * Convert a Figma vectorNetwork (vertices + segments) to an SVG path `d` string.
 * Mirrors the logic of @grida/refig's vn.toSVGPathData but without importing
 * the private module-scoped variable.
 */
function vectorNetworkToSvgPath(network) {
  const { vertices, segments } = network;
  if (!segments?.length || !vertices?.length) return "";

  // Detect format: kiwi uses {x, y} objects; REST API uses [x, y] arrays.
  const isKiwi = typeof vertices[0]?.x === "number";

  const vx = (v) => (isKiwi ? v.x : v[0]);
  const vy = (v) => (isKiwi ? v.y : v[1]);

  const parts = [];
  let currentStart = null;
  let previousEnd = null;

  for (const seg of segments) {
    // Kiwi: { start: { vertex, dx, dy }, end: { vertex, dx, dy } }
    // REST: { a, b, ta: [dx, dy], tb: [dx, dy] }
    const a = isKiwi ? seg.start.vertex : seg.a;
    const b = isKiwi ? seg.end.vertex : seg.b;
    const ta0 = isKiwi ? (seg.start.dx ?? 0) : (seg.ta?.[0] ?? 0);
    const ta1 = isKiwi ? (seg.start.dy ?? 0) : (seg.ta?.[1] ?? 0);
    const tb0 = isKiwi ? (seg.end.dx ?? 0) : (seg.tb?.[0] ?? 0);
    const tb1 = isKiwi ? (seg.end.dy ?? 0) : (seg.tb?.[1] ?? 0);

    const start = vertices[a];
    const end = vertices[b];
    if (!start || !end) continue;

    if (previousEnd !== a) {
      parts.push(`M${fmt(vx(start))} ${fmt(vy(start))}`);
      currentStart = a;
    }

    const noTangents = (ta0 === 0 && ta1 === 0 && tb0 === 0 && tb1 === 0);

    if (noTangents) {
      parts.push(`L${fmt(vx(end))} ${fmt(vy(end))}`);
    } else {
      const c1x = vx(start) + ta0;
      const c1y = vy(start) + ta1;
      const c2x = vx(end) + tb0;
      const c2y = vy(end) + tb1;
      parts.push(
        `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(vx(end))} ${fmt(vy(end))}`
      );
    }

    previousEnd = b;
    if (currentStart !== null && b === currentStart) {
      parts.push("Z");
      previousEnd = null;
      currentStart = null;
    }
  }

  return parts.join("");
}

function fmt(n) {
  return Math.round(n * 100) / 100;
}

// ─── Main converter ─────────────────────────────────────────────────────────

function convertNode(node, isRoot) {
  if (!node) return "";
  if (node.visible === false) return "";

  const { width, height } = getNodeSize(node);
  if (width < 1 && height < 1) return "";

  if (isTextNode(node)) {
    return convertTextNode(node, isRoot);
  }

  if (isContainerNode(node) || node.type === "RECTANGLE" || node.type === "ROUNDED_RECTANGLE") {
    return convertFrameNode(node, isRoot);
  }

  // VECTOR, LINE, ELLIPSE, STAR, POLYGON, BOOLEAN_OPERATION
  return convertShapeNode(node, isRoot);
}

function convertTextNode(node, isRoot) {
  const { width, height } = getNodeSize(node);
  const styles = {};

  // textAutoResize controls Figma's text sizing behaviour:
  //   WIDTH_AND_HEIGHT — auto-size both axes (single-line, never wraps)
  //   HEIGHT           — fixed width, auto-height (wraps at width)
  //   NONE / TRUNCATE  — fully fixed size
  const autoResize = node.textAutoResize;

  if (!isRoot) {
    if (autoResize === "WIDTH_AND_HEIGHT") {
      // Auto-width text: don't constrain width, prevent wrapping
      styles.whiteSpace = "nowrap";
      styles.flexShrink = "0";
    } else {
      // Fixed-width text: add 1px buffer for font metric differences
      styles.width = `${Math.ceil(width) + 1}px`;
    }
    styles.minHeight = `${Math.ceil(height)}px`;
  }

  // Font properties — check both kiwi format and intermediate format
  const fontName = node.fontName;
  const styleObj = node.style; // intermediate format (from dom-traversal)

  const fontFamily = fontName?.family ?? styleObj?.fontFamily ?? "Inter";
  const fontStyleStr = fontName?.style ?? "";
  const fontSize = node.fontSize ?? styleObj?.fontSize ?? 16;
  const fontWeight = styleObj?.fontWeight ?? deriveFontWeight(fontStyleStr);
  const italic = styleObj?.italic ?? isItalicStyle(fontStyleStr);

  styles.fontFamily = resolveFontFamily(fontFamily);
  styles.fontSize = `${fontSize}px`;
  styles.fontWeight = fontWeight;
  if (italic) styles.fontStyle = "italic";

  // Line height
  const lineHeight = node.lineHeight ?? styleObj?.lineHeightPx;
  if (lineHeight?.value) {
    styles.lineHeight = `${lineHeight.value}px`;
  } else if (typeof lineHeight === "number" && lineHeight > 0) {
    styles.lineHeight = `${lineHeight}px`;
  }

  // Letter spacing
  const letterSpacing = node.letterSpacing ?? styleObj?.letterSpacing;
  if (letterSpacing?.value && letterSpacing.value !== 0) {
    styles.letterSpacing = `${letterSpacing.value}px`;
  } else if (typeof letterSpacing === "number" && letterSpacing !== 0) {
    styles.letterSpacing = `${letterSpacing}px`;
  }

  // Text align
  const hAlign = node.textAlignHorizontal ?? styleObj?.textAlignHorizontal ?? "LEFT";
  styles.textAlign = mapTextAlign(hAlign);

  // Text decoration
  const decoration = node.textDecoration ?? styleObj?.textDecoration;
  if (decoration === "UNDERLINE") styles.textDecoration = "underline";
  else if (decoration === "STRIKETHROUGH") styles.textDecoration = "line-through";

  // Text color from fills
  const fills = node.fillPaints ?? styleObj?.fills ?? node.fills;
  if (fills?.length) {
    const solidFill = fills.find((f) => f.type === "SOLID" && f.visible !== false);
    if (solidFill) {
      styles.color = figmaColorToCss(solidFill.color, solidFill.opacity);
    }
  }

  // Opacity
  const opacity = node.opacity;
  if (opacity != null && opacity < 1) {
    styles.opacity = opacity.toFixed(3);
  }

  // Auto-layout child sizing
  if (node.stackChildAlignSelf === "STRETCH") {
    styles.alignSelf = "stretch";
    styles.width = "100%";
  }
  if (node.stackChildPrimaryGrow > 0) {
    styles.flexGrow = node.stackChildPrimaryGrow;
  }

  const characters = node.textData?.characters ?? node.characters ?? "";
  const inlineStyle = stylesToString(styles);
  return `<div style="${inlineStyle}">${escapeHtml(characters)}</div>`;
}

function convertFrameNode(node, isRoot) {
  const { width, height } = getNodeSize(node);
  const styles = {};
  const autoLayout = hasAutoLayout(node);

  // Dimensions
  if (isRoot) {
    styles.width = "100%";
    styles.minHeight = "100%";
  } else {
    styles.width = `${Math.ceil(width)}px`;
    styles.minHeight = `${Math.ceil(height)}px`;
  }

  // Box sizing
  styles.boxSizing = "border-box";

  // Background fills
  const fills = node.fillPaints ?? node.fills;
  Object.assign(styles, convertFillsToCss(fills));

  // Strokes
  const strokes = node.strokePaints ?? node.strokes;
  const strokeWeight = node.strokeWeight ?? 0;
  const strokeAlign = node.strokeAlign ?? "INSIDE";
  Object.assign(styles, convertStrokesToCss(strokes, strokeWeight, strokeAlign));

  // Effects
  const effects = node.effects;
  if (effects) {
    const effectCss = convertEffectsToCss(effects);
    // Merge box-shadow from effects with box-shadow from strokes
    if (effectCss.boxShadow && styles.boxShadow) {
      styles.boxShadow = `${styles.boxShadow}, ${effectCss.boxShadow}`;
    } else {
      Object.assign(styles, effectCss);
    }
  }

  // Corner radius
  Object.assign(styles, convertCornerRadiusToCss(node));

  // Opacity
  const opacity = node.opacity;
  if (opacity != null && opacity < 1) {
    styles.opacity = opacity.toFixed(3);
  }

  // Overflow
  const clipsContent = node.clipsContent ?? (node.frameMaskDisabled === false);
  if (clipsContent) {
    styles.overflow = "hidden";
  }

  // Layout
  const stackMode = node.stackMode ?? node.layoutMode;
  if (autoLayout) {
    styles.display = "flex";
    styles.flexDirection = stackMode === "HORIZONTAL" ? "row" : "column";

    // Gap
    const gap = node.stackSpacing ?? node.itemSpacing ?? 0;
    if (gap > 0) styles.gap = `${gap}px`;

    // Padding — kiwi format uses stackHorizontalPadding/stackVerticalPadding, plus
    // stackPaddingRight/stackPaddingBottom for independent padding
    const pl = node.stackHorizontalPadding ?? node.paddingLeft ?? 0;
    const pt = node.stackVerticalPadding ?? node.paddingTop ?? 0;
    const pr = node.stackPaddingRight ?? node.paddingRight ?? pl;
    const pb = node.stackPaddingBottom ?? node.paddingBottom ?? pt;
    if (pl || pt || pr || pb) {
      styles.padding = `${pt}px ${pr}px ${pb}px ${pl}px`;
    }

    // Alignment
    const primaryAlign = node.stackPrimaryAlignItems ?? node.primaryAxisAlignItems;
    const counterAlign = node.stackCounterAlignItems ?? node.counterAxisAlignItems;
    styles.justifyContent = mapPrimaryAlign(primaryAlign);
    styles.alignItems = mapCounterAlign(counterAlign);
  } else if (node.children?.length) {
    // Non-auto-layout: children positioned absolutely
    styles.position = "relative";
  }

  // Auto-layout child sizing
  if (node.stackChildAlignSelf === "STRETCH") {
    styles.alignSelf = "stretch";
    styles.width = "100%";
  }
  if (node.stackChildPrimaryGrow > 0) {
    styles.flexGrow = node.stackChildPrimaryGrow;
  }

  // Library component instances with no resolved children may carry a
  // pre-built SVG from derivedSymbolData rendering hints.
  if (node._derivedSvg && (!node.children || node.children.length === 0)) {
    const inlineStyle = stylesToString(styles);
    return `<div style="${inlineStyle}">\n${node._derivedSvg}\n</div>`;
  }

  // Render children
  const childrenHtml = (node.children || [])
    .map((child, i) => {
      if (!autoLayout) {
        // Absolute positioning for non-auto-layout children
        const childPos = getNodePosition(child);
        const wrapStyle = `position: absolute; left: ${childPos.x}px; top: ${childPos.y}px; z-index: ${i}`;
        const childHtml = convertNode(child, false);
        if (!childHtml) return "";
        return `<div style="${wrapStyle}">${childHtml}</div>`;
      }
      return convertNode(child, false);
    })
    .filter(Boolean)
    .join("\n");

  const inlineStyle = stylesToString(styles);
  return `<div style="${inlineStyle}">\n${childrenHtml}\n</div>`;
}

function convertShapeNode(node) {
  const { width, height } = getNodeSize(node);
  const w = Math.ceil(width);
  const h = Math.ceil(height);

  // Try to render as inline SVG from vectorNetwork path data
  const svgPath = node.vectorNetwork
    ? vectorNetworkToSvgPath(node.vectorNetwork)
    : "";

  if (svgPath) {
    const styles = {};
    styles.width = `${w}px`;
    styles.height = `${h}px`;
    styles.flexShrink = "0";

    // Opacity
    const opacity = node.opacity;
    if (opacity != null && opacity < 1) {
      styles.opacity = opacity.toFixed(3);
    }

    // Fill color
    // Figma explicitly sets fills=[] when a node has no fill (stroke-only icons).
    // Use "none" for empty arrays; only fall back to "currentColor" when fills
    // is undefined (possible inherited fill from boolean operation parent).
    const fills = node.fillPaints ?? node.fills;
    let fillColor = "none";
    if (fills?.length) {
      const solidFill = fills.find((f) => f.type === "SOLID" && f.visible !== false);
      if (solidFill) {
        fillColor = figmaColorToCss(solidFill.color, solidFill.opacity);
      }
    } else if (fills == null) {
      fillColor = "currentColor";
    }

    // Stroke color + linecap/linejoin
    const strokes = node.strokePaints ?? node.strokes;
    const strokeWeight = node.strokeWeight ?? 0;
    let strokeAttr = "";
    if (strokes?.length && strokeWeight > 0) {
      const solidStroke = strokes.find((s) => s.type === "SOLID" && s.visible !== false);
      if (solidStroke) {
        const strokeColor = figmaColorToCss(solidStroke.color, solidStroke.opacity);
        strokeAttr = ` stroke="${strokeColor}" stroke-width="${strokeWeight}"`;
        // Stroke line cap and join
        const cap = node.strokeCap;
        if (cap === "ROUND") strokeAttr += ` stroke-linecap="round"`;
        else if (cap === "SQUARE") strokeAttr += ` stroke-linecap="square"`;
        const join = node.strokeJoin;
        if (join === "ROUND") strokeAttr += ` stroke-linejoin="round"`;
        else if (join === "BEVEL") strokeAttr += ` stroke-linejoin="bevel"`;
      }
    }

    // Use fill-rule from vectorNetwork regions if available
    const windingRule = node.vectorNetwork?.regions?.[0]?.windingRule;
    const fillRuleAttr = windingRule === "EVENODD" ? ` fill-rule="evenodd"` : "";

    const wrapStyle = stylesToString(styles);
    return `<div style="${wrapStyle}"><svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none" overflow="visible" xmlns="http://www.w3.org/2000/svg"><path d="${svgPath}" fill="${fillColor}"${fillRuleAttr}${strokeAttr}/></svg></div>`;
  }

  // Fallback: render as a colored div (no vector path data available)
  const styles = {};
  styles.width = `${w}px`;
  styles.height = `${h}px`;
  styles.boxSizing = "border-box";

  // Background fills
  const fills = node.fillPaints ?? node.fills;
  Object.assign(styles, convertFillsToCss(fills));

  // Strokes
  const strokes = node.strokePaints ?? node.strokes;
  const strokeWeight = node.strokeWeight ?? 0;
  const strokeAlign = node.strokeAlign ?? "INSIDE";
  Object.assign(styles, convertStrokesToCss(strokes, strokeWeight, strokeAlign));

  // Corner radius
  Object.assign(styles, convertCornerRadiusToCss(node));

  // Ellipse → border-radius: 50%
  if (node.type === "ELLIPSE") {
    styles.borderRadius = "50%";
  }

  // LINE → thin horizontal/vertical element
  if (node.type === "LINE") {
    if (h <= 1) styles.height = "1px";
    if (w <= 1) styles.width = "1px";
  }

  // Opacity
  const opacity = node.opacity;
  if (opacity != null && opacity < 1) {
    styles.opacity = opacity.toFixed(3);
  }

  // Effects
  const effects = node.effects;
  if (effects) Object.assign(styles, convertEffectsToCss(effects));

  const inlineStyle = stylesToString(styles);
  return `<div style="${inlineStyle}"></div>`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert a Figma node tree (from _figFile) to a full HTML document string.
 *
 * @param {Object} node - Root node from doc._figFile.pages[].rootNodes[]
 * @param {Object} [options]
 * @param {number}  [options.width]  - Override viewport width
 * @param {number}  [options.height] - Override viewport height
 * @returns {string} Full HTML document
 */
export function figmaNodeToHtml(node, options = {}) {
  const { width: w, height: h } = getNodeSize(node);
  const width = options.width || w || 393;
  const height = options.height || h || 852;

  const bodyHtml = convertNode(node, true);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${width}">
<style>
  * { margin: 0; padding: 0; }
  html, body { width: ${width}px; height: ${height}px; overflow: hidden; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/**
 * Render HTML in a hidden iframe and capture it as a PNG data URL.
 *
 * @param {string} html - Full HTML document to render
 * @param {number} width - Viewport width in CSS pixels
 * @param {number} height - Viewport height in CSS pixels
 * @param {number} [scale=2] - Device pixel ratio for retina
 * @returns {Promise<string>} data:image/png;base64,... URL
 */
// eslint-disable-next-line no-unused-vars
export async function renderHtmlToImage(html, width, height, scale = 2) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    `position:fixed;left:-9999px;top:-9999px;` +
    `width:${width}px;height:${height}px;` +
    `border:none;visibility:hidden;pointer-events:none;`;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for layout to stabilize
    await new Promise((resolve) => {
      const deadline = setTimeout(resolve, 2000);
      const iwin = iframe.contentWindow;

      function check() {
        const body = doc.body;
        if (body && body.children.length > 0) {
          const rect = body.children[0].getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) {
            clearTimeout(deadline);
            resolve();
            return;
          }
        }
        iwin.requestAnimationFrame(check);
      }

      setTimeout(() => iwin.requestAnimationFrame(check), 50);
    });

    // Capture to canvas using SVG foreignObject
    const svgNs = "http://www.w3.org/2000/svg";
    // eslint-disable-next-line no-undef
    const serializedHtml = new XMLSerializer().serializeToString(doc.documentElement);

    const svgString =
      `<svg xmlns="${svgNs}" width="${width}" height="${height}">` +
      `<foreignObject width="100%" height="100%">` +
      `<html xmlns="http://www.w3.org/1999/xhtml">${serializedHtml.replace(/<html[^>]*>/, "").replace(/<\/html>$/, "")}</html>` +
      `</foreignObject></svg>`;

    // SVG foreignObject always taints the canvas (browser security restriction),
    // so we return the SVG as a base64 data URL directly — it works as an <img> src.
    const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
    const imageDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    return imageDataUrl;
  } finally {
    document.body.removeChild(iframe);
  }
}

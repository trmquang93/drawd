import { FigmaDocument, FigmaRenderer } from "@grida/refig/browser";
// @grida/refig v0.0.4 — chunk hash is version-specific.
// iofigma is exported from the chunk but not re-exported from @grida/refig/browser.
// Pin the dependency version to keep this import stable.
import { iofigma } from "@grida/refig/dist/chunk-INJ5F2RK.mjs";
import { figmaNodeToHtml, renderHtmlToImage } from "./figmaToHtml";

// ---------------------------------------------------------------------------
// Shared-component capture: monkey-patch factory.node to intercept
// derivedSymbolData from INSTANCE nodeChanges during kiwi parsing.
// The patch is scoped — only active while captureState is non-null.
// ---------------------------------------------------------------------------
const origFactoryNode = iofigma.kiwi.factory.node;
let captureState = null;

// Auto-layout property names that exist on raw kiwi nodeChanges but are
// dropped by the factory's REST-API conversion. We copy them onto the
// factory output so figmaToHtml.js can read them directly.
const KIWI_LAYOUT_PROPS = [
  "stackMode",
  "stackSpacing",
  "stackHorizontalPadding",
  "stackVerticalPadding",
  "stackPaddingRight",
  "stackPaddingBottom",
  "stackPrimaryAlignItems",
  "stackCounterAlignItems",
  "stackChildAlignSelf",
  "stackChildPrimaryGrow",
  "stackPositioning",
  "stackCounterSizing",
  "stackPrimarySizing",
];

// Stroke & vector properties from kiwi that the factory drops.
// Needed for proper stroke-based icon rendering in figmaToHtml.js.
const KIWI_STROKE_PROPS = [
  "strokePaints",
  "strokeWeight",
  "strokeCap",
  "strokeJoin",
  "strokeAlign",
  "fillPaints",
];

// Text properties from kiwi that the factory drops.
// Needed for correct text sizing/wrapping in figmaToHtml.js.
const KIWI_TEXT_PROPS = [
  "textAutoResize",
];

iofigma.kiwi.factory.node = function (nc, message) {
  if (captureState) {
    captureState.message = message;
    if (nc.derivedSymbolData?.length && nc.guid) {
      captureState.derived.set(iofigma.kiwi.guid(nc.guid), nc);
    }
  }
  const node = origFactoryNode.call(this, nc, message);

  // Augment with auto-layout properties from the raw kiwi nodeChange.
  // The factory converts to REST API format but drops all layout props.
  if (node) {
    for (const prop of KIWI_LAYOUT_PROPS) {
      if (nc[prop] != null) {
        node[prop] = nc[prop];
      }
    }
    // Preserve stroke properties for vector/icon rendering
    for (const prop of KIWI_STROKE_PROPS) {
      if (nc[prop] != null && node[prop] == null) {
        node[prop] = nc[prop];
      }
    }
    // Preserve text properties for correct sizing/wrapping
    for (const prop of KIWI_TEXT_PROPS) {
      if (nc[prop] != null && node[prop] == null) {
        node[prop] = nc[prop];
      }
    }
  }

  return node;
};

function beginCapture() {
  captureState = { derived: new Map(), message: null };
}

function endCapture() {
  const result = captureState;
  captureState = null;
  return result;
}

// ---------------------------------------------------------------------------
// Shared-component resolution: process captured derivedSymbolData, build
// parent-child trees from the derived NodeChanges, and patch INSTANCE nodes
// in _figFile so the renderer sees the full subtree.
// ---------------------------------------------------------------------------
function findNodeRecursive(nodes, targetId) {
  for (const node of nodes || []) {
    if (node.id === targetId) return node;
    if (node.children) {
      const found = findNodeRecursive(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function findNodeInFigFile(figFile, nodeId) {
  for (const page of figFile?.pages || []) {
    const found = findNodeRecursive(page.rootNodes, nodeId);
    if (found) return found;
  }
  return null;
}

/**
 * Build a REST-like node tree from an array of raw kiwi nodeChanges.
 * Uses the monkey-patched factory so auto-layout / vector props are preserved.
 *
 * @param {Array} derivedNCs  - raw kiwi nodeChanges (e.g. from derivedSymbolData)
 * @param {object} message    - the kiwi message object (needed for blob decoding)
 * @param {string} parentGuid - guid of the logical parent (for root-child detection)
 * @returns {{ rootChildren: Array, guidToNode: Map, guidToKiwi: Map }}
 */
function buildDerivedTree(derivedNCs, message, parentGuid) {
  // Use the patched factory (preserves auto-layout props + vector data)
  const nodes = derivedNCs
    .map((nc) => iofigma.kiwi.factory.node(nc, message))
    .filter(Boolean);

  const guidToNode = new Map();
  nodes.forEach((n) => guidToNode.set(n.id, n));

  const guidToKiwi = new Map();
  derivedNCs.forEach((nc) => {
    if (nc.guid) guidToKiwi.set(iofigma.kiwi.guid(nc.guid), nc);
  });

  // Build parent-child relationships (mirrors buildChildrenRelationsInPlace)
  nodes.forEach((node) => {
    const kiwi = guidToKiwi.get(node.id);
    if (!kiwi?.parentIndex?.guid) return;
    const pGuid = iofigma.kiwi.guid(kiwi.parentIndex.guid);
    const parent = guidToNode.get(pGuid);
    if (parent && "children" in parent) {
      if (!parent.children) parent.children = [];
      parent.children.push(node);
    }
  });

  // Sort children by fractional position index
  guidToNode.forEach((parent) => {
    if (!parent.children?.length) return;
    parent.children.sort((a, b) => {
      const aPos = guidToKiwi.get(a.id)?.parentIndex?.position ?? "";
      const bPos = guidToKiwi.get(b.id)?.parentIndex?.position ?? "";
      return aPos.localeCompare(bPos);
    });
  });

  // Root children: nodes whose kiwi parent is the specified parentGuid
  const rootChildren = nodes.filter((node) => {
    const kiwi = guidToKiwi.get(node.id);
    if (!kiwi?.parentIndex?.guid) return false;
    return iofigma.kiwi.guid(kiwi.parentIndex.guid) === parentGuid;
  });

  // Sort root children by fractional position index (same as intermediate children above).
  // Without this, root-level children of shared library instances retain arbitrary
  // kiwi binary order, causing incorrect z-index assignment in figmaToHtml.
  rootChildren.sort((a, b) => {
    const aPos = guidToKiwi.get(a.id)?.parentIndex?.position ?? "";
    const bPos = guidToKiwi.get(b.id)?.parentIndex?.position ?? "";
    return aPos.localeCompare(bPos);
  });

  return { rootChildren, guidToNode, guidToKiwi };
}

/**
 * Apply symbol overrides (text content, visibility, opacity) from an
 * INSTANCE's symbolData onto the resolved derived tree.
 */
function applySymbolOverrides(rootChildren, kiwiInstance) {
  const overrides = kiwiInstance.symbolData?.symbolOverrides;
  if (!Array.isArray(overrides) || overrides.length === 0) return;

  // Build a flat map of all nodes in the tree for quick lookup
  const flatMap = new Map();
  const collect = (nodes) => {
    for (const n of nodes) {
      flatMap.set(n.id, n);
      if (n.children?.length) collect(n.children);
    }
  };
  collect(rootChildren);

  for (const ov of overrides) {
    if (!ov.guid) continue;
    const targetId = iofigma.kiwi.guid(ov.guid);
    const target = flatMap.get(targetId);
    if (!target) continue;

    // Text content override
    if (target.type === "TEXT" && typeof ov.textData?.characters === "string") {
      target.characters = ov.textData.characters;
    }
    if (ov.visible !== undefined) target.visible = ov.visible;
    if (ov.opacity !== undefined) target.opacity = ov.opacity;
  }
}

/**
 * Recursively resolve nested INSTANCE nodes within a derived tree.
 * When a shared component itself contains instances of other shared components,
 * those nested instances also carry their own derivedSymbolData.
 */
function resolveNestedInstances(nodes, guidToKiwi, message, depth = 0) {
  if (depth > 10) return; // guard against circular references
  for (const node of nodes) {
    if (node.type === "INSTANCE") {
      const kiwiNC = guidToKiwi.get(node.id);
      if (kiwiNC?.derivedSymbolData?.length && (!node.children || node.children.length === 0)) {
        const { rootChildren, guidToKiwi: nestedKiwiMap } =
          buildDerivedTree(kiwiNC.derivedSymbolData, message, node.id);
        if (rootChildren.length > 0) {
          applySymbolOverrides(rootChildren, kiwiNC);
          node.children = rootChildren;
          // Recurse into the newly resolved children
          resolveNestedInstances(rootChildren, nestedKiwiMap, message, depth + 1);
        }
      }
    }
    if (node.children?.length) {
      resolveNestedInstances(node.children, guidToKiwi, message, depth + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Derived rendering: decode fill/stroke geometry blobs and glyph outlines
// from library component instances whose derivedSymbolData contains rendering
// hints (guidPath + fillGeometry/derivedTextData) instead of full nodeChanges.
// ---------------------------------------------------------------------------

/**
 * Decode a Figma vector commands blob into an SVG path `d` string.
 *
 * Binary format: sequence of (command_byte, float32-LE params).
 *   1 = MoveTo (x, y)          — 2 floats
 *   2 = LineTo (x, y)          — 2 floats
 *   4 = CubicBezier (c1x, c1y, c2x, c2y, ex, ey) — 6 floats
 *   Close is encoded as MoveTo with a sentinel x (|x| > 1e15).
 *
 * Glyph outline blobs start with a 0x00 header byte before the first command.
 * Fill/stroke geometry blobs start directly with a command byte.
 */
function decodeFigmaCommandsBlob(blobBytes) {
  if (!blobBytes?.length) return "";
  const view = new DataView(blobBytes.buffer, blobBytes.byteOffset, blobBytes.byteLength);
  let offset = 0;
  let pathD = "";

  // Glyph blobs start with 0x00 header; skip it
  if (blobBytes[0] === 0x00 && blobBytes.length > 1 && [1, 2, 4].includes(blobBytes[1])) {
    offset = 1;
  }

  while (offset < blobBytes.length) {
    const cmd = blobBytes[offset];
    offset++;

    if (cmd === 1) {
      if (offset + 8 > blobBytes.length) break;
      const x = view.getFloat32(offset, true); offset += 4;
      const y = view.getFloat32(offset, true); offset += 4;
      if (Math.abs(x) > 1e15) { pathD += "Z "; continue; }
      pathD += `M${fmt(x)} ${fmt(y)} `;
    } else if (cmd === 2) {
      if (offset + 8 > blobBytes.length) break;
      const x = view.getFloat32(offset, true); offset += 4;
      const y = view.getFloat32(offset, true); offset += 4;
      pathD += `L${fmt(x)} ${fmt(y)} `;
    } else if (cmd === 4) {
      if (offset + 24 > blobBytes.length) break;
      const c = [];
      for (let i = 0; i < 6; i++) { c.push(view.getFloat32(offset, true)); offset += 4; }
      pathD += `C${c.map(fmt).join(" ")} `;
    } else {
      break;
    }
  }
  return pathD.trim();
}

/** Round to 2 decimal places for compact SVG output. */
function fmt(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Compute the bounding box of an SVG path `d` string by extracting all
 * numeric coordinate pairs.
 */
function pathBoundingBox(pathD) {
  const nums = pathD.match(/[-+]?\d*\.?\d+/g)?.map(Number) || [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Check if derivedSymbolData entries are rendering hints (guidPath format)
 * rather than full nodeChange objects (guid + type format).
 */
function isDerivedRenderingHints(derivedNCs) {
  if (!derivedNCs?.length) return false;
  // Rendering hints have guidPath and either fillGeometry or derivedTextData.
  // Full nodeChanges have guid and type.
  return derivedNCs[0].guidPath && !derivedNCs[0].guid;
}

// ---------------------------------------------------------------------------
// iOS Status Bar: detect and render a clean HTML status bar for known system
// components. Produces much higher fidelity than the generic SVG path fallback.
// ---------------------------------------------------------------------------

/** Standard iOS signal bars icon (4 bars ascending). */
const IOS_SIGNAL_SVG = `<svg width="17" height="12" viewBox="0 0 17 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="9" width="3" height="3" rx="0.5" fill="currentColor"/><rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="currentColor"/><rect x="9" y="3" width="3" height="9" rx="0.5" fill="currentColor"/><rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="currentColor"/></svg>`;

/** Standard iOS WiFi icon. */
const IOS_WIFI_SVG = `<svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 3.6C9.8 3.6 11.4 4.3 12.6 5.5L14.1 4C12.5 2.4 10.3 1.4 8 1.4C5.7 1.4 3.5 2.4 1.9 4L3.4 5.5C4.6 4.3 6.2 3.6 8 3.6Z" fill="currentColor"/><path d="M8 7.2C9 7.2 9.9 7.6 10.6 8.2L12.1 6.7C11 5.7 9.6 5 8 5C6.4 5 5 5.7 3.9 6.7L5.4 8.2C6.1 7.6 7 7.2 8 7.2Z" fill="currentColor"/><circle cx="8" cy="10.5" r="1.5" fill="currentColor"/></svg>`;

/** Standard iOS battery icon. */
const IOS_BATTERY_SVG = `<svg width="27" height="13" viewBox="0 0 27 13" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="22" height="12" rx="2.5" stroke="currentColor" stroke-opacity="0.35"/><rect x="2" y="2" width="19" height="9" rx="1.5" fill="currentColor"/><path d="M24 4.5C24.8 4.9 25.5 5.4 25.5 6.5C25.5 7.6 24.8 8.1 24 8.5V4.5Z" fill="currentColor" opacity="0.4"/></svg>`;

/**
 * Detect whether a library component INSTANCE is an iOS status bar.
 * Checks component name, instance dimensions, and text content.
 */
function isIOSStatusBar(kiwiInstance, derivedNCs) {
  const name = (kiwiInstance.name || "").toLowerCase();
  const w = kiwiInstance.size?.x ?? 0;
  const h = kiwiInstance.size?.y ?? 0;

  // Height check: iOS status bars are 44-54px tall
  if (h < 40 || h > 60) return false;

  // Width check: at least 300px (iPhone width range)
  if (w < 300) return false;

  // Name heuristic: common iOS status bar component names
  const nameHints = ["status", "top bar", "navigator", "statusbar", "status bar"];
  const nameMatch = nameHints.some((hint) => name.includes(hint));

  // Text content: look for a time pattern (H:MM or HH:MM)
  let hasTimeText = false;
  for (const entry of derivedNCs) {
    if (entry.derivedTextData?.glyphs?.length >= 3 && entry.derivedTextData.glyphs.length <= 5) {
      // 3-5 glyphs matches patterns like "9:41" or "12:00"
      hasTimeText = true;
    }
  }

  // Need at least name match OR time text, plus fill geometry for icons
  const hasFillGeometry = derivedNCs.some((e) => e.fillGeometry?.length > 0);
  return (nameMatch || hasTimeText) && hasFillGeometry;
}

/**
 * Render a clean HTML iOS status bar using the text and colors extracted
 * from derivedSymbolData.
 */
function buildIOSStatusBarHtml(kiwiInstance, derivedNCs, _message) {
  const instW = kiwiInstance.size?.x ?? 393;
  const instH = kiwiInstance.size?.y ?? 44;

  // Extract time text from derivedTextData glyphs
  let timeText = "9:41";
  for (const entry of derivedNCs) {
    if (!entry.derivedTextData?.glyphs?.length) continue;
    // Glyphs have firstCharacter index — reconstruct text
    // The characters aren't stored directly; we infer from glyph count and layout.
    // Common times: "9:41" (4 glyphs), "12:00" (5 glyphs)
    const glyphCount = entry.derivedTextData.glyphs.length;
    if (glyphCount >= 3 && glyphCount <= 5) {
      // Use glyph count to guess format; the actual characters come from
      // the component's text content which we can't read. Default to "9:41".
      timeText = glyphCount === 5 ? "12:00" : "9:41";
      break;
    }
  }

  // Extract foreground color from symbolOverrides
  let fgColor = "#000";
  let bgColor = "#fff";
  const derivedGpKeys = new Set();
  for (const entry of derivedNCs) {
    if (entry.guidPath?.guids) {
      derivedGpKeys.add(entry.guidPath.guids.map((g) => `${g.sessionID}:${g.localID}`).join("/"));
    }
  }

  for (const ov of kiwiInstance.symbolData?.symbolOverrides || []) {
    if (!ov.guidPath?.guids?.length) continue;
    const key = ov.guidPath.guids.map((g) => `${g.sessionID}:${g.localID}`).join("/");
    if (ov.fillPaints?.[0]?.color) {
      const c = ov.fillPaints[0].color;
      const rgb = figmaColorToRgb(c);
      if (derivedGpKeys.has(key)) {
        fgColor = rgb; // leaf element color → foreground
      } else {
        bgColor = rgb; // container color → background
      }
    }
  }

  return `<div style="width:${instW}px;height:${instH}px;background:${bgColor};display:flex;align-items:center;justify-content:space-between;padding:0 16px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',system-ui,sans-serif;color:${fgColor}">` +
    `<div style="font-size:17px;font-weight:600;letter-spacing:-0.4px">${timeText}</div>` +
    `<div style="display:flex;align-items:center;gap:6px;color:${fgColor}">` +
    IOS_SIGNAL_SVG + IOS_WIFI_SVG + IOS_BATTERY_SVG +
    `</div></div>`;
}

/**
 * Build an SVG string for a library component instance using its
 * derivedSymbolData rendering hints (fillGeometry, strokeGeometry,
 * derivedTextData) and symbolOverride colors.
 *
 * The instance's internal layout (child positions) lives in the component
 * master on Figma's servers and is not in the clipboard. We reconstruct
 * approximate positions by grouping elements and distributing them across
 * the instance width.
 *
 * @param {object} kiwiInstance - raw kiwi nodeChange for the INSTANCE
 * @param {object} message - kiwi message object (has .blobs)
 * @returns {string|null} SVG or HTML markup, or null if nothing to render
 */
function buildDerivedInstanceSvg(kiwiInstance, message) {
  const derivedNCs = kiwiInstance.derivedSymbolData;
  const instW = kiwiInstance.size?.x ?? 0;
  const instH = kiwiInstance.size?.y ?? 0;
  if (instW < 1 || instH < 1) return null;

  // Collect guidPath keys from derivedSymbolData entries (leaf elements).
  const derivedGpKeys = new Set();
  for (const entry of derivedNCs) {
    if (entry.guidPath?.guids) {
      derivedGpKeys.add(entry.guidPath.guids.map((g) => `${g.sessionID}:${g.localID}`).join("/"));
    }
  }

  // Build color override map: guidPath key → { fill, stroke }
  // Also detect container background fills: overrides whose guidPath doesn't
  // match any derivedSymbolData entry belong to intermediate container frames
  // (e.g. the white background behind a dark-themed status bar).
  const colorMap = new Map();
  let containerBg = null;
  for (const ov of kiwiInstance.symbolData?.symbolOverrides || []) {
    if (!ov.guidPath?.guids?.length) continue;
    const key = ov.guidPath.guids.map((g) => `${g.sessionID}:${g.localID}`).join("/");
    const entry = colorMap.get(key) || {};
    if (ov.fillPaints?.[0]?.color) entry.fill = figmaColorToRgb(ov.fillPaints[0].color);
    if (ov.strokePaints?.[0]?.color) entry.stroke = figmaColorToRgb(ov.strokePaints[0].color);
    colorMap.set(key, entry);

    // Container background: fill override for a non-leaf node
    if (!derivedGpKeys.has(key) && entry.fill) {
      containerBg = entry.fill;
    }
  }

  // Collect all visual elements
  const elements = []; // { type: "shape"|"glyph", svgPath, bbox, gpKey, strokePath? }

  for (const entry of derivedNCs) {
    const gpKey = entry.guidPath?.guids?.map((g) => `${g.sessionID}:${g.localID}`).join("/") || "";

    if (entry.derivedTextData) {
      // Text glyphs: each glyph is an SVG path in em-relative coordinates,
      // positioned by glyph.position and scaled by glyph.fontSize.
      const td = entry.derivedTextData;
      for (const glyph of td.glyphs || []) {
        const blob = message.blobs?.[glyph.commandsBlob]?.bytes;
        if (!blob) continue;
        const rawPath = decodeFigmaCommandsBlob(blob);
        if (!rawPath) continue;
        const fontSize = glyph.fontSize || 16;
        elements.push({
          type: "glyph",
          svgPath: rawPath,
          fontSize,
          glyphX: glyph.position?.x ?? 0,
          glyphY: glyph.position?.y ?? 0,
          bbox: pathBoundingBox(rawPath),
          gpKey,
        });
      }
    }

    if (entry.fillGeometry) {
      for (const fg of entry.fillGeometry) {
        const blob = message.blobs?.[fg.commandsBlob]?.bytes;
        if (!blob) continue;
        const svgPath = decodeFigmaCommandsBlob(blob);
        if (!svgPath) continue;
        const bbox = pathBoundingBox(svgPath);
        if (bbox.w < 0.5 && bbox.h < 0.5) continue;
        // Check for matching stroke
        let strokePath = null;
        if (entry.strokeGeometry) {
          for (const sg of entry.strokeGeometry) {
            const sBlob = message.blobs?.[sg.commandsBlob]?.bytes;
            if (sBlob) strokePath = decodeFigmaCommandsBlob(sBlob);
          }
        }
        elements.push({ type: "shape", svgPath, bbox, gpKey, strokePath });
      }
    }
  }

  if (elements.length === 0) return null;

  // Group consecutive elements by guidPath prefix similarity and bbox size.
  // Elements from the same visual group (e.g. signal bars) tend to be
  // consecutive in derivedSymbolData and have similar bounding box dimensions.
  const groups = [];
  let currentGroup = [];
  let lastBboxArea = -1;

  for (const el of elements) {
    const area = el.bbox.w * el.bbox.h;
    const isGlyph = el.type === "glyph";
    const prevIsGlyph = currentGroup.length > 0 && currentGroup[0].type === "glyph";

    // Start a new group when element type changes, or shape sizes diverge significantly
    if (currentGroup.length > 0) {
      const sameType = isGlyph === prevIsGlyph;
      const sizeRatio = lastBboxArea > 0 ? area / lastBboxArea : 1;
      const similarSize = sizeRatio > 0.2 && sizeRatio < 5;

      if (!sameType || (!isGlyph && !similarSize)) {
        groups.push(currentGroup);
        currentGroup = [];
      }
    }
    currentGroup.push(el);
    lastBboxArea = area;
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  // Compute each group's composite bounding box and arrange within the instance.
  // Heuristic: distribute groups evenly across the instance width, centered vertically.
  const groupMetas = groups.map((group) => {
    let gMinX = Infinity, gMinY = Infinity, gMaxX = -Infinity, gMaxY = -Infinity;
    let totalW = 0;

    if (group[0].type === "glyph") {
      // Glyphs are positioned relative to the text node's origin
      for (const el of group) {
        const scaledW = el.bbox.w * el.fontSize;
        const scaledH = el.bbox.h * el.fontSize;
        const x = el.glyphX;
        const y = el.glyphY - scaledH;
        gMinX = Math.min(gMinX, x);
        gMinY = Math.min(gMinY, y);
        gMaxX = Math.max(gMaxX, x + scaledW);
        gMaxY = Math.max(gMaxY, y + scaledH);
      }
    } else {
      // Shapes: stack side by side with a small gap
      const GAP = 2;
      let cx = 0;
      for (const el of group) {
        gMinY = Math.min(gMinY, el.bbox.y);
        gMaxY = Math.max(gMaxY, el.bbox.y + el.bbox.h);
        cx += el.bbox.w + GAP;
      }
      totalW = Math.max(0, cx - GAP);
      gMinX = 0;
      gMaxX = totalW;
      if (!isFinite(gMinY)) { gMinY = 0; gMaxY = 0; }
    }

    return {
      group,
      w: gMaxX - gMinX,
      h: gMaxY - gMinY,
      isText: group[0].type === "glyph",
    };
  });

  // Position groups: text groups get centered, shape groups distributed left/right.
  const textGroups = groupMetas.filter((g) => g.isText);
  const shapeGroups = groupMetas.filter((g) => !g.isText);

  // Split shape groups into left and right by cumulative width.
  // Walk from the start, accumulating width. Once we exceed half the
  // available space (instance width minus text and padding), switch to right.
  const totalShapeW = shapeGroups.reduce((s, g) => s + g.w, 0);
  const halfTarget = totalShapeW / 2;

  const leftShapes = [];
  const rightShapes = [];
  let accW = 0;
  for (const g of shapeGroups) {
    if (accW + g.w / 2 < halfTarget) {
      leftShapes.push(g);
    } else {
      rightShapes.push(g);
    }
    accW += g.w;
  }

  // Build SVG content
  let svgContent = "";

  // Container background from symbolOverrides (intermediate frame fills)
  if (containerBg) {
    svgContent += `<rect width="${instW}" height="${instH}" fill="${containerBg}"/>`;
  }

  const PADDING = 8;
  const vCenter = instH / 2;

  // Render left-side shape groups
  let xCursor = PADDING;
  for (const meta of leftShapes) {
    svgContent += renderShapeGroup(meta, xCursor, vCenter, colorMap);
    xCursor += meta.w + PADDING;
  }

  // Render centered text groups
  for (const meta of textGroups) {
    const tx = (instW - meta.w) / 2;
    svgContent += renderGlyphGroup(meta, tx, vCenter, colorMap);
  }

  // Render right-side shape groups
  xCursor = instW - PADDING;
  for (let i = rightShapes.length - 1; i >= 0; i--) {
    const meta = rightShapes[i];
    xCursor -= meta.w;
    svgContent += renderShapeGroup(meta, xCursor, vCenter, colorMap);
    xCursor -= PADDING;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${instW}" height="${instH}" viewBox="0 0 ${instW} ${instH}">${svgContent}</svg>`;
}

function renderGlyphGroup(meta, groupX, vCenter, colorMap) {
  const { group, h } = meta;
  let svg = "";
  const yOffset = vCenter - h / 2;
  const gpKey = group[0]?.gpKey || "";
  const fill = colorMap.get(gpKey)?.fill || "#333";

  for (const el of group) {
    const scale = el.fontSize;
    // Glyph Y in Figma is the baseline position. In SVG, we flip Y since
    // glyph paths use Y-up coordinates (0 at baseline, positive up).
    const tx = groupX + el.glyphX;
    const ty = yOffset + el.glyphY;
    svg += `<g transform="translate(${fmt(tx)},${fmt(ty)}) scale(${scale},-${scale})">`;
    svg += `<path d="${el.svgPath}" fill="${fill}"/>`;
    svg += "</g>";
  }
  return svg;
}

function renderShapeGroup(meta, groupX, vCenter, colorMap) {
  const { group, h } = meta;
  let svg = "";
  const yOffset = vCenter - h / 2;
  const GAP = 2;
  let cx = groupX;

  for (const el of group) {
    const gpKey = el.gpKey || "";
    const fill = colorMap.get(gpKey)?.fill || "#333";
    const strokeColor = colorMap.get(gpKey)?.stroke;
    const tx = cx - el.bbox.x;
    const ty = yOffset + (h - el.bbox.h) - el.bbox.y;

    svg += `<g transform="translate(${fmt(tx)},${fmt(ty)})">`;
    svg += `<path d="${el.svgPath}" fill="${fill}"/>`;
    if (el.strokePath && strokeColor) {
      svg += `<path d="${el.strokePath}" fill="${strokeColor}"/>`;
    }
    svg += "</g>";
    cx += el.bbox.w + GAP;
  }
  return svg;
}

function figmaColorToRgb(color) {
  if (!color) return null;
  const r = Math.round((color.r ?? 0) * 255);
  const g = Math.round((color.g ?? 0) * 255);
  const b = Math.round((color.b ?? 0) * 255);
  const a = color.a ?? 1;
  if (a >= 1) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function resolveSharedComponents(doc, captured) {
  if (!captured?.derived?.size) return 0;

  const { derived, message } = captured;
  let patchCount = 0;

  for (const [instanceGuid, kiwiInstance] of derived) {
    const derivedNCs = kiwiInstance.derivedSymbolData;

    const { rootChildren, guidToKiwi } =
      buildDerivedTree(derivedNCs, message, instanceGuid);

    if (rootChildren.length === 0) {
      // Full node tree not available — this is a library component whose
      // derivedSymbolData contains rendering hints (guidPath + fillGeometry /
      // derivedTextData) instead of complete nodeChange objects.
      // Build an approximate SVG rendering from the available geometry.
      if (isDerivedRenderingHints(derivedNCs)) {
        const instanceNode = findNodeInFigFile(doc._figFile, instanceGuid);
        if (instanceNode) {
          // Try clean HTML rendering for known system components first,
          // fall back to generic SVG path reconstruction.
          let content = null;
          if (isIOSStatusBar(kiwiInstance, derivedNCs)) {
            content = buildIOSStatusBarHtml(kiwiInstance, derivedNCs, message);
          }
          if (!content) {
            content = buildDerivedInstanceSvg(kiwiInstance, message);
          }
          if (content) {
            instanceNode._derivedSvg = content;
            patchCount++;
          }
        }
      }
      continue;
    }

    // Apply text / visibility overrides from the instance
    applySymbolOverrides(rootChildren, kiwiInstance);

    // Recursively resolve nested shared component instances
    resolveNestedInstances(rootChildren, guidToKiwi, message);

    // Patch the INSTANCE node in _figFile with resolved children
    const instanceNode = findNodeInFigFile(doc._figFile, instanceGuid);
    if (instanceNode) {
      instanceNode.children = rootChildren;
      patchCount++;
    }
  }

  // Clear scene cache so _resolve() regenerates from patched _figFile
  if (patchCount > 0) {
    doc._sceneCache.clear();
  }

  return patchCount;
}

/**
 * Detect Figma content in clipboard HTML.
 * Figma puts hidden spans with `(figmeta)` and `(figma)` markers
 * in `text/html`. Figma Desktop may also include an `image/png` blob;
 * Figma Web typically does not.
 *
 * @param {DataTransfer} clipboardData
 * @returns {boolean}
 */
export function isFigmaClipboard(clipboardData) {
  const html = clipboardData.getData("text/html");
  if (!html) return false;
  return html.includes("(figmeta)") && html.includes("(figma)");
}

/**
 * Extract figmeta JSON and binary buffer from clipboard HTML.
 *
 * Clipboard HTML structure:
 *   <span data-metadata="<!--(figmeta)BASE64(/figmeta)-->">
 *   <span data-buffer="<!--(figma)BASE64(/figma)-->">
 *
 * @param {string} html - clipboard text/html content
 * @returns {{ meta: { fileKey: string, pasteID: string }, buffer: Uint8Array } | null}
 */
export function extractFigmaData(html) {
  try {
    const metaMatch = html.match(/\(figmeta\)([\s\S]*?)\(\/figmeta\)/);
    const bufferMatch = html.match(/\(figma\)([\s\S]*?)\(\/figma\)/);

    if (!metaMatch || !bufferMatch) return null;

    const metaJson = JSON.parse(atob(metaMatch[1].trim()));
    const binaryStr = atob(bufferMatch[1].trim());
    const buffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      buffer[i] = binaryStr.charCodeAt(i);
    }

    return {
      meta: {
        fileKey: metaJson.fileKey || null,
        pasteID: metaJson.pasteID || null,
      },
      buffer,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a Figma binary buffer to extract frame metadata without WASM rendering.
 * Uses FigmaDocument's internal kiwi parser to get frame names and IDs.
 *
 * Note: the clipboard binary contains the full scene graph (positions, fills,
 * text, fonts) but NOT the raster image bytes referenced by IMAGE fills,
 * and system fonts like SF Pro cannot be loaded from the browser.
 * This function is used for lightweight metadata extraction only.
 *
 * @param {Uint8Array} buffer - decoded fig-kiwi binary
 * @returns {{ frames: Array<{ id: string, name: string }>, document: FigmaDocument }}
 */
export function parseFigmaFrames(buffer) {
  const doc = new FigmaDocument(buffer);

  // Capture derivedSymbolData from INSTANCE nodeChanges during parsing.
  // This data contains shared/library component definitions that are not
  // included in the top-level nodeChanges array.
  beginCapture();

  // Trigger the internal kiwi parse so _figFile is populated.
  // _resolve() converts to Grida IR (flat node map, no tree hierarchy),
  // but _figFile retains the original Figma page/frame structure.
  doc._resolve();

  const captured = endCapture();

  // Resolve shared/library component instances by injecting their children
  // from derivedSymbolData into the _figFile tree. Wrapped in try/catch so
  // failures degrade gracefully to the current behavior (empty instances).
  try {
    const patchCount = resolveSharedComponents(doc, captured);
    if (patchCount > 0 && import.meta.env.DEV) {
      console.log(
        `[Figma] Resolved ${patchCount} shared component instance(s)`,
      );
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[Figma] Shared component resolution failed:", err);
    }
  }

  const figFile = doc._figFile;
  const frames = [];

  if (figFile?.pages) {
    for (const page of figFile.pages) {
      const rootNodes = page.rootNodes || [];
      for (const node of rootNodes) {
        if (node.id && node.name) {
          frames.push({
            id: node.id,
            name: node.name,
            width: node.size?.x ?? null,
            height: node.size?.y ?? null,
          });
        }
      }
    }
  }

  if (import.meta.env.DEV) {
    console.log(
      `[Figma] Parsed ${frames.length} frame(s)`,
      frames.map((f) => `${f.name} (${f.width}x${f.height})`),
    );
  }

  return { frames, document: doc };
}

/**
 * Convert a Uint8Array to a base64 string.
 * Uses chunked btoa to avoid call-stack overflow on large buffers.
 */
function uint8ArrayToBase64(bytes) {
  const CHUNK = 0x8000;
  const parts = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(""));
}

/**
 * Walk a Figma scene JSON and remove all IMAGE-type fills.
 * Clipboard IMAGE fills contain no pixel data (just CDN references)
 * and render as checker patterns. Stripping them yields transparent
 * areas, preserving the rest of the layout (vectors, text, gradients).
 */
function stripImageFills(sceneJsonStr) {
  const scene = JSON.parse(sceneJsonStr);
  const nodes = scene.document?.nodes;
  if (nodes) {
    for (const node of Object.values(nodes)) {
      if (Array.isArray(node.fills)) {
        node.fills = node.fills.filter((f) => f.type !== "image");
      }
    }
  }
  return JSON.stringify(scene);
}

/**
 * Render a single Figma frame with IMAGE fills stripped.
 *
 * Strategy: resolve the scene (populates internal cache), mutate the
 * cached sceneJson to remove image fills, then render normally.
 * The renderer reads the same cache reference, so no subclassing needed.
 *
 * @param {FigmaDocument} doc - parsed Figma document
 * @param {string} nodeId - frame node ID to render
 * @param {{ width: number, height: number }} [dimensions] - optional size override
 * @returns {Promise<string>} data:image/png;base64,... URL
 */
async function renderFigmaFrame(doc, nodeId, dimensions) {
  const resolved = doc._resolve(nodeId);
  resolved.sceneJson = stripImageFills(resolved.sceneJson);

  const renderer = new FigmaRenderer(doc, { loadFigmaDefaultFonts: true });
  try {
    const renderOpts = { format: "png", scale: 2 };
    if (dimensions?.width && dimensions?.height) {
      renderOpts.width = Math.ceil(dimensions.width);
      renderOpts.height = Math.ceil(dimensions.height);
    }
    const result = await renderer.render(nodeId, renderOpts);
    const base64 = uint8ArrayToBase64(result.data);
    return `data:image/png;base64,${base64}`;
  } finally {
    renderer.dispose();
  }
}

/**
 * High-level entry point: parse a Figma clipboard buffer and render
 * the first frame with IMAGE fills stripped (layout-only preview).
 *
 * @param {Uint8Array} buffer - decoded fig-kiwi binary from clipboard
 * @returns {Promise<{ frameName: string, imageDataUrl: string, frameCount: number }>}
 */
export async function renderFigmaBuffer(buffer) {
  const { frames, document: doc } = parseFigmaFrames(buffer);
  if (frames.length === 0) throw new Error("No frames found in Figma clipboard data");

  const firstFrame = frames[0];
  const imageDataUrl = await renderFigmaFrame(doc, firstFrame.id, {
    width: firstFrame.width,
    height: firstFrame.height,
  });

  return { frameName: firstFrame.name, imageDataUrl, frameCount: frames.length };
}

// ---------------------------------------------------------------------------
// HTML-based rendering: convert Figma node tree → HTML → PNG.
// This bypasses the WASM renderer entirely, producing higher-fidelity output
// by leveraging the browser's own layout and text rendering.
// ---------------------------------------------------------------------------

/**
 * Convert a parsed Figma frame to an HTML document string.
 *
 * @param {FigmaDocument} doc - parsed Figma document (from parseFigmaFrames)
 * @param {string} frameId - the frame node ID to convert
 * @returns {{ html: string, frameName: string, width: number, height: number } | null}
 */
export function figmaFrameToHtml(doc, frameId) {
  const node = findNodeInFigFile(doc._figFile, frameId);
  if (!node) return null;

  const width = node.size?.x ?? 393;
  const height = node.size?.y ?? 852;
  const html = figmaNodeToHtml(node, { width, height });

  return {
    html,
    frameName: node.name || "Figma Frame",
    width,
    height,
  };
}

/**
 * High-level entry point: parse a Figma clipboard buffer, convert each frame
 * to HTML, and render to PNG using the browser's own rendering engine.
 *
 * @param {Uint8Array} buffer - decoded fig-kiwi binary from clipboard
 * @returns {Promise<Array<{ frameName: string, imageDataUrl: string, html: string, width: number, height: number }>>}
 */
export async function convertFigmaBuffer(buffer) {
  const { frames, document: doc } = parseFigmaFrames(buffer);
  if (frames.length === 0) throw new Error("No frames found in Figma clipboard data");

  const results = [];
  for (const frame of frames) {
    const converted = figmaFrameToHtml(doc, frame.id);
    if (!converted) continue;

    const imageDataUrl = await renderHtmlToImage(
      converted.html,
      Math.ceil(converted.width),
      Math.ceil(converted.height),
    );

    results.push({
      frameName: converted.frameName,
      imageDataUrl,
      html: converted.html,
      width: converted.width,
      height: converted.height,
    });
  }

  return results;
}

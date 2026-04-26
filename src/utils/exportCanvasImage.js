import { wireframeToSvg } from "./wireframeToSvg";
import {
  DEFAULT_SCREEN_WIDTH,
  DEFAULT_IMAGE_HEIGHT,
  HEADER_HEIGHT,
  BORDER_WIDTH,
  BEZIER_FACTOR,
  BEZIER_MIN_CP,
  DEFAULT_EXPORT_FILENAME,
} from "../constants";

// Match ScreenGroup.jsx visual padding so the exported group rect contains its members.
const GROUP_PADDING = 30;
const GROUP_LABEL_HEIGHT = 20;

// Sticky note bounds height used by stickyBounds() — kept in sync to avoid a circular import.
const STICKY_NOTE_HEIGHT = 120;

// Mirrors NOTE_COLORS in StickyNote.jsx so exports match the editor visuals.
const STICKY_COLORS = {
  yellow: { bg: "#2d2a00", border: "#f0c040", text: "#f5e17a" },
  blue:   { bg: "#001a2d", border: "#4da6ff", text: "#a8d4ff" },
  red:    { bg: "#2d0000", border: "#ff6b6b", text: "#ffb3b3" },
  green:  { bg: "#002d0a", border: "#00d27d", text: "#7fffb8" },
};

const CANVAS_BG = "#21252b";

// ── Filtering ────────────────────────────────────────────────────────────────
/**
 * Decides which screens, connections, sticky notes and groups to include.
 * Priority: explicit `selection` ▸ `scopeScreenIds` ▸ everything.
 *
 * `selection` is the canvas multi-selection array: [{type: "screen"|"sticky", id}, …]
 * `scopeScreenIds` is a Set produced by the scope-root traversal in Drawd.jsx.
 */
export function selectExportItems({
  screens = [],
  connections = [],
  stickyNotes = [],
  screenGroups = [],
  selection = null,
  scopeScreenIds = null,
}) {
  const hasSelection = Array.isArray(selection) && selection.length > 0;

  let screenIdSet;
  let stickyIdSet = null;

  if (hasSelection) {
    screenIdSet = new Set(selection.filter((s) => s.type === "screen").map((s) => s.id));
    stickyIdSet = new Set(selection.filter((s) => s.type === "sticky").map((s) => s.id));
  } else if (scopeScreenIds) {
    screenIdSet = new Set(scopeScreenIds);
  } else {
    screenIdSet = new Set(screens.map((s) => s.id));
  }

  const includedScreens = screens.filter((s) => screenIdSet.has(s.id));
  const includedConnections = connections.filter(
    (c) => screenIdSet.has(c.fromScreenId) && screenIdSet.has(c.toScreenId),
  );
  const includedSticky = stickyIdSet
    ? stickyNotes.filter((n) => stickyIdSet.has(n.id))
    : (hasSelection ? [] : stickyNotes);
  // A group is rendered only when all of its member screens made it into the export.
  const includedGroups = (screenGroups || []).filter(
    (g) => g.screenIds.length > 0 && g.screenIds.every((id) => screenIdSet.has(id)),
  );

  return {
    screens: includedScreens,
    connections: includedConnections,
    stickyNotes: includedSticky,
    screenGroups: includedGroups,
  };
}

// ── Geometry helpers ─────────────────────────────────────────────────────────
function screenSize(s) {
  return {
    w: s.width || DEFAULT_SCREEN_WIDTH,
    h: (s.imageHeight || DEFAULT_IMAGE_HEIGHT) + HEADER_HEIGHT,
  };
}

function groupRect(group, screens) {
  const members = screens.filter((s) => group.screenIds.includes(s.id));
  if (members.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of members) {
    const { w, h } = screenSize(s);
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + w);
    maxY = Math.max(maxY, s.y + h);
  }
  return {
    x: minX - GROUP_PADDING,
    y: minY - GROUP_PADDING - GROUP_LABEL_HEIGHT,
    width: (maxX - minX) + GROUP_PADDING * 2,
    height: (maxY - minY) + GROUP_PADDING * 2 + GROUP_LABEL_HEIGHT,
  };
}

/**
 * Connection endpoint geometry. Mirrors computePoints() in ConnectionLines.jsx
 * but inlined to keep this module dependency-free of React/JSX (so tests stay
 * fast and the bundler doesn't pull a UI component into the export path).
 */
function computeConnectionPoints(conn, screens) {
  const from = screens.find((s) => s.id === conn.fromScreenId);
  const to = screens.find((s) => s.id === conn.toScreenId);
  if (!from || !to) return null;

  const fromW = from.width || DEFAULT_SCREEN_WIDTH;
  const fromImgH = from.imageHeight || DEFAULT_IMAGE_HEIGHT;
  const toImgH = to.imageHeight || DEFAULT_IMAGE_HEIGHT;
  const hs = conn.hotspotId && from.hotspots
    ? from.hotspots.find((h) => h.id === conn.hotspotId)
    : null;

  let fromX, fromY;
  if (hs && from.imageHeight) {
    fromX = from.x + BORDER_WIDTH + (hs.x + hs.w / 2) / 100 * fromW;
    fromY = from.y + BORDER_WIDTH + HEADER_HEIGHT + (hs.y + hs.h / 2) / 100 * fromImgH;
  } else {
    fromX = from.x + fromW;
    fromY = from.y + (HEADER_HEIGHT + fromImgH) / 2;
  }
  const toX = to.x;
  const toY = to.y + (HEADER_HEIGHT + toImgH) / 2;
  return { fromX, fromY, toX, toY };
}

function bezierControlPoints(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const cp = Math.max(BEZIER_MIN_CP, Math.abs(dx) * BEZIER_FACTOR);
  return { cp1x: fromX + cp, cp1y: fromY, cp2x: toX - cp, cp2y: toY };
}

function bezierPathD(fromX, fromY, toX, toY) {
  const { cp1x, cp1y, cp2x, cp2y } = bezierControlPoints(fromX, fromY, toX, toY);
  return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
}

function connectionColor(conn) {
  if (conn.connectionPath === "api-success") return "#98c379";
  if (conn.connectionPath === "api-error") return "#e06c75";
  if (conn.connectionPath?.startsWith?.("condition-")) return "#d19a66";
  return "#61afef";
}

// ── Bounding box ─────────────────────────────────────────────────────────────
/**
 * Computes the union bounding box of all visible items, expanded by `padding` on each side.
 * Returns null when there is nothing to export.
 */
export function computeExportBounds(items, padding = 40) {
  const { screens, stickyNotes, screenGroups } = items;
  if (screens.length === 0 && stickyNotes.length === 0 && screenGroups.length === 0) {
    return null;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const s of screens) {
    const { w, h } = screenSize(s);
    minX = Math.min(minX, s.x);
    minY = Math.min(minY, s.y);
    maxX = Math.max(maxX, s.x + w);
    maxY = Math.max(maxY, s.y + h);
  }

  for (const n of stickyNotes) {
    const w = n.width || DEFAULT_SCREEN_WIDTH;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + w);
    maxY = Math.max(maxY, n.y + STICKY_NOTE_HEIGHT);
  }

  for (const g of screenGroups) {
    const r = groupRect(g, screens);
    if (!r) continue;
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  }

  return {
    minX: minX - padding,
    minY: minY - padding,
    width: (maxX - minX) + padding * 2,
    height: (maxY - minY) + padding * 2,
  };
}

// ── Screen content ──────────────────────────────────────────────────────────
function escapeXml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Returns a data: URL representing the screen's visual content, or null if
 * the screen has no content (blank screen). Wireframe screens are rasterised
 * into SVG via the existing wireframeToSvg helper.
 */
export function screenContentToHref(screen) {
  if (screen.imageData) return screen.imageData;
  if (screen.svgContent) {
    const encoded = btoa(unescape(encodeURIComponent(screen.svgContent)));
    return `data:image/svg+xml;base64,${encoded}`;
  }
  if (screen.wireframe) {
    const svg = wireframeToSvg(screen.wireframe);
    if (!svg) return null;
    const encoded = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${encoded}`;
  }
  return null;
}

// ── SVG renderer ─────────────────────────────────────────────────────────────
/**
 * Builds a self-contained SVG string for the export. Screens are embedded as
 * <image> elements via data URLs so the SVG renders standalone (no asset deps).
 */
export function buildCanvasSvg({
  screens,
  connections,
  stickyNotes,
  screenGroups,
  bounds,
  backgroundColor = CANVAS_BG,
}) {
  if (!bounds) return null;
  const { minX, minY, width, height } = bounds;
  const w = Math.round(width);
  const h = Math.round(height);

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${width} ${height}">`,
  );
  parts.push(
    `<defs>` +
    `<marker id="d-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#61afef"/></marker>` +
    `<marker id="d-arrow-success" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#98c379"/></marker>` +
    `<marker id="d-arrow-error" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#e06c75"/></marker>` +
    `<marker id="d-arrow-condition" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#d19a66"/></marker>` +
    `</defs>`,
  );
  parts.push(
    `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${backgroundColor}"/>`,
  );

  // 1. Screen-group background rectangles (drawn first so they sit behind screens).
  for (const g of screenGroups) {
    const r = groupRect(g, screens);
    if (!r) continue;
    const fill = g.color || "rgba(97,175,239,0.08)";
    const stroke = "rgba(97,175,239,0.4)";
    parts.push(
      `<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="6 4" rx="14"/>`,
    );
    if (g.name) {
      parts.push(
        `<text x="${r.x + 12}" y="${r.y + 14}" fill="#abb2bf" font-family="Menlo, monospace" font-size="11" font-weight="600">${escapeXml(g.name)}</text>`,
      );
    }
  }

  // 2. Screen cards (header + image content).
  for (const s of screens) {
    const { w: sw, h: sh } = screenSize(s);
    const imgH = s.imageHeight || DEFAULT_IMAGE_HEIGHT;
    parts.push(
      `<rect x="${s.x}" y="${s.y}" width="${sw}" height="${sh}" fill="#2c313a" stroke="#3e4451" stroke-width="1.5" rx="6"/>`,
    );
    parts.push(
      `<text x="${s.x + 10}" y="${s.y + 23}" fill="#abb2bf" font-family="Menlo, monospace" font-size="12" font-weight="600">${escapeXml(s.name || "Untitled")}</text>`,
    );
    const imgY = s.y + HEADER_HEIGHT;
    const href = screenContentToHref(s);
    if (href) {
      parts.push(
        `<image x="${s.x}" y="${imgY}" width="${sw}" height="${imgH}" href="${href}" preserveAspectRatio="xMidYMid slice"/>`,
      );
    } else {
      parts.push(`<rect x="${s.x}" y="${imgY}" width="${sw}" height="${imgH}" fill="#0d0d15"/>`);
    }
    if (Array.isArray(s.hotspots)) {
      for (const hs of s.hotspots) {
        const hx = s.x + (hs.x / 100) * sw;
        const hy = imgY + (hs.y / 100) * imgH;
        const hw = (hs.w / 100) * sw;
        const hh = (hs.h / 100) * imgH;
        parts.push(
          `<rect x="${hx}" y="${hy}" width="${hw}" height="${hh}" fill="rgba(97,175,239,0.18)" stroke="#61afef" stroke-width="1" stroke-dasharray="3 2"/>`,
        );
      }
    }
  }

  // 3. Connections (bezier curves with arrowheads and labels).
  for (const conn of connections) {
    const pts = computeConnectionPoints(conn, screens);
    if (!pts) continue;
    const { fromX, fromY, toX, toY } = pts;
    const stroke = connectionColor(conn);
    let marker;
    if (stroke === "#98c379") marker = "url(#d-arrow-success)";
    else if (stroke === "#e06c75") marker = "url(#d-arrow-error)";
    else if (stroke === "#d19a66") marker = "url(#d-arrow-condition)";
    else marker = "url(#d-arrow)";
    const d = bezierPathD(fromX, fromY, toX, toY);
    parts.push(
      `<circle cx="${fromX}" cy="${fromY}" r="5" fill="${stroke}" opacity="0.9"/>`,
    );
    parts.push(
      `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-dasharray="8 4" marker-end="${marker}" opacity="0.85"/>`,
    );
    const label = conn.condition || conn.label;
    if (label) {
      const lx = (fromX + toX) / 2;
      const ly = (fromY + toY) / 2 - 10;
      const labelColor = conn.condition ? "#d19a66" : "#8cc5f6";
      parts.push(
        `<text x="${lx}" y="${ly}" fill="${labelColor}" font-family="Menlo, monospace" font-size="10" text-anchor="middle">${escapeXml(label)}</text>`,
      );
    }
  }

  // 4. Sticky notes (drawn last so they sit on top).
  for (const n of stickyNotes) {
    const nw = n.width || DEFAULT_SCREEN_WIDTH;
    const colors = STICKY_COLORS[n.color] || STICKY_COLORS.yellow;
    parts.push(
      `<rect x="${n.x}" y="${n.y}" width="${nw}" height="${STICKY_NOTE_HEIGHT}" fill="${colors.bg}" stroke="${colors.border}" stroke-width="1.5" rx="10"/>`,
    );
    if (n.content) {
      const lines = String(n.content).split(/\n/);
      lines.forEach((line, i) => {
        const ty = n.y + 32 + i * 14;
        if (ty < n.y + STICKY_NOTE_HEIGHT - 6) {
          parts.push(
            `<text x="${n.x + 12}" y="${ty}" fill="${colors.text}" font-family="Menlo, monospace" font-size="11">${escapeXml(line)}</text>`,
          );
        }
      });
    }
  }

  parts.push(`</svg>`);
  return parts.join("\n");
}

// ── PNG renderer ─────────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadScreenImage(screen) {
  const href = screenContentToHref(screen);
  if (!href) return null;
  try { return await loadImage(href); } catch { return null; }
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawArrowhead(ctx, fromX, fromY, toX, toY, color) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 9;
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 7), toY - size * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 7), toY - size * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * Paints the export onto a 2D canvas context. Caller is responsible for sizing
 * the canvas and applying any pixel-ratio scaling. Coordinates are translated
 * so the top-left of the bounding box sits at (0, 0).
 */
export async function paintExportToContext(ctx, items, bounds, backgroundColor = CANVAS_BG) {
  const { screens, connections, stickyNotes, screenGroups } = items;
  const { minX, minY, width, height } = bounds;

  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.translate(-minX, -minY);

  // 1. Screen groups.
  for (const g of screenGroups) {
    const r = groupRect(g, screens);
    if (!r) continue;
    ctx.fillStyle = g.color || "rgba(97,175,239,0.08)";
    ctx.strokeStyle = "rgba(97,175,239,0.4)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    drawRoundedRect(ctx, r.x, r.y, r.width, r.height, 14);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (g.name) {
      ctx.fillStyle = "#abb2bf";
      ctx.font = "600 11px Menlo, monospace";
      ctx.fillText(g.name, r.x + 12, r.y + 14);
    }
  }

  // 2. Screens — load all images in parallel for speed.
  const imagePairs = await Promise.all(screens.map(async (s) => ({ s, img: await loadScreenImage(s) })));
  for (const { s, img } of imagePairs) {
    const { w: sw, h: sh } = screenSize(s);
    const imgH = s.imageHeight || DEFAULT_IMAGE_HEIGHT;
    ctx.fillStyle = "#2c313a";
    ctx.strokeStyle = "#3e4451";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, s.x, s.y, sw, sh, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#abb2bf";
    ctx.font = "600 12px Menlo, monospace";
    ctx.fillText(s.name || "Untitled", s.x + 10, s.y + 23);

    const imgY = s.y + HEADER_HEIGHT;
    if (img) {
      ctx.drawImage(img, s.x, imgY, sw, imgH);
    } else {
      ctx.fillStyle = "#0d0d15";
      ctx.fillRect(s.x, imgY, sw, imgH);
    }

    if (Array.isArray(s.hotspots)) {
      ctx.fillStyle = "rgba(97,175,239,0.18)";
      ctx.strokeStyle = "#61afef";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      for (const hs of s.hotspots) {
        const hx = s.x + (hs.x / 100) * sw;
        const hy = imgY + (hs.y / 100) * imgH;
        const hw = (hs.w / 100) * sw;
        const hh = (hs.h / 100) * imgH;
        ctx.fillRect(hx, hy, hw, hh);
        ctx.strokeRect(hx, hy, hw, hh);
      }
      ctx.setLineDash([]);
    }
  }

  // 3. Connections.
  for (const conn of connections) {
    const pts = computeConnectionPoints(conn, screens);
    if (!pts) continue;
    const { fromX, fromY, toX, toY } = pts;
    const { cp1x, cp1y, cp2x, cp2y } = bezierControlPoints(fromX, fromY, toX, toY);
    const stroke = connectionColor(conn);

    ctx.fillStyle = stroke;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(fromX, fromY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 4]);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX, toY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    drawArrowhead(ctx, cp2x, cp2y, toX, toY, stroke);

    const label = conn.condition || conn.label;
    if (label) {
      ctx.fillStyle = conn.condition ? "#d19a66" : "#8cc5f6";
      ctx.font = "10px Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, (fromX + toX) / 2, (fromY + toY) / 2 - 10);
      ctx.textAlign = "left";
    }
  }

  // 4. Sticky notes.
  for (const n of stickyNotes) {
    const nw = n.width || DEFAULT_SCREEN_WIDTH;
    const colors = STICKY_COLORS[n.color] || STICKY_COLORS.yellow;
    ctx.fillStyle = colors.bg;
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, n.x, n.y, nw, STICKY_NOTE_HEIGHT, 10);
    ctx.fill();
    ctx.stroke();
    if (n.content) {
      ctx.fillStyle = colors.text;
      ctx.font = "11px Menlo, monospace";
      const lines = String(n.content).split(/\n/);
      lines.forEach((line, i) => {
        const ty = n.y + 32 + i * 14;
        if (ty < n.y + STICKY_NOTE_HEIGHT - 6) ctx.fillText(line, n.x + 12, ty);
      });
    }
  }

  ctx.restore();
}

// ── Public entry points ──────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function timestamped(filename, ext) {
  const base = filename || DEFAULT_EXPORT_FILENAME;
  return `${base}-${Date.now()}.${ext}`;
}

/**
 * Exports the visible canvas as a high-resolution PNG and triggers a download.
 * Returns true on success, false when there is nothing to export.
 *
 * Options:
 *   screens, connections, stickyNotes, screenGroups — flow data
 *   selection      — canvas multi-selection [{type, id}], optional
 *   scopeScreenIds — Set of in-scope screen ids, optional
 *   filename       — base filename (no extension), defaults to "flow-export"
 *   padding        — empty space around content in canvas units, default 40
 *   pixelRatio     — pixel density multiplier, default 2 (Retina)
 */
export async function exportCanvasAsPng(opts) {
  const items = selectExportItems(opts);
  const bounds = computeExportBounds(items, opts.padding ?? 40);
  if (!bounds) return false;

  const requested = opts.pixelRatio ?? 2;
  // Hard cap so we don't allocate beyond browser canvas limits (~16384px on most engines).
  const MAX_DIM = 16384;
  let scale = requested;
  const maxAtScale = Math.max(bounds.width, bounds.height) * scale;
  if (maxAtScale > MAX_DIM) {
    scale = MAX_DIM / Math.max(bounds.width, bounds.height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bounds.width * scale);
  canvas.height = Math.round(bounds.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  await paintExportToContext(ctx, items, bounds);

  await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, timestamped(opts.filename, "png"));
      resolve();
    }, "image/png");
  });
  return true;
}

/**
 * Exports the visible canvas as an SVG document and triggers a download.
 * Returns true on success, false when there is nothing to export.
 *
 * Same options as exportCanvasAsPng (pixelRatio is ignored — SVG is vector).
 */
export async function exportCanvasAsSvg(opts) {
  const items = selectExportItems(opts);
  const bounds = computeExportBounds(items, opts.padding ?? 40);
  if (!bounds) return false;
  const svg = buildCanvasSvg({ ...items, bounds });
  if (!svg) return false;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, timestamped(opts.filename, "svg"));
  return true;
}

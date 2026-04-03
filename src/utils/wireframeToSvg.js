// Escape XML special characters for SVG text content
function escXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgRect(c) {
  const { x, y, width: w, height: h, style = {} } = c;
  const rx = style.borderRadius || 0;
  const fill = style.fill || "#f0f0f0";
  const stroke = style.stroke && style.stroke !== "none" ? style.stroke : "none";
  const strokeWidth = stroke !== "none" ? 1 : 0;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function svgText(c, overrideText, overrideX, overrideY, overrideFill) {
  const { x, y, width: w, height: h, style = {} } = c;
  const text = overrideText !== undefined ? overrideText : (c.text || "");
  if (!text) return "";
  const fontSize = style.fontSize || 13;
  const fontWeight = style.fontWeight === "bold" ? "bold" : "normal";
  const fill = overrideFill || "#333333";
  const textAlign = style.textAlign || "left";
  const cx = overrideX !== undefined ? overrideX : (textAlign === "center" ? x + w / 2 : x + 8);
  const cy = overrideY !== undefined ? overrideY : y + h / 2 + fontSize * 0.35;
  const anchor = textAlign === "center" ? "middle" : textAlign === "right" ? "end" : "start";
  return `<text x="${cx}" y="${cy}" font-family="Inter, -apple-system, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="auto">${escXml(text)}</text>`;
}

function renderRect(c) {
  return svgRect(c);
}

function renderText(c) {
  const { style = {} } = c;
  const fill = style.fill && style.fill !== "transparent" ? style.fill : "none";
  const bg = fill !== "none" ? `<rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" fill="${fill}"/>` : "";
  return bg + svgText(c, undefined, undefined, undefined, "#333333");
}

function renderButton(c) {
  const { x, y, width: w, height: h, text, style = {} } = c;
  const fill = style.fill || "#333333";
  const rx = style.borderRadius !== undefined ? style.borderRadius : 8;
  const textY = y + h / 2 + 5;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>` +
    `<text x="${x + w / 2}" y="${textY}" font-family="Inter, -apple-system, sans-serif" font-size="${style.fontSize || 14}" font-weight="bold" fill="#ffffff" text-anchor="middle">${escXml(text)}</text>`
  );
}

function renderInput(c) {
  const { x, y, width: w, height: h, text, style = {} } = c;
  const fill = style.fill || "#ffffff";
  const stroke = style.stroke || "#cccccc";
  const rx = style.borderRadius !== undefined ? style.borderRadius : 6;
  const textY = y + h / 2 + 5;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}" stroke="${stroke}" stroke-width="1"/>` +
    `<text x="${x + 12}" y="${textY}" font-family="Inter, -apple-system, sans-serif" font-size="${style.fontSize || 14}" fill="#aaaaaa">${escXml(text)}</text>`
  );
}

function renderIcon(c) {
  const { x, y, width: w, height: h, style = {} } = c;
  const fill = style.fill || "#cccccc";
  const rx = style.borderRadius !== undefined ? style.borderRadius : Math.min(w, h) / 4;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
}

function renderImagePlaceholder(c) {
  const { x, y, width: w, height: h, style = {} } = c;
  const fill = style.fill || "#e8e8e8";
  const stroke = style.stroke || "#cccccc";
  const rx = style.borderRadius || 4;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}" stroke="${stroke}" stroke-width="1"/>` +
    // Diagonal lines to indicate image placeholder
    `<line x1="${x + 8}" y1="${y + 8}" x2="${x + w - 8}" y2="${y + h - 8}" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<line x1="${x + w - 8}" y1="${y + 8}" x2="${x + 8}" y2="${y + h - 8}" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<text x="${cx}" y="${cy + 4}" font-family="Inter, -apple-system, sans-serif" font-size="11" fill="#999999" text-anchor="middle">${escXml(c.text || "Image")}</text>`
  );
}

function renderListItem(c) {
  const { x, y, width: w, height: h, text, style = {} } = c;
  const fill = style.fill || "#ffffff";
  const borderColor = style.stroke || "#eeeeee";
  const textY = y + h / 2 + 5;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>` +
    `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${borderColor}" stroke-width="1"/>` +
    `<text x="${x + 16}" y="${textY}" font-family="Inter, -apple-system, sans-serif" font-size="${style.fontSize || 14}" fill="#333333">${escXml(text)}</text>` +
    // Chevron
    `<polyline points="${x + w - 20},${y + h / 2 - 5} ${x + w - 12},${y + h / 2} ${x + w - 20},${y + h / 2 + 5}" fill="none" stroke="#cccccc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

function renderNavBar(c) {
  const { x, y, width: w, height: h, text, style = {} } = c;
  const fill = style.fill || "#ffffff";
  const borderColor = style.stroke || "#eeeeee";
  const textY = y + h / 2 + 6;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>` +
    `<line x1="${x}" y1="${y + h}" x2="${x + w}" y2="${y + h}" stroke="${borderColor}" stroke-width="1"/>` +
    `<text x="${x + w / 2}" y="${textY}" font-family="Inter, -apple-system, sans-serif" font-size="${style.fontSize || 17}" font-weight="bold" fill="#000000" text-anchor="middle">${escXml(text)}</text>`
  );
}

function renderTabBar(c) {
  const { x, y, width: w, height: h, text, style = {} } = c;
  const fill = style.fill || "#ffffff";
  const borderColor = style.stroke || "#eeeeee";
  const tabs = text ? text.split(",").map((t) => t.trim()) : ["Tab1", "Tab2", "Tab3"];
  const tabW = w / tabs.length;
  let content =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>` +
    `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${borderColor}" stroke-width="1"/>`;
  tabs.forEach((tab, i) => {
    const tabCx = x + tabW * i + tabW / 2;
    const isFirst = i === 0;
    const tabFill = isFirst ? "#007AFF" : "#8e8e93";
    // Icon dot
    content += `<circle cx="${tabCx}" cy="${y + 14}" r="6" fill="${tabFill}" opacity="0.3"/>`;
    // Label
    content += `<text x="${tabCx}" y="${y + 38}" font-family="Inter, -apple-system, sans-serif" font-size="${style.fontSize || 10}" fill="${tabFill}" text-anchor="middle">${escXml(tab)}</text>`;
  });
  return content;
}

function renderDivider(c) {
  const { x, y, width: w, style = {} } = c;
  const stroke = style.fill || "#cccccc";
  return `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${stroke}" stroke-width="1"/>`;
}

function renderComponent(c) {
  switch (c.type) {
    case "rect":               return renderRect(c);
    case "text":               return renderText(c);
    case "button":             return renderButton(c);
    case "input":              return renderInput(c);
    case "icon":               return renderIcon(c);
    case "image-placeholder":  return renderImagePlaceholder(c);
    case "list-item":          return renderListItem(c);
    case "nav-bar":            return renderNavBar(c);
    case "tab-bar":            return renderTabBar(c);
    case "divider":            return renderDivider(c);
    default:                   return renderRect(c);
  }
}

/**
 * Converts wireframe component data to an SVG string.
 * The SVG uses native vector elements (rect, text, line) that Figma imports
 * as editable layers when pasted from the clipboard.
 */
export function wireframeToSvg(wireframe) {
  if (!wireframe) return null;
  const { components = [], viewport = { width: 393, height: 852 } } = wireframe;
  const { width, height } = viewport;

  // White background
  let elements = `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
  for (const c of components) {
    elements += renderComponent(c);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${elements}</svg>`;
}

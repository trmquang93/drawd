import { wireframeToSvg } from "./wireframeToSvg";
import { DEFAULT_SCREEN_WIDTH } from "../constants";
import { downloadZip } from "./zipBuilder";

/**
 * Returns the SVG string for a screen, preferring Satori-generated SVG
 * (from MCP screens) over wireframe-generated SVG.
 */
export function getScreenSvg(screen) {
  if (screen.svgContent) return screen.svgContent;
  if (screen.wireframe) return wireframeToSvg(screen.wireframe);
  return null;
}

/**
 * Satori wraps linear-gradient backgrounds in <pattern patternUnits="objectBoundingBox">
 * elements to handle CSS gradient-to-SVG conversion. Figma's SVG importer does not
 * support pattern fills — elements using fill="url(#pattern...)" render as transparent.
 *
 * This function hoists each linearGradient out of its wrapping pattern into the top-level
 * <defs>, then replaces fill="url(#patternId)" with fill="url(#gradientId)" throughout.
 * The gradient coordinates are already in objectBoundingBox fractional form, which Figma
 * supports natively.
 */
function prepareSvgForFigma(svg) {
  const patternToGradient = {};
  const extractedGradients = [];
  const patternStringsToRemove = [];

  const patternRegex = /<pattern\s[^>]*>([\s\S]*?)<\/pattern>/g;
  let match;
  while ((match = patternRegex.exec(svg)) !== null) {
    const fullPattern = match[0];
    const content = match[1];

    const idMatch = fullPattern.match(/\bid="([^"]+)"/);
    if (!idMatch) continue;
    const patternId = idMatch[1];

    const gradMatch = content.match(/<linearGradient[\s\S]*?<\/linearGradient>/);
    if (!gradMatch) continue;

    const gradientEl = gradMatch[0];
    const gradIdMatch = gradientEl.match(/\bid="([^"]+)"/);
    if (!gradIdMatch) continue;

    const gradientId = gradIdMatch[1];
    patternToGradient[patternId] = gradientId;
    extractedGradients.push(gradientEl);
    patternStringsToRemove.push(fullPattern);
  }

  if (extractedGradients.length === 0) return svg;

  let result = svg;

  for (const [patternId, gradientId] of Object.entries(patternToGradient)) {
    result = result.split(`fill="url(#${patternId})"`).join(`fill="url(#${gradientId})"`);
  }

  for (const patternStr of patternStringsToRemove) {
    result = result.replace(patternStr, "");
  }

  const defsInsert = extractedGradients.join("");
  result = result.replace("<defs>", `<defs>${defsInsert}`);

  return result;
}

/**
 * Copies the screen SVG to the clipboard as text.
 * Figma accepts pasted SVG text and converts it to editable vector layers.
 * Returns true on success, false if no SVG available.
 */
export async function copyScreenForFigma(screen) {
  const svg = getScreenSvg(screen);
  if (!svg) return false;

  await navigator.clipboard.writeText(prepareSvgForFigma(svg));
  return true;
}

/**
 * Prefixes all IDs and their references within an SVG string.
 * Prevents ID collisions when multiple SVGs are merged into one document.
 */
function prefixSvgIds(svg, prefix) {
  const ids = [];
  const idRegex = /\bid="([^"]+)"/g;
  let m;
  while ((m = idRegex.exec(svg)) !== null) {
    ids.push(m[1]);
  }
  if (ids.length === 0) return svg;

  let result = svg;
  for (const id of ids) {
    const newId = `${prefix}${id}`;
    result = result.split(`id="${id}"`).join(`id="${newId}"`);
    result = result.split(`url(#${id})`).join(`url(#${newId})`);
    result = result.split(`href="#${id}"`).join(`href="#${newId}"`);
    result = result.split(`xlink:href="#${id}"`).join(`xlink:href="#${newId}"`);
  }
  return result;
}

/**
 * Copies multiple screen SVGs to the clipboard as a single combined SVG.
 * Screens are positioned relative to each other using their canvas coordinates.
 * Returns the number of screens copied, or false if none have SVG content.
 */
export async function copyScreensForFigma(screens) {
  const items = screens
    .map((screen, index) => {
      const rawSvg = getScreenSvg(screen);
      if (!rawSvg) return null;
      const prepared = prepareSvgForFigma(rawSvg);
      const prefixed = prefixSvgIds(prepared, `s${index}_`);
      return { screen, svg: prefixed };
    })
    .filter(Boolean);

  if (items.length === 0) return false;
  if (items.length === 1) {
    await navigator.clipboard.writeText(prepareSvgForFigma(getScreenSvg(items[0].screen)));
    return 1;
  }

  // Parse native SVG dimensions from each screen's viewBox
  const parsedItems = items.map(({ screen, svg }) => {
    const vbMatch = svg.match(/viewBox="([^"]+)"/);
    let svgW = screen.width || DEFAULT_SCREEN_WIDTH;
    let svgH = 600;
    if (vbMatch) {
      const parts = vbMatch[1].trim().split(/\s+/).map(Number);
      if (parts.length === 4) {
        svgW = parts[2] || svgW;
        svgH = parts[3] || svgH;
      }
    }
    return { screen, svg, svgW, svgH };
  });

  // Scale canvas positions into SVG space using the first screen's ratio
  const first = parsedItems[0];
  const scale = first.svgW / (first.screen.width || DEFAULT_SCREEN_WIDTH);
  const minX = Math.min(...parsedItems.map((i) => i.screen.x));
  const minY = Math.min(...parsedItems.map((i) => i.screen.y));

  let allDefs = "";
  let allGroups = "";

  for (const { screen, svg } of parsedItems) {
    const fx = (screen.x - minX) * scale;
    const fy = (screen.y - minY) * scale;

    // Hoist <defs> to top-level
    const defsMatches = svg.match(/<defs>([\s\S]*?)<\/defs>/g) || [];
    allDefs += defsMatches.map((d) => d.replace(/<\/?defs>/g, "")).join("");

    // Strip outer <svg> wrapper and defs, wrap content in a positioned group
    const body = svg
      .replace(/<svg[^>]*>/g, "")
      .replace(/<\/svg>\s*$/g, "")
      .replace(/<defs>[\s\S]*?<\/defs>/g, "");

    allGroups += `<g transform="translate(${fx}, ${fy})" data-screen="${screen.name || screen.id}">${body}</g>\n`;
  }

  const totalW = Math.max(...parsedItems.map((i) => (i.screen.x - minX) * scale + i.svgW));
  const totalH = Math.max(...parsedItems.map((i) => (i.screen.y - minY) * scale + i.svgH));

  const combined = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">`,
    `<defs>${allDefs}</defs>`,
    allGroups.trimEnd(),
    `</svg>`,
  ].join("\n");

  await navigator.clipboard.writeText(combined);
  return items.length;
}

/**
 * Downloads the screen as an SVG file.
 */
export function downloadScreenSvg(screen) {
  const svg = getScreenSvg(screen);
  if (!svg) return false;

  const blob = new Blob([prepareSvgForFigma(svg)], { type: "image/svg+xml" });
  downloadZip(blob, `${screen.name || "screen"}.svg`);
  return true;
}

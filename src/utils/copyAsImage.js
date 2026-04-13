import { wireframeToPng } from "./wireframeRenderer";
import { DEFAULT_SCREEN_WIDTH } from "../constants";

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Converts a screen to a drawable Image element, handling all content types.
 * Returns null if the screen has no visual content.
 */
async function screenToImage(screen) {
  if (screen.imageData) {
    return loadImage(screen.imageData);
  }
  if (screen.svgContent) {
    const encoded = btoa(unescape(encodeURIComponent(screen.svgContent)));
    return loadImage(`data:image/svg+xml;base64,${encoded}`);
  }
  if (screen.wireframe) {
    const dataUrl = await wireframeToPng(screen.wireframe);
    if (!dataUrl) return null;
    return loadImage(dataUrl);
  }
  return null;
}

/**
 * Copies one or more screens as a PNG image to the system clipboard.
 * For multiple screens, composes them into a single image preserving
 * their relative canvas positions.
 *
 * @param {Array} screens - Array of screen objects
 * @returns {Promise<number|false>} Count of screens copied, or false if nothing to copy
 */
export async function copyScreensAsImage(screens) {
  if (!screens.length) return false;

  // Load all screen images in parallel
  const entries = (
    await Promise.all(
      screens.map(async (s) => {
        const img = await screenToImage(s);
        return img ? { screen: s, img } : null;
      }),
    )
  ).filter(Boolean);

  if (!entries.length) return false;

  let canvas;

  if (entries.length === 1) {
    const { img } = entries[0];
    canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
  } else {
    // Determine scale: ratio of natural image pixels to canvas-display width
    const first = entries[0];
    const displayW = first.screen.width || DEFAULT_SCREEN_WIDTH;
    const scale = first.img.naturalWidth / displayW;

    // Bounding box in canvas coordinates
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { screen, img } of entries) {
      const w = screen.width || DEFAULT_SCREEN_WIDTH;
      const h = img.naturalHeight / (img.naturalWidth / w);
      minX = Math.min(minX, screen.x);
      minY = Math.min(minY, screen.y);
      maxX = Math.max(maxX, screen.x + w);
      maxY = Math.max(maxY, screen.y + h);
    }

    const totalW = Math.round((maxX - minX) * scale);
    const totalH = Math.round((maxY - minY) * scale);

    // Safety cap for very large compositions (16384 is common canvas limit)
    const maxDim = 16384;
    const capScale = Math.min(1, maxDim / Math.max(totalW, totalH));

    canvas = document.createElement("canvas");
    canvas.width = Math.round(totalW * capScale);
    canvas.height = Math.round(totalH * capScale);
    const ctx = canvas.getContext("2d");

    for (const { screen, img } of entries) {
      const dx = (screen.x - minX) * scale * capScale;
      const dy = (screen.y - minY) * scale * capScale;
      const dw = img.naturalWidth * capScale;
      const dh = img.naturalHeight * capScale;
      ctx.drawImage(img, dx, dy, dw, dh);
    }
  }

  const blob = await canvasToBlob(canvas);
  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);

  return entries.length;
}

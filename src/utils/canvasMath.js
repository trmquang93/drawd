import { MIN_HOTSPOT_SIZE, MIN_ZOOM, MAX_ZOOM } from "../constants";

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Converts drag start/end client positions + image rect to hotspot rect in percentages.
 * startClient: {x, y}, currentClient: {x, y}, imageAreaRect: {left, top, width, height}
 * returns: {x, y, w, h} all in 0-100 range, clamped, rounded to 1 decimal
 */
export function computeDrawRect(startClient, currentClient, imageAreaRect) {
  const startPctX = ((startClient.x - imageAreaRect.left) / imageAreaRect.width) * 100;
  const startPctY = ((startClient.y - imageAreaRect.top) / imageAreaRect.height) * 100;
  const curPctX = ((currentClient.x - imageAreaRect.left) / imageAreaRect.width) * 100;
  const curPctY = ((currentClient.y - imageAreaRect.top) / imageAreaRect.height) * 100;

  const x = Math.max(0, Math.min(100, Math.min(startPctX, curPctX)));
  const y = Math.max(0, Math.min(100, Math.min(startPctY, curPctY)));
  const x2 = Math.max(0, Math.min(100, Math.max(startPctX, curPctX)));
  const y2 = Math.max(0, Math.min(100, Math.max(startPctY, curPctY)));

  return {
    x: round1(x),
    y: round1(y),
    w: round1(x2 - x),
    h: round1(y2 - y),
  };
}

/**
 * Computes reposition of a hotspot given mouse drag delta.
 * dragStart: {clientX, clientY}, currentClient: {clientX, clientY}
 * imageRect: {width, height}, zoom: number
 * prevHotspot: {x, y, w, h} (percentages)
 * startPos: {x, y} (original position at drag start, percentages)
 * returns: {x, y} new position in percentages, clamped and rounded
 */
export function computeRepositionDelta(dragStart, currentClient, imageRect, zoom, prevHotspot, startPos) {
  const dxPx = (currentClient.clientX - dragStart.clientX) / zoom;
  const dyPx = (currentClient.clientY - dragStart.clientY) / zoom;
  const dxPct = (dxPx / imageRect.width) * 100;
  const dyPct = (dyPx / imageRect.height) * 100;

  let newX = startPos.x + dxPct;
  let newY = startPos.y + dyPct;
  newX = Math.max(0, Math.min(100 - prevHotspot.w, newX));
  newY = Math.max(0, Math.min(100 - prevHotspot.h, newY));

  return { x: round1(newX), y: round1(newY) };
}

/**
 * 8-direction resize of a hotspot.
 * handle: 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
 * dragStart: {clientX, clientY}, currentClient: {clientX, clientY}
 * imageRect: {width, height}, zoom: number
 * original: {x, y, w, h} (percentages at drag start)
 * returns: {x, y, w, h} in percentages, min 2% each dim, clamped to image bounds
 */
export function computeResize(handle, dragStart, currentClient, imageRect, zoom, original) {
  const dxPct = ((currentClient.clientX - dragStart.clientX) / zoom / imageRect.width) * 100;
  const dyPct = ((currentClient.clientY - dragStart.clientY) / zoom / imageRect.height) * 100;

  let { x, y, w, h } = original;

  if (handle.includes("e")) w = Math.max(MIN_HOTSPOT_SIZE, Math.min(100 - x, original.w + dxPct));
  if (handle.includes("w")) {
    const dx = Math.min(dxPct, original.w - MIN_HOTSPOT_SIZE);
    const clampedDx = Math.max(-original.x, dx);
    x = original.x + clampedDx;
    w = original.w - clampedDx;
  }
  if (handle.includes("s")) h = Math.max(MIN_HOTSPOT_SIZE, Math.min(100 - y, original.h + dyPct));
  if (handle.includes("n")) {
    const dy = Math.min(dyPct, original.h - MIN_HOTSPOT_SIZE);
    const clampedDy = Math.max(-original.y, dy);
    y = original.y + clampedDy;
    h = original.h - clampedDy;
  }

  return { x: round1(x), y: round1(y), w: round1(w), h: round1(h) };
}

/**
 * Rect-rect intersection test for rubber-band selection.
 * a, b: {x, y, width, height} in world coordinates
 * returns: boolean
 */
export function rectsIntersect(a, b) {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

/**
 * Returns the bounding box {x, y, width, height} of a screen node in world coordinates.
 * screen: {x, y, width, imageHeight}
 * headerHeight: number (pixel height of the header bar)
 */
export function screenBounds(screen, headerHeight) {
  return {
    x: screen.x,
    y: screen.y,
    width: screen.width || 220,
    height: (screen.imageHeight || 120) + headerHeight,
  };
}

/**
 * Returns the bounding box {x, y, width, height} of a sticky note in world coordinates.
 * note: {x, y, width}
 */
export function stickyBounds(note) {
  return {
    x: note.x,
    y: note.y,
    width: note.width || 220,
    height: 120,
  };
}

/**
 * Hit test: is (mouseX, mouseY) inside a screen node?
 * mouseX/Y are canvas coordinates (already adjusted for pan/zoom)
 * screen: {x, y, width, imageHeight}
 * headerHeight: number (pixel height of the screen's header bar)
 * returns: boolean
 */
export function hitTestScreen(mouseX, mouseY, screen, headerHeight) {
  const sw = screen.width || 220;
  const sh = (screen.imageHeight || 120) + headerHeight;
  return mouseX >= screen.x && mouseX <= screen.x + sw && mouseY >= screen.y && mouseY <= screen.y + sh;
}

/**
 * Converts world coordinates to percentage position within a target screen's image area.
 * Accounts for header and border offsets so the result aligns with hotspot coordinate space.
 * Returns unclamped values — caller is responsible for clamping with hotspot w/h.
 */
export function worldToScreenPct(worldX, worldY, screen, headerHeight, borderWidth) {
  const imgLeft = screen.x + borderWidth;
  const imgTop = screen.y + headerHeight + borderWidth;
  const imgW = screen.width || 220;
  const imgH = screen.imageHeight || 120;
  const pctX = ((worldX - imgLeft) / imgW) * 100;
  const pctY = ((worldY - imgTop) / imgH) * 100;
  return { x: Math.round(pctX * 10) / 10, y: Math.round(pctY * 10) / 10 };
}

/**
 * Computes new zoom level and pan after wheel zoom toward cursor.
 * prevZoom: number, delta: number (positive=zoom in, negative=zoom out)
 * mouseX/Y: cursor position in viewport pixels (relative to canvas element)
 * currentPan: {x, y}
 * returns: {zoom, pan} where zoom is clamped to [0.2, 2.0]
 */
export function zoomTowardCursor(prevZoom, delta, mouseX, mouseY, currentPan) {
  const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom + delta));
  const scale = newZoom / prevZoom;
  return {
    zoom: newZoom,
    pan: {
      x: mouseX - (mouseX - currentPan.x) * scale,
      y: mouseY - (mouseY - currentPan.y) * scale,
    },
  };
}

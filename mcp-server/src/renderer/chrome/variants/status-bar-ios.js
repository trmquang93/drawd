import { getBounds } from "../geometry.js";
import { SIGNAL_BARS_SVG, WIFI_SVG, BATTERY_SVG } from "../glyphs.js";

// iOS status bar.
//
// Layout (within the 393×54 bar at the top of the iPhone viewport):
//   - "9:41" time label, left-aligned, vertically centered
//   - Right cluster (signal | wifi | battery), right-aligned with ~12px gaps
//   - The Dynamic Island sits in the center; this bar leaves room for it by
//     concentrating glyphs on the left/right edges, never the middle.
//
// Safe-area contribution: top: 54.
// Combined with dynamic-island (top: 59), max-by-edge gives top: 59.

const PALETTE = {
  light: { fg: "#000000" },
  dark: { fg: "#ffffff" },
};

export const statusBarIos = {
  id: "status-bar-ios",
  appliesTo: ["iphone"],
  conflicts: ["status-bar-android"],

  bounds: ({ device }) => getBounds("status-bar-ios", device),

  safeArea: () => ({ top: 54 }),

  render: ({ device, chromeStyle }) => {
    const { x, y, w } = getBounds("status-bar-ios", device);
    const palette = PALETTE[chromeStyle] ?? PALETTE.light;
    const fg = palette.fg;

    // Right cluster anchored to (right edge - 16px); battery rightmost.
    const rightEdge = x + w - 16;
    const batteryX = rightEdge - 24;     // 24 = battery width
    const wifiX = batteryX - 22;         // 16 (wifi w) + 6 (gap)
    const signalX = wifiX - 24;          // 18 (signal w) + 6 (gap)

    return `
      <g id="chrome-status-bar-ios">
        <text x="${x + 32}" y="${y + 33}" font-family="Inter" font-weight="700" font-size="17" fill="${fg}">9:41</text>
        <g transform="translate(${signalX}, ${y + 21})" fill="${fg}">${SIGNAL_BARS_SVG}</g>
        <g transform="translate(${wifiX}, ${y + 20})" fill="${fg}" stroke="${fg}">${WIFI_SVG}</g>
        <g transform="translate(${batteryX}, ${y + 21})" fill="${fg}" stroke="${fg}">${BATTERY_SVG}</g>
      </g>
    `;
  },
};

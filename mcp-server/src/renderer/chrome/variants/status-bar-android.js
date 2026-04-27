import { getBounds } from "../geometry.js";
import { SIGNAL_BARS_SVG, WIFI_SVG, BATTERY_SVG } from "../glyphs.js";

// Android status bar (Material 3-ish).
//
// Layout (within the 412×36 bar at the top of the Android viewport):
//   - "9:41" time label, left-aligned at 24px, vertically centered
//   - Right cluster (signal | wifi | battery), right-aligned with ~6px gaps
//
// Safe-area contribution: top: 36.

const PALETTE = {
  light: { fg: "#000000" },
  dark: { fg: "#ffffff" },
};

export const statusBarAndroid = {
  id: "status-bar-android",
  appliesTo: ["android"],
  conflicts: ["status-bar-ios"],

  bounds: ({ device }) => getBounds("status-bar-android", device),

  safeArea: () => ({ top: 36 }),

  render: ({ device, chromeStyle }) => {
    const { x, y, w } = getBounds("status-bar-android", device);
    const palette = PALETTE[chromeStyle] ?? PALETTE.light;
    const fg = palette.fg;

    const rightEdge = x + w - 16;
    const batteryX = rightEdge - 24;
    const wifiX = batteryX - 22;
    const signalX = wifiX - 24;

    return `
      <g id="chrome-status-bar-android">
        <text x="${x + 24}" y="${y + 22}" font-family="Inter" font-weight="700" font-size="14" fill="${fg}">9:41</text>
        <g transform="translate(${signalX}, ${y + 12})" fill="${fg}">${SIGNAL_BARS_SVG}</g>
        <g transform="translate(${wifiX}, ${y + 11})" fill="${fg}" stroke="${fg}">${WIFI_SVG}</g>
        <g transform="translate(${batteryX}, ${y + 12})" fill="${fg}" stroke="${fg}">${BATTERY_SVG}</g>
      </g>
    `;
  },
};

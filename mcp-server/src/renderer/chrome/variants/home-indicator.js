import { getBounds } from "../geometry.js";

// iOS home indicator.
//
// Thin pill at the bottom edge of the iPhone viewport (the "swipe-up" bar).
// Color follows chromeStyle: black on light backgrounds, white on dark.
//
// Safe-area contribution: bottom: 34. (Apple's published bottom safe-area
// for modern Pro-class iPhones — designed to keep tappable UI clear of the
// home gesture region, not just the indicator itself.)

const PALETTE = {
  light: { fg: "#000000" },
  dark: { fg: "#ffffff" },
};

export const homeIndicator = {
  id: "home-indicator",
  appliesTo: ["iphone"],
  conflicts: [],

  bounds: ({ device }) => getBounds("home-indicator", device),

  safeArea: () => ({ bottom: 34 }),

  render: ({ device, chromeStyle }) => {
    const { x, y, w, h } = getBounds("home-indicator", device);
    const palette = PALETTE[chromeStyle] ?? PALETTE.light;
    const r = h / 2;
    return `
      <g id="chrome-home-indicator">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${palette.fg}"/>
      </g>
    `;
  },
};

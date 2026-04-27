import { getBounds } from "../geometry.js";

// Android gesture-navigation pill.
//
// Thin pill at the bottom of the Android viewport (the gesture nav handle).
// Color follows chromeStyle.
//
// Safe-area contribution: bottom: 16. (Material guidance for systems using
// gesture nav: keep interactive UI ~16dp clear of the pill.)

const PALETTE = {
  light: { fg: "#000000" },
  dark: { fg: "#ffffff" },
};

export const androidGesturePill = {
  id: "android-gesture-pill",
  appliesTo: ["android"],
  conflicts: [],

  bounds: ({ device }) => getBounds("android-gesture-pill", device),

  safeArea: () => ({ bottom: 16 }),

  render: ({ device, chromeStyle }) => {
    const { x, y, w, h } = getBounds("android-gesture-pill", device);
    const palette = PALETTE[chromeStyle] ?? PALETTE.light;
    const r = h / 2;
    return `
      <g id="chrome-android-gesture-pill">
        <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="${palette.fg}"/>
      </g>
    `;
  },
};

// Inline SVG glyph paths for status-bar icons.
//
// These intentionally do NOT depend on any glyph font: Resvg can rasterize
// system fonts inconsistently across platforms. Geometric primitives (rect,
// circle, path with arcs) are guaranteed to render identically everywhere.
//
// Each glyph is drawn relative to its own local origin (0,0). Callers wrap
// the fragment in a <g transform="translate(x,y)"> to position it.
//
// Color is set by the parent group's `fill` / `stroke` attributes; nothing
// here should hardcode a color.

// 4 ascending signal bars in an 18×12 box.
export const SIGNAL_BARS_SVG = `
  <rect x="0"  y="9" width="3" height="3" rx="0.5"/>
  <rect x="5"  y="6" width="3" height="6" rx="0.5"/>
  <rect x="10" y="3" width="3" height="9" rx="0.5"/>
  <rect x="15" y="0" width="3" height="12" rx="0.5"/>
`;

// WiFi: three concentric arcs over a dot, in a 16×13 box.
// Stroke uses currentColor so it inherits the parent group's fill.
export const WIFI_SVG = `
  <g fill="none" stroke-width="1.6" stroke-linecap="round">
    <path d="M1 5 A8 8 0 0 1 15 5"/>
    <path d="M3.5 7.5 A5 5 0 0 1 12.5 7.5"/>
    <path d="M5.8 9.8 A2.5 2.5 0 0 1 10.2 9.8"/>
  </g>
  <circle cx="8" cy="11.5" r="1"/>
`;

// Battery: rounded body (50% opacity outline) + tip + interior fill, 24×11.
export const BATTERY_SVG = `
  <rect x="0" y="0" width="22" height="11" rx="2.5" ry="2.5" fill="none" stroke-width="1" opacity="0.5"/>
  <rect x="22.5" y="3.5" width="1.5" height="4" rx="0.7"/>
  <rect x="1.5" y="1.5" width="19" height="8" rx="1.5"/>
`;

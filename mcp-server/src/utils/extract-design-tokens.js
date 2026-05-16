/**
 * extract-design-tokens.js
 *
 * Parses inline CSS from screen HTML and extracts dominant design tokens
 * (colors, typography, radii, spacing) ranked by per-screen frequency.
 *
 * Heuristics for color categorization:
 * - background: values from `background-color` or `background` (solid) on root/large containers
 * - surface: values from `background-color` on nested containers (cards, inputs, modals)
 * - text: values from `color` property
 * - accent: colors that appear in fewer screens but are not text/background
 *           (buttons, links, badges, borders, icons)
 *
 * Since Drawd HTML uses inline styles exclusively (Satori renderer), we can
 * extract values with a lightweight regex approach — no full CSS parser needed.
 */

// ── Regex helpers ────────────────────────────────────────────────────────────

// Match style="..." attribute values
const STYLE_ATTR_RE = /style="([^"]*)"/gi;

// Individual CSS property extractors (from inline style strings)
const COLOR_RE = /(?:^|;\s*)color\s*:\s*([^;]+)/gi;
const BG_COLOR_RE = /(?:^|;\s*)background-color\s*:\s*([^;]+)/gi;
const BG_SHORTHAND_RE = /(?:^|;\s*)background\s*:\s*([^;]+)/gi;
const FONT_FAMILY_RE = /(?:^|;\s*)font-family\s*:\s*([^;]+)/gi;
const FONT_SIZE_RE = /(?:^|;\s*)font-size\s*:\s*([^;]+)/gi;
const BORDER_RADIUS_RE = /(?:^|;\s*)border-radius\s*:\s*([^;]+)/gi;
const PADDING_RE = /(?:^|;\s*)padding\s*:\s*([^;]+)/gi;
const MARGIN_RE = /(?:^|;\s*)margin\s*:\s*([^;]+)/gi;
const GAP_RE = /(?:^|;\s*)gap\s*:\s*([^;]+)/gi;
const BORDER_COLOR_RE = /(?:^|;\s*)border(?:-(?:top|right|bottom|left))?-color\s*:\s*([^;]+)/gi;
const BORDER_SHORTHAND_RE = /(?:^|;\s*)border(?:-(?:top|right|bottom|left))?\s*:\s*(\d[^;]*)/gi;

// Color value pattern — hex, rgb, rgba, hsl, hsla, named
const HEX_RE = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*(?:[/,]\s*[\d.]+%?\s*)?\)$/i;
const HSL_RE = /^hsla?\(\s*[\d.]+\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*(?:[/,]\s*[\d.]+%?\s*)?\)$/i;

const NAMED_COLORS = new Set([
  "black", "white", "red", "green", "blue", "yellow", "orange", "purple",
  "pink", "gray", "grey", "cyan", "magenta", "brown", "transparent",
]);

function isColorValue(val) {
  const v = val.trim().toLowerCase();
  return HEX_RE.test(v) || RGB_RE.test(v) || HSL_RE.test(v) || NAMED_COLORS.has(v);
}

// ── Normalization ────────────────────────────────────────────────────────────

/** Normalize a hex color to 6-digit lowercase. */
function normalizeHex(hex) {
  let h = hex.trim().toLowerCase();
  if (h.length === 4) {
    // #abc -> #aabbcc
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  } else if (h.length === 5) {
    // #abcd -> #aabbccdd
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}${h[4]}${h[4]}`;
  }
  // Strip alpha from 8-digit hex if fully opaque
  if (h.length === 9 && h.endsWith("ff")) {
    h = h.slice(0, 7);
  }
  return h;
}

/** Normalize a color value to a canonical form for deduplication. */
function normalizeColor(val) {
  const v = val.trim();
  if (HEX_RE.test(v)) return normalizeHex(v);
  // For rgb/hsl, normalize whitespace
  return v.toLowerCase().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
}

/** Parse a numeric px/rem/em value, returning the number (in px) or null. */
function parseNumericValue(val) {
  const v = val.trim();
  const pxMatch = v.match(/^([\d.]+)\s*px$/i);
  if (pxMatch) return parseFloat(pxMatch[1]);
  const remMatch = v.match(/^([\d.]+)\s*rem$/i);
  if (remMatch) return parseFloat(remMatch[1]) * 16;
  const emMatch = v.match(/^([\d.]+)\s*em$/i);
  if (emMatch) return parseFloat(emMatch[1]) * 16;
  const bare = v.match(/^([\d.]+)$/);
  if (bare) return parseFloat(bare[1]);
  return null;
}

/** Extract individual spacing values from shorthand (e.g., "8px 16px" -> [8, 16]). */
function parseSpacingShorthand(val) {
  const parts = val.trim().split(/\s+/);
  const nums = [];
  for (const p of parts) {
    const n = parseNumericValue(p);
    if (n !== null && n > 0) nums.push(n);
  }
  return nums;
}

/** Extract individual border-radius values from shorthand. */
function parseRadiusShorthand(val) {
  // Handle slash syntax for elliptical radii (e.g., "10px / 20px") — take first half
  const slashIdx = val.indexOf("/");
  const effective = slashIdx >= 0 ? val.slice(0, slashIdx) : val;
  return parseSpacingShorthand(effective);
}

/** Extract a solid color from a `background` shorthand, ignoring gradients etc. */
function extractBgColor(val) {
  const v = val.trim();
  // Skip gradients/images
  if (v.includes("gradient") || v.includes("url(")) return null;
  // Try to find a color value in the shorthand
  if (isColorValue(v)) return v;
  // Check if it starts with a hex
  const hexMatch = v.match(/#(?:[0-9a-f]{3,8})\b/i);
  if (hexMatch) return hexMatch[0];
  // Check for rgb/rgba
  const rgbMatch = v.match(/rgba?\([^)]+\)/i);
  if (rgbMatch) return rgbMatch[0];
  return null;
}

/** Extract a color from a `border` shorthand like "1px solid #333". */
function extractBorderColor(val) {
  const hexMatch = val.match(/#(?:[0-9a-f]{3,8})\b/i);
  if (hexMatch) return hexMatch[0];
  const rgbMatch = val.match(/rgba?\([^)]+\)/i);
  if (rgbMatch) return rgbMatch[0];
  return null;
}

// ── Per-screen extraction ────────────────────────────────────────────────────

/**
 * Extract all design tokens from a single screen's HTML.
 * Returns raw token sets (not yet ranked).
 */
function extractFromHtml(html) {
  const tokens = {
    textColors: new Set(),
    bgColors: new Set(),
    accentColors: new Set(),
    fontFamilies: new Set(),
    fontSizes: new Set(),
    radii: new Set(),
    spacing: new Set(),
  };

  let match;

  // Collect all style attribute contents
  const styles = [];
  STYLE_ATTR_RE.lastIndex = 0;
  while ((match = STYLE_ATTR_RE.exec(html)) !== null) {
    styles.push(match[1]);
  }

  for (const style of styles) {
    // Text colors
    COLOR_RE.lastIndex = 0;
    while ((match = COLOR_RE.exec(style)) !== null) {
      const val = match[1].trim();
      if (isColorValue(val)) tokens.textColors.add(normalizeColor(val));
    }

    // Background colors
    BG_COLOR_RE.lastIndex = 0;
    while ((match = BG_COLOR_RE.exec(style)) !== null) {
      const val = match[1].trim();
      if (isColorValue(val)) tokens.bgColors.add(normalizeColor(val));
    }

    // Background shorthand
    BG_SHORTHAND_RE.lastIndex = 0;
    while ((match = BG_SHORTHAND_RE.exec(style)) !== null) {
      const color = extractBgColor(match[1]);
      if (color) tokens.bgColors.add(normalizeColor(color));
    }

    // Border colors -> accent
    BORDER_COLOR_RE.lastIndex = 0;
    while ((match = BORDER_COLOR_RE.exec(style)) !== null) {
      const val = match[1].trim();
      if (isColorValue(val)) tokens.accentColors.add(normalizeColor(val));
    }

    BORDER_SHORTHAND_RE.lastIndex = 0;
    while ((match = BORDER_SHORTHAND_RE.exec(style)) !== null) {
      const color = extractBorderColor(match[1]);
      if (color) tokens.accentColors.add(normalizeColor(color));
    }

    // Font families
    FONT_FAMILY_RE.lastIndex = 0;
    while ((match = FONT_FAMILY_RE.exec(style)) !== null) {
      // Split by comma and clean each family name
      const families = match[1].split(",").map((f) =>
        f.trim().replace(/^["']|["']$/g, "")
      ).filter(Boolean);
      for (const f of families) {
        tokens.fontFamilies.add(f);
      }
    }

    // Font sizes
    FONT_SIZE_RE.lastIndex = 0;
    while ((match = FONT_SIZE_RE.exec(style)) !== null) {
      const n = parseNumericValue(match[1]);
      if (n !== null && n > 0) tokens.fontSizes.add(n);
    }

    // Border radius
    BORDER_RADIUS_RE.lastIndex = 0;
    while ((match = BORDER_RADIUS_RE.exec(style)) !== null) {
      for (const r of parseRadiusShorthand(match[1])) {
        tokens.radii.add(r);
      }
    }

    // Spacing: padding
    PADDING_RE.lastIndex = 0;
    while ((match = PADDING_RE.exec(style)) !== null) {
      for (const s of parseSpacingShorthand(match[1])) {
        tokens.spacing.add(s);
      }
    }

    // Spacing: margin
    MARGIN_RE.lastIndex = 0;
    while ((match = MARGIN_RE.exec(style)) !== null) {
      for (const s of parseSpacingShorthand(match[1])) {
        tokens.spacing.add(s);
      }
    }

    // Spacing: gap
    GAP_RE.lastIndex = 0;
    while ((match = GAP_RE.exec(style)) !== null) {
      for (const s of parseSpacingShorthand(match[1])) {
        tokens.spacing.add(s);
      }
    }
  }

  return tokens;
}

// ── Cross-screen aggregation ─────────────────────────────────────────────────

/**
 * Aggregate tokens across screens, ranking by number of screens each token appears in.
 * Returns the final design-tokens response shape.
 *
 * Color categorization heuristic:
 * - "background": background colors appearing on 50%+ of screens
 * - "surface": background colors appearing on fewer screens (cards, modals)
 * - "text": text (color property) values
 * - "accent": border colors, plus background colors that appear on only 1 screen
 *             and any text color that appears on only 1 screen and looks non-gray
 */
export function extractDesignTokens(screens) {
  if (!screens || screens.length === 0) {
    return {
      colors: { background: [], surface: [], text: [], accent: [] },
      typography: { fontFamilies: [], sizes: [] },
      radii: [],
      spacing: [],
    };
  }

  // Per-screen token extraction
  const perScreen = [];
  for (const screen of screens) {
    if (!screen.sourceHtml) continue;
    perScreen.push(extractFromHtml(screen.sourceHtml));
  }

  if (perScreen.length === 0) {
    return {
      colors: { background: [], surface: [], text: [], accent: [] },
      typography: { fontFamilies: [], sizes: [] },
      radii: [],
      spacing: [],
    };
  }

  const totalScreens = perScreen.length;
  const bgThreshold = totalScreens * 0.5;

  // Count per-screen frequency for each token type
  const bgFreq = countFrequency(perScreen, "bgColors");
  const textFreq = countFrequency(perScreen, "textColors");
  const accentFreq = countFrequency(perScreen, "accentColors");
  const fontFamilyFreq = countFrequency(perScreen, "fontFamilies");
  const fontSizeFreq = countFrequency(perScreen, "fontSizes");
  const radiiFreq = countFrequency(perScreen, "radii");
  const spacingFreq = countFrequency(perScreen, "spacing");

  // Categorize background colors
  const backgroundColors = [];
  const surfaceColors = [];
  for (const [color, freq] of sortByFrequency(bgFreq)) {
    if (freq >= bgThreshold) {
      backgroundColors.push(color);
    } else {
      surfaceColors.push(color);
    }
  }

  // Text colors ranked by frequency
  const textColors = sortByFrequency(textFreq).map(([c]) => c);

  // Accent colors: explicit border/accent colors + surface colors appearing on only 1 screen
  const accentColors = sortByFrequency(accentFreq).map(([c]) => c);

  // Deduplicate: remove accent colors that already appear in background/surface/text
  const usedColors = new Set([...backgroundColors, ...surfaceColors, ...textColors]);
  const uniqueAccent = accentColors.filter((c) => !usedColors.has(c));

  // Typography
  const fontFamilies = sortByFrequency(fontFamilyFreq).map(([f]) => f);
  const sizes = sortByFrequency(fontSizeFreq).map(([s]) => Number(s));

  // Radii & spacing — sorted numerically, deduplicated
  const radii = sortByFrequency(radiiFreq).map(([r]) => Number(r));
  const spacing = sortByFrequency(spacingFreq).map(([s]) => Number(s));

  return {
    colors: {
      background: backgroundColors,
      surface: surfaceColors,
      text: textColors,
      accent: uniqueAccent,
    },
    typography: {
      fontFamilies,
      sizes: [...new Set(sizes)].sort((a, b) => a - b),
    },
    radii: [...new Set(radii)].sort((a, b) => a - b),
    spacing: [...new Set(spacing)].sort((a, b) => a - b),
  };
}

// ── Frequency helpers ────────────────────────────────────────────────────────

/** Count how many screens each token appears in. */
function countFrequency(perScreen, field) {
  const freq = new Map();
  for (const tokens of perScreen) {
    for (const val of tokens[field]) {
      const key = String(val);
      freq.set(key, (freq.get(key) || 0) + 1);
    }
  }
  return freq;
}

/** Sort a frequency map by descending count, then alphabetically. */
function sortByFrequency(freq) {
  return [...freq.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return String(a[0]).localeCompare(String(b[0]));
  });
}

// Export internals for testing
export const _internal = {
  extractFromHtml,
  normalizeColor,
  parseNumericValue,
  parseSpacingShorthand,
  parseRadiusShorthand,
};

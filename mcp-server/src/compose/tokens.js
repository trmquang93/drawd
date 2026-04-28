// Default iOS-inspired design tokens for compose blocks.
// Callers can override any subset via the `tokens` parameter.

export const DEFAULT_TOKENS = Object.freeze({
  primary: "#007AFF",
  primaryText: "#FFFFFF",
  secondary: "transparent",
  secondaryText: "#007AFF",
  secondaryBorder: "#007AFF",
  destructive: "#FF3B30",
  destructiveText: "#FFFFFF",
  text: "#000000",
  textSecondary: "#8E8E93",
  background: "#FFFFFF",
  cardBackground: "#FFFFFF",
  separator: "#C6C6C8",
  sectionHeader: "#8E8E93",
  radius: 12,
  fontFamily: "Inter, sans-serif",
});

export function mergeTokens(custom) {
  return custom ? { ...DEFAULT_TOKENS, ...custom } : DEFAULT_TOKENS;
}

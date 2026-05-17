import { extractDesignTokens } from "../utils/extract-design-tokens.js";

export const designTokenTools = [
  {
    name: "get_design_tokens",
    description:
      "Extract the dominant design tokens (colors, typography, border radii, spacing) from the current flow's screen HTML. " +
      "Tokens are ranked by per-screen frequency — a color used on 8 of 10 screens ranks higher than one on 2. " +
      "Use this before creating new screens to ensure visual consistency with the existing flow. " +
      "Colors are categorized into background (dominant bg), surface (cards/modals bg), text, and accent (borders, highlights).",
    inputSchema: {
      type: "object",
      properties: {
        scopeRoot: {
          type: "string",
          description:
            "Screen group ID to scope the analysis to. Only screens in this group are considered.",
        },
        screenIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Explicit list of screen IDs to analyze. Takes precedence over scopeRoot.",
        },
      },
    },
  },
];

export function handleDesignTokenTool(name, args, state) {
  switch (name) {
    case "get_design_tokens": {
      let screens = state.screens;

      // Filter by screenIds if provided
      if (args.screenIds && args.screenIds.length > 0) {
        const idSet = new Set(args.screenIds);
        screens = screens.filter((s) => idSet.has(s.id));
        if (screens.length === 0) {
          throw new Error("No screens matched the provided screenIds.");
        }
      } else if (args.scopeRoot) {
        // Filter by screen group
        const group = state.screenGroups.find((g) => g.id === args.scopeRoot);
        if (!group) {
          throw new Error(`Screen group not found: ${args.scopeRoot}`);
        }
        const idSet = new Set(group.screenIds);
        screens = screens.filter((s) => idSet.has(s.id));
        if (screens.length === 0) {
          throw new Error(
            `Screen group "${group.name}" contains no screens.`
          );
        }
      }

      const tokens = extractDesignTokens(screens);
      const screensWithHtml = screens.filter((s) => s.sourceHtml);

      return {
        ...tokens,
        _meta: {
          screensAnalyzed: screensWithHtml.length,
          screensTotal: screens.length,
          screensSkipped: screens.length - screensWithHtml.length,
        },
      };
    }

    default:
      throw new Error(`Unknown design-token tool: ${name}`);
  }
}

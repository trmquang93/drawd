const accessibilitySchema = {
  type: "object",
  properties: {
    label: { type: "string", description: "Accessibility label (VoiceOver/TalkBack)" },
    role: {
      type: "string",
      enum: ["button", "link", "image", "heading", "text", "search-field",
             "toggle", "slider", "tab", "alert", "menu", "other"],
    },
    hint: { type: "string", description: "Usage hint (e.g. 'Double tap to sign in')" },
    traits: {
      type: "array",
      items: {
        type: "string",
        enum: ["selected", "disabled", "adjustable", "header", "summary",
               "plays-sound", "starts-media", "allows-direct-interaction"],
      },
    },
  },
  description: "Accessibility annotations for screen readers",
};

export const hotspotTools = [
  {
    name: "create_hotspot",
    description: "Add a hotspot (tap area) to a screen. Coordinates are percentages (0-100) of the screen image dimensions. If action is 'navigate' or 'modal' and targetScreenId is provided, a connection is automatically created.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen to add the hotspot to" },
        label: { type: "string", description: "Hotspot label (e.g., 'Login Button', 'Profile Tab')" },
        elementType: {
          type: "string",
          enum: ["button", "text-input", "toggle", "card", "icon", "link", "image", "tab", "list-item", "other"],
          description: "Type of UI element (default: 'button')",
        },
        x: { type: "number", description: "X position as percentage (0-100) of image width" },
        y: { type: "number", description: "Y position as percentage (0-100) of image height" },
        w: { type: "number", description: "Width as percentage (0-100) of image width" },
        h: { type: "number", description: "Height as percentage (0-100) of image height" },
        action: {
          type: "string",
          enum: ["navigate", "back", "modal", "conditional", "api", "custom"],
          description: "What happens when this hotspot is tapped",
        },
        targetScreenId: { type: "string", description: "Target screen ID for navigate/modal actions" },
        apiEndpoint: { type: "string", description: "API endpoint for 'api' action (e.g., '/api/login')" },
        apiMethod: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"], description: "HTTP method for 'api' action" },
        customDescription: { type: "string", description: "Free-text description for 'custom' action" },
        documentId: { type: "string", description: "Reference to a project document (for API docs)" },
        conditions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              targetScreenId: { type: "string" },
            },
          },
          description: "Condition branches for 'conditional' action",
        },
        onSuccessAction: { type: "string", enum: ["navigate", "back", "modal", "custom", ""] },
        onSuccessTargetId: { type: "string" },
        onSuccessCustomDesc: { type: "string" },
        onErrorAction: { type: "string", enum: ["navigate", "back", "modal", "custom", ""] },
        onErrorTargetId: { type: "string" },
        onErrorCustomDesc: { type: "string" },
        accessibility: accessibilitySchema,
      },
      required: ["screenId", "label", "x", "y", "w", "h", "action"],
    },
  },
  {
    name: "update_hotspot",
    description: "Update properties of an existing hotspot.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string" },
        hotspotId: { type: "string" },
        label: { type: "string" },
        elementType: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        w: { type: "number" },
        h: { type: "number" },
        action: { type: "string" },
        targetScreenId: { type: "string" },
        apiEndpoint: { type: "string" },
        apiMethod: { type: "string" },
        customDescription: { type: "string" },
        accessibility: accessibilitySchema,
      },
      required: ["screenId", "hotspotId"],
    },
  },
  {
    name: "delete_hotspot",
    description: "Remove a hotspot from a screen. Also removes any associated connections.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string" },
        hotspotId: { type: "string" },
      },
      required: ["screenId", "hotspotId"],
    },
  },
  {
    name: "list_hotspots",
    description: "List all hotspots on a specific screen.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen" },
      },
      required: ["screenId"],
    },
  },
];

export function handleHotspotTool(name, args, state) {
  switch (name) {
    case "create_hotspot": {
      const { screenId, ...hotspotData } = args;
      const hs = state.addHotspot(screenId, hotspotData);
      return { hotspotId: hs.id, screenId };
    }

    case "update_hotspot": {
      const { screenId, hotspotId, ...updates } = args;
      const hs = state.updateHotspot(screenId, hotspotId, updates);
      return { success: true, hotspotId: hs.id };
    }

    case "delete_hotspot": {
      state.deleteHotspot(args.screenId, args.hotspotId);
      return { success: true };
    }

    case "list_hotspots": {
      const screen = state.getScreen(args.screenId);
      if (!screen) throw new Error(`Screen not found: ${args.screenId}`);
      return { hotspots: screen.hotspots || [] };
    }

    default:
      throw new Error(`Unknown hotspot tool: ${name}`);
  }
}

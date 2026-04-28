import { handleScreenTool } from "./screen-tools.js";
import { SUPPORTED_DEVICES } from "../renderer/chrome/index.js";

// ── Placeholder resolution ─────────────────────────────────────────────────
function resolveTarget(target, selfId, callerId) {
  if (!target) return null;
  if (target === "@self") return selfId;
  if (target === "@caller") {
    if (!callerId) {
      throw new Error(
        "callerScreenId is required when @caller placeholder is used in hotspots or connections",
      );
    }
    return callerId;
  }
  return target; // literal screen ID
}

function usesPlaceholder(value, placeholder) {
  return value === placeholder;
}

// ── Tool definition ────────────────────────────────────────────────────────
export const bundleTools = [
  {
    name: "create_screen_with_hotspots",
    description:
      "Create a screen with hotspots and connections in a single transactional call. " +
      "If any sub-step fails, all changes are rolled back so the canvas is never left half-built. " +
      "Hotspot targets and connection destinations support @self (the just-created screen) " +
      "and @caller (the screen that triggered the agent's task — requires callerScreenId). " +
      "Hotspot labels must be unique within the call and are used to resolve connections[].fromHotspot references. " +
      "Render-response fields (imageWidth, imageHeight, warnings, thumbnail) follow the same shape as create_screen.",
    inputSchema: {
      type: "object",
      properties: {
        screen: {
          type: "object",
          description: "Screen definition. Same rendering rules as create_screen.",
          properties: {
            name: {
              type: "string",
              description: "Screen name (e.g., 'Paywall', 'Login Screen')",
            },
            html: {
              type: "string",
              description:
                "HTML content to render. Same Satori constraints as create_screen: " +
                "inline styles only, display:flex on multi-child elements, wrap text in <div>.",
            },
            device: {
              type: "string",
              description:
                "Device preset for viewport size and chrome. Defaults to 'iphone'.",
              enum: SUPPORTED_DEVICES,
            },
            width: {
              type: "number",
              description: "Custom viewport width (overrides device preset)",
            },
            height: {
              type: "number",
              description: "Custom viewport height (overrides device preset)",
            },
            chrome: {
              description:
                'Device chrome compositing. "auto" (default), false to skip, or array of chrome ids.',
            },
            chromeStyle: {
              type: "string",
              description: '"light" (default) or "dark" chrome palette.',
              enum: ["light", "dark"],
            },
            position: {
              type: "object",
              properties: { x: { type: "number" }, y: { type: "number" } },
              description: "Canvas position. If omitted, auto-placed on grid.",
            },
            x: {
              type: "number",
              description:
                "Shorthand for position.x (ignored if position is set)",
            },
            y: {
              type: "number",
              description:
                "Shorthand for position.y (ignored if position is set)",
            },
            description: { type: "string", description: "Screen description" },
            notes: { type: "string", description: "Implementation notes" },
          },
          required: ["name", "html"],
        },
        hotspots: {
          type: "array",
          description: "Hotspots to add to the new screen.",
          items: {
            type: "object",
            properties: {
              label: {
                type: "string",
                description:
                  "Hotspot label. Must be unique within this call. Used for connections[].fromHotspot resolution.",
              },
              elementType: {
                type: "string",
                enum: [
                  "button",
                  "text-input",
                  "toggle",
                  "card",
                  "icon",
                  "link",
                  "image",
                  "tab",
                  "list-item",
                  "other",
                ],
                description: "Type of UI element (default: 'button')",
              },
              x: {
                type: "number",
                description: "X position as percentage (0-100) of image width",
              },
              y: {
                type: "number",
                description: "Y position as percentage (0-100) of image height",
              },
              w: {
                type: "number",
                description: "Width as percentage (0-100) of image width",
              },
              h: {
                type: "number",
                description: "Height as percentage (0-100) of image height",
              },
              action: {
                type: "string",
                enum: [
                  "navigate",
                  "back",
                  "modal",
                  "conditional",
                  "api",
                  "custom",
                ],
                description: "What happens when this hotspot is tapped",
              },
              target: {
                type: "string",
                description:
                  "Target screen ID, @self, or @caller. Resolves to targetScreenId for navigate/modal actions.",
              },
              targetScreenId: {
                type: "string",
                description:
                  "Literal target screen ID (use target for placeholder support).",
              },
              apiEndpoint: { type: "string" },
              apiMethod: {
                type: "string",
                enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
              },
              customDescription: { type: "string" },
            },
            required: ["label", "x", "y", "w", "h", "action"],
          },
        },
        connections: {
          type: "array",
          description:
            "Connections from the new screen to other screens. If a hotspot with action navigate/modal " +
            "already has a resolved target, its auto-created connection is included automatically — " +
            "duplicate entries here are silently skipped.",
          items: {
            type: "object",
            properties: {
              fromHotspot: {
                type: "string",
                description:
                  "Label of a hotspot on this screen to associate the connection with.",
              },
              to: {
                type: "string",
                description:
                  "Target screen ID, @self, or @caller.",
              },
              label: { type: "string" },
              action: {
                type: "string",
                enum: ["navigate", "modal", "back"],
                description: "Navigation action type (default: 'navigate')",
              },
              condition: { type: "string" },
              data_flow: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    description: { type: "string" },
                  },
                  required: ["name"],
                },
              },
            },
            required: ["to"],
          },
        },
        callerScreenId: {
          type: "string",
          description:
            "Screen ID that @caller resolves to. Required when any hotspot target or connection uses @caller.",
        },
        includeThumbnail: {
          type: "boolean",
          description:
            "When true, the response includes a ~200px-wide PNG thumbnail (base64). Default false.",
        },
        includeFullImage: {
          type: "boolean",
          description:
            "When true, the response includes the full-resolution rendered PNG as base64. Default false.",
        },
      },
      required: ["screen"],
    },
  },
];

// ── Handler dispatch ───────────────────────────────────────────────────────
export async function handleBundleTool(name, args, state, renderer) {
  switch (name) {
    case "create_screen_with_hotspots":
      return await createScreenWithHotspots(args, state, renderer);
    default:
      throw new Error(`Unknown bundle tool: ${name}`);
  }
}

// ── Core implementation ────────────────────────────────────────────────────
async function createScreenWithHotspots(args, state, renderer) {
  const {
    screen,
    hotspots = [],
    connections = [],
    callerScreenId,
    includeThumbnail,
    includeFullImage,
  } = args;

  // ── Pre-flight validation (no mutations yet) ──────────────────────────
  // 1. Duplicate labels
  const labels = hotspots.map((h) => h.label).filter(Boolean);
  const seen = new Set();
  for (const label of labels) {
    if (seen.has(label)) {
      throw new Error(`Duplicate hotspot label: "${label}"`);
    }
    seen.add(label);
  }

  // 2. @caller requires callerScreenId
  const needsCaller =
    hotspots.some(
      (h) =>
        usesPlaceholder(h.target, "@caller") ||
        usesPlaceholder(h.targetScreenId, "@caller"),
    ) || connections.some((c) => usesPlaceholder(c.to, "@caller"));

  if (needsCaller && !callerScreenId) {
    throw new Error(
      "callerScreenId is required when @caller placeholder is used in hotspots or connections",
    );
  }

  // 3. callerScreenId must reference an existing screen
  if (callerScreenId && !state.getScreen(callerScreenId)) {
    throw new Error(`Caller screen not found: ${callerScreenId}`);
  }

  // 4. fromHotspot references must match a label in the hotspots array
  const labelSet = new Set(labels);
  for (const conn of connections) {
    if (conn.fromHotspot && !labelSet.has(conn.fromHotspot)) {
      throw new Error(
        `Connection references unknown hotspot label: "${conn.fromHotspot}"`,
      );
    }
  }

  // ── Step 1: Create screen ─────────────────────────────────────────────
  const position =
    screen.position ||
    (screen.x != null && screen.y != null
      ? { x: screen.x, y: screen.y }
      : undefined);

  const screenResult = await handleScreenTool(
    "create_screen",
    {
      html: screen.html,
      name: screen.name,
      device: screen.device,
      width: screen.width,
      height: screen.height,
      chrome: screen.chrome,
      chromeStyle: screen.chromeStyle,
      position,
      description: screen.description,
      notes: screen.notes,
      includeThumbnail,
      includeFullImage,
    },
    state,
    renderer,
  );

  const newScreenId = screenResult.screenId;

  try {
    // ── Step 2: Create hotspots ───────────────────────────────────────────
    const hotspotIds = [];
    const allConnectionIds = [];
    const labelToHotspotId = {};

    for (const hs of hotspots) {
      const connCountBefore = state.connections.length;

      // Resolve target placeholder
      const rawTarget = hs.target ?? hs.targetScreenId ?? null;
      const targetScreenId = resolveTarget(
        rawTarget,
        newScreenId,
        callerScreenId,
      );

      // Strip the non-standard 'target' field before passing to state
      const { target: _t, ...hotspotData } = hs;
      const created = state.addHotspot(newScreenId, {
        ...hotspotData,
        targetScreenId,
      });

      hotspotIds.push(created.id);
      if (hs.label) {
        labelToHotspotId[hs.label] = created.id;
      }

      // Collect auto-created connection IDs
      for (let i = connCountBefore; i < state.connections.length; i++) {
        allConnectionIds.push(state.connections[i].id);
      }
    }

    // ── Step 3: Create explicit connections ────────────────────────────────
    for (const conn of connections) {
      const toScreenId = resolveTarget(conn.to, newScreenId, callerScreenId);
      const hotspotId = conn.fromHotspot
        ? labelToHotspotId[conn.fromHotspot]
        : null;

      // Skip if this exact link was already auto-created by addHotspot
      const isDuplicate = state.connections.some(
        (c) =>
          c.fromScreenId === newScreenId &&
          c.toScreenId === toScreenId &&
          c.hotspotId === hotspotId,
      );
      if (isDuplicate) continue;

      const created = state.addConnection({
        fromScreenId: newScreenId,
        toScreenId,
        hotspotId,
        label: conn.label,
        action: conn.action,
        condition: conn.condition,
        ...(conn.data_flow
          ? { dataFlow: convertDataFlow(conn.data_flow) }
          : {}),
      });
      allConnectionIds.push(created.id);
    }

    // ── Build response ────────────────────────────────────────────────────
    return {
      ...screenResult,
      hotspotIds,
      connectionIds: allConnectionIds,
    };
  } catch (error) {
    // Transactional rollback: delete the screen (cascades hotspots + connections)
    try {
      state.deleteScreen(newScreenId);
    } catch {
      // Ignore rollback errors — the original error is more important
    }
    throw error;
  }
}

// ── Data flow helper (matches connection-tools.js) ─────────────────────────
function convertDataFlow(dataFlowSnake) {
  if (!Array.isArray(dataFlowSnake)) return undefined;
  return dataFlowSnake.map((item) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: item.name || "",
    type: item.type || "String",
    description: item.description || "",
  }));
}

export const connectionTools = [
  {
    name: "create_connection",
    description: "Create a navigation connection between two screens. For hotspot-driven connections, use create_hotspot instead (connections are created automatically).",
    inputSchema: {
      type: "object",
      properties: {
        fromScreenId: { type: "string", description: "Source screen ID" },
        toScreenId: { type: "string", description: "Target screen ID" },
        label: { type: "string", description: "Connection label" },
        action: { type: "string", enum: ["navigate", "modal", "back"], description: "Navigation action type (default: 'navigate')" },
        condition: { type: "string", description: "Condition text for conditional connections" },
        conditionGroupId: { type: "string", description: "Group ID for conditional branch connections" },
        transitionType: { type: "string", description: "Transition animation type" },
        data_flow: {
          type: "array",
          description: "Data items passed along this connection",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Parameter name (e.g. 'productId')" },
              type: { type: "string", description: "Data type (String, Int, Bool, Object, Array, Date, ID, or custom)" },
              description: { type: "string", description: "What this parameter represents" },
            },
            required: ["name"],
          },
        },
      },
      required: ["fromScreenId", "toScreenId"],
    },
  },
  {
    name: "update_connection",
    description: "Update properties of an existing connection.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: { type: "string" },
        label: { type: "string" },
        action: { type: "string" },
        condition: { type: "string" },
        transitionType: { type: "string" },
        transitionLabel: { type: "string" },
        data_flow: {
          type: "array",
          description: "Data items passed along this connection",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Parameter name" },
              type: { type: "string", description: "Data type" },
              description: { type: "string", description: "What this parameter represents" },
            },
            required: ["name"],
          },
        },
      },
      required: ["connectionId"],
    },
  },
  {
    name: "delete_connection",
    description: "Remove a connection between screens.",
    inputSchema: {
      type: "object",
      properties: {
        connectionId: { type: "string" },
      },
      required: ["connectionId"],
    },
  },
  {
    name: "list_connections",
    description: "List all connections in the current flow.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

function convertDataFlow(dataFlowSnake) {
  if (!Array.isArray(dataFlowSnake)) return undefined;
  return dataFlowSnake.map(item => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: item.name || "",
    type: item.type || "String",
    description: item.description || "",
  }));
}

export function handleConnectionTool(name, args, state) {
  switch (name) {
    case "create_connection": {
      const { data_flow, ...rest } = args;
      const dataFlow = convertDataFlow(data_flow);
      const conn = state.addConnection({ ...rest, ...(dataFlow ? { dataFlow } : {}) });
      return { connectionId: conn.id, fromScreenId: conn.fromScreenId, toScreenId: conn.toScreenId };
    }

    case "update_connection": {
      const { connectionId, data_flow, ...updates } = args;
      const dataFlow = convertDataFlow(data_flow);
      const conn = state.updateConnection(connectionId, { ...updates, ...(dataFlow ? { dataFlow } : {}) });
      return { success: true, connectionId: conn.id };
    }

    case "delete_connection": {
      state.deleteConnection(args.connectionId);
      return { success: true };
    }

    case "list_connections": {
      return { connections: state.connections };
    }

    default:
      throw new Error(`Unknown connection tool: ${name}`);
  }
}

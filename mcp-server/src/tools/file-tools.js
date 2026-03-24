export const fileTools = [
  {
    name: "create_flow",
    description: "Create a new empty Drawd flow and save it to disk. This must be called before adding screens, connections, or hotspots.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path for the new .drawd file" },
        name: { type: "string", description: "Flow name (default: 'Untitled Flow')" },
        featureBrief: { type: "string", description: "Brief description of the feature being designed" },
        techStack: { type: "object", description: "Technology stack map, e.g. { frontend: 'SwiftUI', backend: 'Node.js' }" },
      },
      required: ["path"],
    },
  },
  {
    name: "open_flow",
    description: "Open an existing .drawd file and load it into memory for editing. Supports all .drawd file versions (v1-v10).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the .drawd file to open" },
      },
      required: ["path"],
    },
  },
  {
    name: "save_flow",
    description: "Save the current in-memory flow state to disk. Uses the currently open file path unless a new path is specified.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Optional new file path to save to (default: current file)" },
      },
    },
  },
  {
    name: "get_flow_info",
    description: "Get a summary of the current flow: metadata, screen list with hotspot counts, connection count, documents, etc.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function handleFileTool(name, args, state) {
  switch (name) {
    case "create_flow": {
      state.createNew(args.path, {
        name: args.name,
        featureBrief: args.featureBrief,
        techStack: args.techStack,
      });
      return { success: true, path: args.path, name: state.metadata.name };
    }

    case "open_flow": {
      state.load(args.path);
      const summary = state.getSummary();
      return {
        success: true,
        path: args.path,
        screenCount: summary.screenCount,
        connectionCount: summary.connectionCount,
        metadata: summary.metadata,
      };
    }

    case "save_flow": {
      state.save(args.path);
      return { success: true, path: state.filePath };
    }

    case "get_flow_info": {
      return state.getSummary();
    }

    default:
      throw new Error(`Unknown file tool: ${name}`);
  }
}

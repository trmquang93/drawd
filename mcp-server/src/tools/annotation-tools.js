export const annotationTools = [
  {
    name: "create_sticky_note",
    description: "Add a sticky note annotation to the canvas.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Note text content" },
        color: { type: "string", enum: ["yellow", "blue", "red", "green"], description: "Note color (default: 'yellow')" },
        x: { type: "number", description: "Canvas X position" },
        y: { type: "number", description: "Canvas Y position" },
      },
      required: ["content"],
    },
  },
  {
    name: "create_screen_group",
    description: "Create a visual grouping of screens on the canvas.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Group name" },
        screenIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of screen IDs to include in the group",
        },
        color: { type: "string", description: "Group color (hex, default: '#61afef')" },
      },
      required: ["name", "screenIds"],
    },
  },
  {
    name: "update_screen_group",
    description: "Update a screen group (name, members, color).",
    inputSchema: {
      type: "object",
      properties: {
        groupId: { type: "string" },
        name: { type: "string" },
        screenIds: { type: "array", items: { type: "string" } },
        color: { type: "string" },
      },
      required: ["groupId"],
    },
  },
  {
    name: "delete_screen_group",
    description: "Delete a screen group (does not delete the screens).",
    inputSchema: {
      type: "object",
      properties: {
        groupId: { type: "string" },
      },
      required: ["groupId"],
    },
  },
];

export function handleAnnotationTool(name, args, state) {
  switch (name) {
    case "create_sticky_note": {
      const note = state.addStickyNote(args);
      return { noteId: note.id, color: note.color, x: note.x, y: note.y };
    }

    case "create_screen_group": {
      const group = state.addScreenGroup(args);
      return { groupId: group.id, name: group.name, screenCount: group.screenIds.length };
    }

    case "update_screen_group": {
      const { groupId, ...updates } = args;
      const group = state.updateScreenGroup(groupId, updates);
      return { success: true, groupId: group.id };
    }

    case "delete_screen_group": {
      state.deleteScreenGroup(args.groupId);
      return { success: true };
    }

    default:
      throw new Error(`Unknown annotation tool: ${name}`);
  }
}

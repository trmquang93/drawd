export const modelTools = [
  {
    name: "create_data_model",
    description: "Add a data model definition to the flow (e.g., User, Post, Order).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Model name (e.g., 'User', 'Post')" },
        fields: {
          type: "object",
          description: "Field definitions, e.g. { name: { type: 'string', required: true }, age: { type: 'number' } }",
        },
      },
      required: ["name", "fields"],
    },
  },
  {
    name: "update_data_model",
    description: "Update a data model definition.",
    inputSchema: {
      type: "object",
      properties: {
        modelId: { type: "string" },
        name: { type: "string" },
        fields: { type: "object" },
      },
      required: ["modelId"],
    },
  },
  {
    name: "delete_data_model",
    description: "Delete a data model.",
    inputSchema: {
      type: "object",
      properties: {
        modelId: { type: "string" },
      },
      required: ["modelId"],
    },
  },
  {
    name: "list_data_models",
    description: "List all data models in the flow.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function handleModelTool(name, args, state) {
  switch (name) {
    case "create_data_model": {
      const model = state.addDataModel(args);
      return { modelId: model.id, name: model.name };
    }

    case "update_data_model": {
      const { modelId, ...updates } = args;
      const model = state.updateDataModel(modelId, updates);
      return { success: true, modelId: model.id };
    }

    case "delete_data_model": {
      state.deleteDataModel(args.modelId);
      return { success: true };
    }

    case "list_data_models": {
      return { dataModels: state.dataModels };
    }

    default:
      throw new Error(`Unknown model tool: ${name}`);
  }
}

export const documentTools = [
  {
    name: "create_document",
    description: "Add a project-level document (API spec, design guide, etc.). Documents can be referenced by hotspots via documentId.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Document name (e.g., 'Login API Spec')" },
        content: { type: "string", description: "Document content (Markdown or plain text)" },
      },
      required: ["name", "content"],
    },
  },
  {
    name: "update_document",
    description: "Update a project document.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        name: { type: "string" },
        content: { type: "string" },
      },
      required: ["documentId"],
    },
  },
  {
    name: "delete_document",
    description: "Delete a project document.",
    inputSchema: {
      type: "object",
      properties: {
        documentId: { type: "string" },
      },
      required: ["documentId"],
    },
  },
  {
    name: "list_documents",
    description: "List all project documents.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function handleDocumentTool(name, args, state) {
  switch (name) {
    case "create_document": {
      const doc = state.addDocument(args);
      return { documentId: doc.id, name: doc.name };
    }

    case "update_document": {
      const { documentId, ...updates } = args;
      const doc = state.updateDocument(documentId, updates);
      return { success: true, documentId: doc.id };
    }

    case "delete_document": {
      state.deleteDocument(args.documentId);
      return { success: true };
    }

    case "list_documents": {
      return {
        documents: state.documents.map((d) => ({
          id: d.id,
          name: d.name,
          createdAt: d.createdAt,
          contentLength: (d.content || "").length,
        })),
      };
    }

    default:
      throw new Error(`Unknown document tool: ${name}`);
  }
}

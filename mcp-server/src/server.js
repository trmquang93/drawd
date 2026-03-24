import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { fileTools, handleFileTool } from "./tools/file-tools.js";
import { screenTools, handleScreenTool } from "./tools/screen-tools.js";
import { hotspotTools, handleHotspotTool } from "./tools/hotspot-tools.js";
import { connectionTools, handleConnectionTool } from "./tools/connection-tools.js";
import { documentTools, handleDocumentTool } from "./tools/document-tools.js";
import { modelTools, handleModelTool } from "./tools/model-tools.js";
import { annotationTools, handleAnnotationTool } from "./tools/annotation-tools.js";
import { generationTools, handleGenerationTool } from "./tools/generation-tools.js";

const FILE_TOOL_NAMES = new Set(fileTools.map((t) => t.name));
const SCREEN_TOOL_NAMES = new Set(screenTools.map((t) => t.name));
const HOTSPOT_TOOL_NAMES = new Set(hotspotTools.map((t) => t.name));
const CONNECTION_TOOL_NAMES = new Set(connectionTools.map((t) => t.name));
const DOCUMENT_TOOL_NAMES = new Set(documentTools.map((t) => t.name));
const MODEL_TOOL_NAMES = new Set(modelTools.map((t) => t.name));
const ANNOTATION_TOOL_NAMES = new Set(annotationTools.map((t) => t.name));
const GENERATION_TOOL_NAMES = new Set(generationTools.map((t) => t.name));

const ALL_TOOLS = [
  ...fileTools,
  ...screenTools,
  ...hotspotTools,
  ...connectionTools,
  ...documentTools,
  ...modelTools,
  ...annotationTools,
  ...generationTools,
];

export function createServer(state, renderer) {
  const server = new Server(
    { name: "drawd-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: ALL_TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result;

      if (FILE_TOOL_NAMES.has(name)) {
        result = handleFileTool(name, args, state);
      } else if (SCREEN_TOOL_NAMES.has(name)) {
        result = await handleScreenTool(name, args, state, renderer);
      } else if (HOTSPOT_TOOL_NAMES.has(name)) {
        result = handleHotspotTool(name, args, state);
      } else if (CONNECTION_TOOL_NAMES.has(name)) {
        result = handleConnectionTool(name, args, state);
      } else if (DOCUMENT_TOOL_NAMES.has(name)) {
        result = handleDocumentTool(name, args, state);
      } else if (MODEL_TOOL_NAMES.has(name)) {
        result = handleModelTool(name, args, state);
      } else if (ANNOTATION_TOOL_NAMES.has(name)) {
        result = handleAnnotationTool(name, args, state);
      } else if (GENERATION_TOOL_NAMES.has(name)) {
        result = handleGenerationTool(name, args, state);
      } else {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error.message }) }],
        isError: true,
      };
    }
  });

  return server;
}

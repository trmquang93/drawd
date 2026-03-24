import fs from "node:fs";
import path from "node:path";
import { validateInstructions } from "../../../src/utils/validateInstructions.js";
import { generateInstructionFiles } from "../../../src/utils/generateInstructionFiles.js";
import { analyzeNavGraph } from "../../../src/utils/analyzeNavGraph.js";

export const generationTools = [
  {
    name: "validate_flow",
    description: "Run pre-generation validation checks on the current flow. Returns errors (broken targets, empty screens) and warnings.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "generate_instructions",
    description: "Generate AI build instruction files (Markdown) from the current flow. Writes files to outputDir and returns a summary.",
    inputSchema: {
      type: "object",
      properties: {
        platform: {
          type: "string",
          enum: ["auto", "swiftui", "react-native", "flutter", "jetpack-compose"],
          description: "Target platform for framework-specific code patterns (default: 'auto')",
        },
        outputDir: {
          type: "string",
          description: "Directory to write instruction files to (default: sibling 'instructions/' directory)",
        },
      },
    },
  },
  {
    name: "analyze_navigation",
    description: "Analyze the navigation graph to detect entry screens, tab bar patterns, modal screens, and back loops.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function handleGenerationTool(name, args, state) {
  switch (name) {
    case "validate_flow": {
      const issues = validateInstructions(state.screens, state.connections, {
        documents: state.documents,
      });
      return {
        issueCount: issues.length,
        errors: issues.filter((i) => i.level === "error"),
        warnings: issues.filter((i) => i.level === "warning"),
      };
    }

    case "generate_instructions": {
      const result = generateInstructionFiles(state.screens, state.connections, {
        documents: state.documents,
        dataModels: state.dataModels,
        screenGroups: state.screenGroups,
        platform: args.platform || "auto",
        featureBrief: state.metadata.featureBrief,
        taskLink: state.metadata.taskLink,
        techStack: state.metadata.techStack,
      });

      const outputDir = args.outputDir || (
        state.filePath
          ? path.join(path.dirname(state.filePath), "instructions")
          : path.join(process.cwd(), "instructions")
      );

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write markdown files
      const writtenFiles = [];
      for (const file of result.files) {
        const filePath = path.join(outputDir, file.name);
        fs.writeFileSync(filePath, file.content, "utf-8");
        writtenFiles.push(filePath);
      }

      // Write image files
      const imagesDir = path.join(outputDir, "images");
      if (result.images && result.images.length > 0) {
        if (!fs.existsSync(imagesDir)) {
          fs.mkdirSync(imagesDir, { recursive: true });
        }
        for (const img of result.images) {
          const imgPath = path.join(imagesDir, img.name);
          fs.writeFileSync(imgPath, Buffer.from(img.data));
          writtenFiles.push(imgPath);
        }
      }

      return {
        outputDir,
        fileCount: result.files.length,
        imageCount: (result.images || []).length,
        files: result.files.map((f) => f.name),
      };
    }

    case "analyze_navigation": {
      return analyzeNavGraph(state.screens, state.connections);
    }

    default:
      throw new Error(`Unknown generation tool: ${name}`);
  }
}

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FlowState } from "./src/state.js";
import { HtmlRenderer } from "./src/renderer/html-renderer.js";
import { createServer } from "./src/server.js";

async function main() {
  const state = new FlowState();
  const renderer = new HtmlRenderer();

  // Auto-open a file if --file argument is provided
  const fileArgIdx = process.argv.indexOf("--file");
  if (fileArgIdx !== -1 && process.argv[fileArgIdx + 1]) {
    const filePath = process.argv[fileArgIdx + 1];
    try {
      state.load(filePath);
      process.stderr.write(`Loaded flow: ${filePath} (${state.screens.length} screens)\n`);
    } catch (err) {
      process.stderr.write(`Warning: Could not load ${filePath}: ${err.message}\n`);
    }
  }

  // Initialize Puppeteer renderer
  try {
    await renderer.init();
    process.stderr.write("HTML renderer ready (Chrome connected)\n");
  } catch (err) {
    process.stderr.write(`Warning: HTML renderer unavailable: ${err.message}\n`);
    process.stderr.write("Screen creation from HTML will not work. Set CHROME_PATH if needed.\n");
  }

  const server = createServer(state, renderer);
  const transport = new StdioServerTransport();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    await renderer.close();
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await renderer.close();
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);
  process.stderr.write("Drawd MCP server running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});

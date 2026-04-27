// Drawd MCP server entry point.
//
// CLI args:
//   --file <path.drawd>   Pre-load a flow file at startup. Equivalent to the
//                         agent calling open_flow as its first tool.
//
// Environment variables (all optional):
//   UNSPLASH_ACCESS_KEY   Enables query-relevant Unsplash photos in
//                         find_stock_image. Without it, the tool falls back
//                         to Pexels (if PEXELS_API_KEY is set) or Picsum.
//   PEXELS_API_KEY        Enables Pexels as the secondary photo source.
//   DRAWD_SELECTION_PORT  Override the localhost port the selection bridge
//                         binds to. Defaults to 3337.
//   CHROME_PATH           Path to Chrome/Chromium for the legacy html-to-png
//                         renderer. Not used by the default Satori path.
//
// API keys are read from env on every call, never logged, never written
// to disk. Outbound asset fetches are restricted to a hostname allowlist —
// see src/renderer/satori-renderer.js (inlineRemoteImages).
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FlowState } from "./src/state.js";
import { SatoriRenderer } from "./src/renderer/satori-renderer.js";
import { createServer } from "./src/server.js";
import { createSelectionBridge } from "./src/selection-bridge.js";

async function main() {
  const state = new FlowState();
  const renderer = new SatoriRenderer();

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

  // Initialize Satori renderer
  try {
    await renderer.init();
    process.stderr.write("Satori renderer ready\n");
  } catch (err) {
    process.stderr.write(`Warning: Satori renderer unavailable: ${err.message}\n`);
    process.stderr.write("Screen creation from HTML will not work.\n");
  }

  const bridge = createSelectionBridge();

  const server = createServer(state, renderer, bridge);
  const transport = new StdioServerTransport();

  // Graceful shutdown
  process.on("SIGINT", async () => {
    bridge.close();
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    bridge.close();
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

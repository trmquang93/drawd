import { defineConfig } from "vite";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import react from "@vitejs/plugin-react";

const stubDir = resolve("src/stubs");

const NODE_STUBS = {
  module: resolve(stubDir, "module.js"),
  assert: resolve(stubDir, "assert.js"),
  "node:fs": resolve(stubDir, "fs.js"),
  "node:crypto": resolve(stubDir, "crypto.js"),
};

// @grida/refig bundles Node builtins (assert, module, node:fs, node:crypto)
// in its shared chunk. These are only used in Node code paths and are safely
// wrapped in try/catch at runtime. We stub them for the browser build.
//
// IMPORTANT: skip the stub when running under Vitest. Tests for the MCP
// server's renderer (mcp-server/src/renderer/__tests__/*) need the REAL
// node:fs to load font Buffers and check for asset directories. Those tests
// are explicitly tagged `@vitest-environment node`; the stub would otherwise
// short-circuit them with empty-string returns.
// Skip all browser-only Node-builtin stubbing under Vitest. The MCP server's
// renderer tests need real node:fs to read font Buffers; the browser stub
// returns "" which then crashes Satori's addFonts with a confusing
// "Cannot use 'in' operator" error.
const isVitest = !!process.env.VITEST;

const nodeStubPlugin = {
  name: "node-stub",
  enforce: "pre",
  resolveId(id) {
    if (isVitest) return null;
    if (id in NODE_STUBS) return NODE_STUBS[id];
  },
};

// esbuild plugin for dev dependency pre-bundling
const esbuildNodeStubPlugin = {
  name: "node-stub",
  setup(build) {
    const filter = /^(module|assert|node:fs|node:crypto)$/;
    build.onResolve({ filter }, (args) => ({
      path: NODE_STUBS[args.path],
    }));
  },
};

// Serve the Skia WASM binary from @grida/canvas-wasm with correct MIME type.
// Vite's pre-bundler changes the script URL so Emscripten's locateFile()
// can't find the .wasm file relative to the original package. This middleware
// intercepts any request ending in "grida_canvas_wasm.wasm" and serves the
// actual binary from node_modules. With npm overrides the package may be nested
// under @grida/refig instead of hoisted to the top level.
const wasmCandidates = [
  resolve("node_modules/@grida/canvas-wasm/dist/grida_canvas_wasm.wasm"),
  resolve("node_modules/@grida/refig/node_modules/@grida/canvas-wasm/dist/grida_canvas_wasm.wasm"),
];
const wasmPath = wasmCandidates.find((p) => existsSync(p));
const serveWasmPlugin = {
  name: "serve-wasm",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url?.endsWith("grida_canvas_wasm.wasm") && wasmPath) {
        res.setHeader("Content-Type", "application/wasm");
        res.end(readFileSync(wasmPath));
        return;
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [nodeStubPlugin, serveWasmPlugin, react()],
  resolve: {
    alias: {
      // Browser-only Node-builtin stubs. Skipped under Vitest so the MCP
      // server tests get the real `node:fs` etc.
      ...(isVitest ? {} : NODE_STUBS),
      // @grida/refig v0.0.4 exports map only lists "." and "./browser".
      // The shared chunk exports iofigma (kiwi parser utilities) needed
      // for shared-component resolution. This alias bypasses the exports
      // restriction so Vite can resolve the deep import.
      "@grida/refig/dist/chunk-INJ5F2RK.mjs": resolve(
        "node_modules/@grida/refig/dist/chunk-INJ5F2RK.mjs",
      ),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: isVitest ? [] : [esbuildNodeStubPlugin],
    },
  },
  test: {
    environment: "jsdom",
  },
});

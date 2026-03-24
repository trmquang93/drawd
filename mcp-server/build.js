import { build } from "esbuild";

await build({
  entryPoints: ["index.js"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/index.js",
  external: ["puppeteer-core", "@modelcontextprotocol/sdk"],
  banner: { js: "#!/usr/bin/env node" },
  logLevel: "info",
});

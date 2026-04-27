// Browser stub for Node "node:fs" builtin.
// Used by @grida/canvas-wasm for WASM loading fallback; browser path uses fetch instead.
// Also intercepts code paths in mcp-server/src/renderer/satori-renderer.js when imported
// from a Vitest jsdom environment — those paths are tested in `node` env explicitly.
export default {};
export const readFileSync = () => "";
export const existsSync = () => false;

import { FigmaDocument, FigmaRenderer } from "@grida/refig/browser";
// @grida/refig v0.0.4 — chunk hash is version-specific.
// iofigma is exported from the chunk but not re-exported from @grida/refig/browser.
// Pin the dependency version to keep this import stable.
import { iofigma } from "@grida/refig/dist/chunk-INJ5F2RK.mjs";

// ---------------------------------------------------------------------------
// Shared-component capture: monkey-patch factory.node to intercept
// derivedSymbolData from INSTANCE nodeChanges during kiwi parsing.
// The patch is scoped — only active while captureState is non-null.
// ---------------------------------------------------------------------------
const origFactoryNode = iofigma.kiwi.factory.node;
let captureState = null;

iofigma.kiwi.factory.node = function (nc, message) {
  if (captureState) {
    captureState.message = message;
    if (nc.derivedSymbolData?.length && nc.guid) {
      captureState.derived.set(iofigma.kiwi.guid(nc.guid), nc);
    }
  }
  return origFactoryNode.call(this, nc, message);
};

function beginCapture() {
  captureState = { derived: new Map(), message: null };
}

function endCapture() {
  const result = captureState;
  captureState = null;
  return result;
}

// ---------------------------------------------------------------------------
// Shared-component resolution: process captured derivedSymbolData, build
// parent-child trees from the derived NodeChanges, and patch INSTANCE nodes
// in _figFile so the renderer sees the full subtree.
// ---------------------------------------------------------------------------
function findNodeRecursive(nodes, targetId) {
  for (const node of nodes || []) {
    if (node.id === targetId) return node;
    if (node.children) {
      const found = findNodeRecursive(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function findNodeInFigFile(figFile, nodeId) {
  for (const page of figFile?.pages || []) {
    const found = findNodeRecursive(page.rootNodes, nodeId);
    if (found) return found;
  }
  return null;
}

function resolveSharedComponents(doc, captured) {
  if (!captured?.derived?.size) return 0;

  const { derived, message } = captured;
  let patchCount = 0;

  for (const [instanceGuid, kiwiInstance] of derived) {
    const derivedNCs = kiwiInstance.derivedSymbolData;

    // Convert derived nodeChanges to REST-like nodes using the same factory
    const nodes = derivedNCs
      .map((nc) => origFactoryNode(nc, message))
      .filter(Boolean);
    if (nodes.length === 0) continue;

    // Build lookup maps: guid → REST-like node, guid → raw kiwi nodeChange
    const guidToNode = new Map();
    nodes.forEach((n) => guidToNode.set(n.id, n));

    const guidToKiwi = new Map();
    derivedNCs.forEach((nc) => {
      if (nc.guid) guidToKiwi.set(iofigma.kiwi.guid(nc.guid), nc);
    });

    // Build parent-child relationships (mirrors buildChildrenRelationsInPlace)
    nodes.forEach((node) => {
      const kiwi = guidToKiwi.get(node.id);
      if (!kiwi?.parentIndex?.guid) return;
      const parentGuid = iofigma.kiwi.guid(kiwi.parentIndex.guid);
      const parent = guidToNode.get(parentGuid);
      if (parent && "children" in parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
    });

    // Sort children by fractional position index
    guidToNode.forEach((parent) => {
      if (!parent.children?.length) return;
      parent.children.sort((a, b) => {
        const aPos = guidToKiwi.get(a.id)?.parentIndex?.position ?? "";
        const bPos = guidToKiwi.get(b.id)?.parentIndex?.position ?? "";
        return aPos.localeCompare(bPos);
      });
    });

    // Find root children — direct children of the INSTANCE node
    const rootChildren = nodes.filter((node) => {
      const kiwi = guidToKiwi.get(node.id);
      if (!kiwi?.parentIndex?.guid) return false;
      return iofigma.kiwi.guid(kiwi.parentIndex.guid) === instanceGuid;
    });

    if (rootChildren.length === 0) continue;

    // Patch the INSTANCE node in _figFile with resolved children
    const instanceNode = findNodeInFigFile(doc._figFile, instanceGuid);
    if (instanceNode) {
      instanceNode.children = rootChildren;
      patchCount++;
    }
  }

  // Clear scene cache so _resolve() regenerates from patched _figFile
  if (patchCount > 0) {
    doc._sceneCache.clear();
  }

  return patchCount;
}

/**
 * Detect Figma content in clipboard HTML.
 * Figma puts hidden spans with `(figmeta)` and `(figma)` markers
 * in `text/html`. Figma Desktop may also include an `image/png` blob;
 * Figma Web typically does not.
 *
 * @param {DataTransfer} clipboardData
 * @returns {boolean}
 */
export function isFigmaClipboard(clipboardData) {
  const html = clipboardData.getData("text/html");
  if (!html) return false;
  return html.includes("(figmeta)") && html.includes("(figma)");
}

/**
 * Extract figmeta JSON and binary buffer from clipboard HTML.
 *
 * Clipboard HTML structure:
 *   <span data-metadata="<!--(figmeta)BASE64(/figmeta)-->">
 *   <span data-buffer="<!--(figma)BASE64(/figma)-->">
 *
 * @param {string} html - clipboard text/html content
 * @returns {{ meta: { fileKey: string, pasteID: string }, buffer: Uint8Array } | null}
 */
export function extractFigmaData(html) {
  try {
    const metaMatch = html.match(/\(figmeta\)([\s\S]*?)\(\/figmeta\)/);
    const bufferMatch = html.match(/\(figma\)([\s\S]*?)\(\/figma\)/);

    if (!metaMatch || !bufferMatch) return null;

    const metaJson = JSON.parse(atob(metaMatch[1].trim()));
    const binaryStr = atob(bufferMatch[1].trim());
    const buffer = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      buffer[i] = binaryStr.charCodeAt(i);
    }

    return {
      meta: {
        fileKey: metaJson.fileKey || null,
        pasteID: metaJson.pasteID || null,
      },
      buffer,
    };
  } catch {
    return null;
  }
}

/**
 * Parse a Figma binary buffer to extract frame metadata without WASM rendering.
 * Uses FigmaDocument's internal kiwi parser to get frame names and IDs.
 *
 * Note: the clipboard binary contains the full scene graph (positions, fills,
 * text, fonts) but NOT the raster image bytes referenced by IMAGE fills,
 * and system fonts like SF Pro cannot be loaded from the browser.
 * This function is used for lightweight metadata extraction only.
 *
 * @param {Uint8Array} buffer - decoded fig-kiwi binary
 * @returns {{ frames: Array<{ id: string, name: string }>, document: FigmaDocument }}
 */
export function parseFigmaFrames(buffer) {
  const doc = new FigmaDocument(buffer);

  // Capture derivedSymbolData from INSTANCE nodeChanges during parsing.
  // This data contains shared/library component definitions that are not
  // included in the top-level nodeChanges array.
  beginCapture();

  // Trigger the internal kiwi parse so _figFile is populated.
  // _resolve() converts to Grida IR (flat node map, no tree hierarchy),
  // but _figFile retains the original Figma page/frame structure.
  doc._resolve();

  const captured = endCapture();

  // Resolve shared/library component instances by injecting their children
  // from derivedSymbolData into the _figFile tree. Wrapped in try/catch so
  // failures degrade gracefully to the current behavior (empty instances).
  try {
    const patchCount = resolveSharedComponents(doc, captured);
    if (patchCount > 0 && import.meta.env.DEV) {
      console.log(
        `[Figma] Resolved ${patchCount} shared component instance(s)`,
      );
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[Figma] Shared component resolution failed:", err);
    }
  }

  const figFile = doc._figFile;
  const frames = [];

  if (figFile?.pages) {
    for (const page of figFile.pages) {
      const rootNodes = page.rootNodes || [];
      for (const node of rootNodes) {
        if (node.id && node.name) {
          frames.push({
            id: node.id,
            name: node.name,
            width: node.size?.x ?? null,
            height: node.size?.y ?? null,
          });
        }
      }
    }
  }

  if (import.meta.env.DEV) {
    console.log(
      `[Figma] Parsed ${frames.length} frame(s)`,
      frames.map((f) => `${f.name} (${f.width}x${f.height})`),
    );
  }

  return { frames, document: doc };
}

/**
 * Convert a Uint8Array to a base64 string.
 * Uses chunked btoa to avoid call-stack overflow on large buffers.
 */
function uint8ArrayToBase64(bytes) {
  const CHUNK = 0x8000;
  const parts = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return btoa(parts.join(""));
}

/**
 * Walk a Figma scene JSON and remove all IMAGE-type fills.
 * Clipboard IMAGE fills contain no pixel data (just CDN references)
 * and render as checker patterns. Stripping them yields transparent
 * areas, preserving the rest of the layout (vectors, text, gradients).
 */
function stripImageFills(sceneJsonStr) {
  const scene = JSON.parse(sceneJsonStr);
  const nodes = scene.document?.nodes;
  if (nodes) {
    for (const node of Object.values(nodes)) {
      if (Array.isArray(node.fills)) {
        node.fills = node.fills.filter((f) => f.type !== "image");
      }
    }
  }
  return JSON.stringify(scene);
}

/**
 * Render a single Figma frame with IMAGE fills stripped.
 *
 * Strategy: resolve the scene (populates internal cache), mutate the
 * cached sceneJson to remove image fills, then render normally.
 * The renderer reads the same cache reference, so no subclassing needed.
 *
 * @param {FigmaDocument} doc - parsed Figma document
 * @param {string} nodeId - frame node ID to render
 * @param {{ width: number, height: number }} [dimensions] - optional size override
 * @returns {Promise<string>} data:image/png;base64,... URL
 */
async function renderFigmaFrame(doc, nodeId, dimensions) {
  const resolved = doc._resolve(nodeId);
  resolved.sceneJson = stripImageFills(resolved.sceneJson);

  const renderer = new FigmaRenderer(doc, { loadFigmaDefaultFonts: true });
  try {
    const renderOpts = { format: "png", scale: 2 };
    if (dimensions?.width && dimensions?.height) {
      renderOpts.width = Math.ceil(dimensions.width);
      renderOpts.height = Math.ceil(dimensions.height);
    }
    const result = await renderer.render(nodeId, renderOpts);
    const base64 = uint8ArrayToBase64(result.data);
    return `data:image/png;base64,${base64}`;
  } finally {
    renderer.dispose();
  }
}

/**
 * High-level entry point: parse a Figma clipboard buffer and render
 * the first frame with IMAGE fills stripped (layout-only preview).
 *
 * @param {Uint8Array} buffer - decoded fig-kiwi binary from clipboard
 * @returns {Promise<{ frameName: string, imageDataUrl: string, frameCount: number }>}
 */
export async function renderFigmaBuffer(buffer) {
  const { frames, document: doc } = parseFigmaFrames(buffer);
  if (frames.length === 0) throw new Error("No frames found in Figma clipboard data");

  const firstFrame = frames[0];
  const imageDataUrl = await renderFigmaFrame(doc, firstFrame.id, {
    width: firstFrame.width,
    height: firstFrame.height,
  });

  return { frameName: firstFrame.name, imageDataUrl, frameCount: frames.length };
}

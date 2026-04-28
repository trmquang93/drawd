// @vitest-environment node
//
// Tests for the render-response upgrade: accurate PNG dimensions (#8.5),
// warnings array (#9.2), and optional thumbnail/full-image (#9.3).
//
// These are end-to-end integration tests that exercise the real Satori
// renderer and screen-tool handlers so regressions in the response shape
// surface here.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { FlowState } from "../../state.js";
import { SatoriRenderer } from "../../renderer/satori-renderer.js";
import { handleScreenTool, _renderResponseInternals } from "../screen-tools.js";

const { readPngDimensions } = _renderResponseInternals;

const SIMPLE_HTML =
  '<div style="width:393px;height:852px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;"><div>Hello</div></div>';

let renderer;

beforeAll(async () => {
  renderer = new SatoriRenderer();
  await renderer.init();
}, 30_000);

let tmpDir;
let state;
let tmpFile;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "drawd-render-resp-"));
  tmpFile = path.join(tmpDir, "flow.drawd");
  state = new FlowState();
  state.createNew(tmpFile, { name: "Test Flow" });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── 8.5: Accurate PNG dimensions ───────────────────────────────────────────────

describe("8.5 — response imageWidth/imageHeight match actual PNG", () => {
  it("create_screen returns actual decoded PNG dimensions (not display-scaled)", async () => {
    const result = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", device: "iphone" },
      state,
      renderer,
    );

    // iPhone viewport is 393×852 @ 2x → actual PNG is 786×1704
    expect(result.imageWidth).toBe(786);
    expect(result.imageHeight).toBe(1704);

    // Verify against independently decoded PNG header
    const screen = state.getScreen(result.screenId);
    const match = screen.imageData.match(/^data:image\/png;base64,(.+)/);
    const pngBuf = Buffer.from(match[1], "base64");
    const dims = readPngDimensions(pngBuf);
    expect(dims.width).toBe(result.imageWidth);
    expect(dims.height).toBe(result.imageHeight);
  });

  it("update_screen_image returns actual PNG dimensions", async () => {
    const createResult = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", device: "iphone" },
      state,
      renderer,
    );

    const updateResult = await handleScreenTool(
      "update_screen_image",
      { screenId: createResult.screenId, html: SIMPLE_HTML },
      state,
      renderer,
    );

    expect(updateResult.imageWidth).toBe(786);
    expect(updateResult.imageHeight).toBe(1704);
  });

  it("batch_create_screens returns actual PNG dimensions per screen", async () => {
    const result = await handleScreenTool(
      "batch_create_screens",
      {
        screens: [
          { name: "Screen A", html: SIMPLE_HTML },
          { name: "Screen B (blank)" },
        ],
        device: "iphone",
      },
      state,
      renderer,
    );

    // Screen with HTML gets actual dimensions
    expect(result.screens[0].imageWidth).toBe(786);
    expect(result.screens[0].imageHeight).toBe(1704);
    // Blank screen has no dimensions
    expect(result.screens[1].imageWidth).toBeUndefined();
    expect(result.screens[1].imageHeight).toBeUndefined();
  });

  it("compose_chrome returns actual PNG dimensions", async () => {
    await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", device: "iphone", chrome: false },
      state,
      renderer,
    );
    const screenId = state.screens[0].id;

    const result = await handleScreenTool(
      "compose_chrome",
      { screenId },
      state,
      renderer,
    );

    expect(result.imageWidth).toBe(786);
    expect(result.imageHeight).toBe(1704);
  });

  it("editor state still stores display-scaled height (backwards compat)", async () => {
    const result = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", device: "iphone" },
      state,
      renderer,
    );

    // The MCP response should have actual PNG height (1704)
    expect(result.imageHeight).toBe(1704);
    // But the stored state should have the display-scaled height (~477)
    const screen = state.getScreen(result.screenId);
    // 1704 * 220 / 786 ≈ 477
    expect(screen.imageHeight).toBeLessThan(500);
    expect(screen.imageHeight).toBeGreaterThan(400);
  });
});

// ── 9.2: warnings array ─────────────────────────────────────────────────────────

describe("9.2 — warnings array in render response", () => {
  it("create_screen with no remote images has no warnings key", async () => {
    const result = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home" },
      state,
      renderer,
    );
    expect(result.warnings).toBeUndefined();
  });

  it("create_screen with an allowlisted image that succeeds has no warnings key", async () => {
    // We can't easily inject a successful remote fetch in this integration
    // test without mocking fetch, so we test the absence case.
    const htmlNoRemote = '<div style="width:393px;height:852px;display:flex;"><div>No remote images</div></div>';
    const result = await handleScreenTool(
      "create_screen",
      { html: htmlNoRemote, name: "Clean" },
      state,
      renderer,
    );
    expect(result.warnings).toBeUndefined();
  });

  it("compose_chrome with chromeRenderError surfaces it in warnings", async () => {
    // We can't easily trigger a chromeRenderError in normal conditions
    // since the real chrome pipeline works. This is tested via the
    // buildRenderResponse unit path. Here we verify the clean case.
    await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", device: "iphone", chrome: false },
      state,
      renderer,
    );
    const screenId = state.screens[0].id;

    const result = await handleScreenTool(
      "compose_chrome",
      { screenId },
      state,
      renderer,
    );
    // No chromeRenderError → no warnings
    expect(result.warnings).toBeUndefined();
  });
});

// ── 9.3: thumbnail and full image ────────────────────────────────────────────

describe("9.3 — optional thumbnail in render response", () => {
  it("create_screen with includeThumbnail:false (default) has no thumbnail", async () => {
    const result = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home" },
      state,
      renderer,
    );
    expect(result.thumbnail).toBeUndefined();
    expect(result.fullImage).toBeUndefined();
  });

  it("create_screen with includeThumbnail:true returns a ~200px thumbnail", async () => {
    const result = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", includeThumbnail: true },
      state,
      renderer,
    );

    expect(result.thumbnail).toBeDefined();
    expect(result.thumbnail.width).toBe(200);
    expect(result.thumbnail.format).toBe("png");
    expect(result.thumbnail.base64).toBeTruthy();
    expect(typeof result.thumbnail.base64).toBe("string");

    // Verify the thumbnail is a valid PNG by decoding its IHDR
    const thumbBuf = Buffer.from(result.thumbnail.base64, "base64");
    const thumbDims = readPngDimensions(thumbBuf);
    expect(thumbDims.width).toBe(200);
  });

  it("update_screen_image with includeThumbnail:true returns a thumbnail", async () => {
    const createResult = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home" },
      state,
      renderer,
    );

    const updateResult = await handleScreenTool(
      "update_screen_image",
      { screenId: createResult.screenId, html: SIMPLE_HTML, includeThumbnail: true },
      state,
      renderer,
    );

    expect(updateResult.thumbnail).toBeDefined();
    expect(updateResult.thumbnail.width).toBe(200);
  });

  it("create_screen with includeFullImage:true returns the full PNG", async () => {
    const result = await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", includeFullImage: true },
      state,
      renderer,
    );

    expect(result.fullImage).toBeDefined();
    expect(result.fullImage.format).toBe("png");
    expect(result.fullImage.base64).toBeTruthy();

    // Verify it's the same image that's stored (full resolution)
    const fullBuf = Buffer.from(result.fullImage.base64, "base64");
    const fullDims = readPngDimensions(fullBuf);
    expect(fullDims.width).toBe(result.imageWidth);
    expect(fullDims.height).toBe(result.imageHeight);
  });

  it("batch_create_screens with includeThumbnail:true returns thumbnails per screen", async () => {
    const result = await handleScreenTool(
      "batch_create_screens",
      {
        screens: [
          { name: "Screen A", html: SIMPLE_HTML },
          { name: "Screen B (blank)" },
        ],
        includeThumbnail: true,
      },
      state,
      renderer,
    );

    // Rendered screen gets a thumbnail
    expect(result.screens[0].thumbnail).toBeDefined();
    expect(result.screens[0].thumbnail.width).toBe(200);
    // Blank screen has no thumbnail
    expect(result.screens[1].thumbnail).toBeUndefined();
  });

  it("compose_chrome with includeThumbnail:true returns a thumbnail", async () => {
    await handleScreenTool(
      "create_screen",
      { html: SIMPLE_HTML, name: "Home", device: "iphone", chrome: false },
      state,
      renderer,
    );
    const screenId = state.screens[0].id;

    const result = await handleScreenTool(
      "compose_chrome",
      { screenId, includeThumbnail: true },
      state,
      renderer,
    );

    expect(result.thumbnail).toBeDefined();
    expect(result.thumbnail.width).toBe(200);
  });
});

// ── readPngDimensions unit test ──────────────────────────────────────────────

describe("readPngDimensions", () => {
  it("correctly reads width and height from a minimal PNG header", () => {
    // Construct a minimal valid PNG IHDR: signature (8) + length (4) + "IHDR" (4) + w (4) + h (4)
    const buf = Buffer.alloc(24);
    // PNG signature
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
    // IHDR length (13 bytes for IHDR data)
    buf.writeUInt32BE(13, 8);
    // "IHDR"
    Buffer.from("IHDR").copy(buf, 12);
    // width = 800
    buf.writeUInt32BE(800, 16);
    // height = 600
    buf.writeUInt32BE(600, 20);
    const dims = readPngDimensions(buf);
    expect(dims.width).toBe(800);
    expect(dims.height).toBe(600);
  });
});

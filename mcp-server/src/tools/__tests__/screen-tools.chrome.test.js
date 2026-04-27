// @vitest-environment node
//
// Phase 3/4 integration tests for the chrome-aware screen tools. Drives the
// real SatoriRenderer + chrome composition + state persistence end-to-end so
// regressions in the schema, the device-block plumbing, or the
// compose_chrome / get_chrome_info handlers surface here.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { FlowState } from "../../state.js";
import { SatoriRenderer } from "../../renderer/satori-renderer.js";
import { handleScreenTool, screenTools } from "../screen-tools.js";

const SIMPLE_HTML =
  '<div style="width:393px;height:852px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;"><div>Hello</div></div>';

const ANDROID_HTML =
  '<div style="width:412px;height:915px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;"><div>Hello</div></div>';

let renderer;

beforeAll(async () => {
  renderer = new SatoriRenderer();
  await renderer.init();
}, 30_000);

let tmpDir;
let state;
let tmpFile;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "drawd-chrome-"));
  tmpFile = path.join(tmpDir, "flow.drawd");
  state = new FlowState();
  state.createNew(tmpFile, { name: "Test Flow" });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("screen-tools chrome integration", () => {
  describe("schema", () => {
    it("registers compose_chrome and get_chrome_info", () => {
      const names = screenTools.map((t) => t.name);
      expect(names).toContain("compose_chrome");
      expect(names).toContain("get_chrome_info");
    });

    it("constrains create_screen.device to the two supported devices", () => {
      const create = screenTools.find((t) => t.name === "create_screen");
      expect(create.inputSchema.properties.device.enum).toEqual(["iphone", "android"]);
    });

    it("exposes chrome and chromeStyle on render-producing tools", () => {
      const renderTools = ["create_screen", "update_screen_image", "batch_create_screens"];
      for (const name of renderTools) {
        const tool = screenTools.find((t) => t.name === name);
        expect(tool.inputSchema.properties.chrome).toBeDefined();
        expect(tool.inputSchema.properties.chromeStyle.enum).toEqual(["light", "dark"]);
      }
    });
  });

  describe("create_screen with default chrome", () => {
    it("persists a device block with auto-expanded chrome and safeArea", async () => {
      const result = await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Home", device: "iphone" },
        state,
        renderer,
      );

      expect(result.device).toEqual({
        preset: "iphone",
        chrome: ["status-bar-ios", "dynamic-island", "home-indicator"],
        chromeStyle: "light",
        safeArea: { top: 59, bottom: 34, left: 0, right: 0 },
      });

      // Round-trip through the file: save → reload → device block survives
      state.save();
      const reloaded = new FlowState();
      reloaded.load(tmpFile);
      expect(reloaded.screens[0].device).toEqual(result.device);
    });

    it("respects an explicit chrome subset", async () => {
      const result = await handleScreenTool(
        "create_screen",
        {
          html: SIMPLE_HTML,
          name: "Home",
          device: "iphone",
          chrome: ["status-bar-ios"],
        },
        state,
        renderer,
      );
      expect(result.device.chrome).toEqual(["status-bar-ios"]);
      expect(result.device.safeArea).toEqual({ top: 54, bottom: 0, left: 0, right: 0 });
    });

    it("returns a null device block when custom width/height bypasses presets", async () => {
      const result = await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Custom", width: 500, height: 500 },
        state,
        renderer,
      );
      expect(result.device).toBeNull();
      expect(state.screens[0].device).toBeNull();
    });

    it("renders Android with its auto chrome set", async () => {
      const result = await handleScreenTool(
        "create_screen",
        { html: ANDROID_HTML, name: "Android Home", device: "android" },
        state,
        renderer,
      );
      expect(result.device.preset).toBe("android");
      expect(result.device.chrome).toEqual(["status-bar-android", "android-gesture-pill"]);
      expect(result.device.safeArea).toEqual({ top: 36, bottom: 16, left: 0, right: 0 });
    });
  });

  describe("update_screen_image", () => {
    it("inherits the persisted device when caller doesn't override", async () => {
      // Create with iPhone + dark chrome
      await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Home", device: "iphone", chromeStyle: "dark" },
        state,
        renderer,
      );
      const screenId = state.screens[0].id;

      // Update with new HTML but no device/style — should keep iphone+dark
      await handleScreenTool(
        "update_screen_image",
        { screenId, html: SIMPLE_HTML },
        state,
        renderer,
      );
      expect(state.screens[0].device.preset).toBe("iphone");
      expect(state.screens[0].device.chromeStyle).toBe("dark");
    });
  });

  describe("list_screens", () => {
    it("includes the device summary block when present", async () => {
      await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Home", device: "iphone" },
        state,
        renderer,
      );
      const result = await handleScreenTool("list_screens", {}, state, renderer);
      expect(result.screens[0].device).toEqual({
        preset: "iphone",
        chrome: ["status-bar-ios", "dynamic-island", "home-indicator"],
        chromeStyle: "light",
        safeArea: { top: 59, bottom: 34, left: 0, right: 0 },
      });
    });

    it("omits the device block when no chrome was applied", async () => {
      await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Custom", width: 500, height: 500 },
        state,
        renderer,
      );
      const result = await handleScreenTool("list_screens", {}, state, renderer);
      expect(result.screens[0].device).toBeUndefined();
    });
  });

  describe("compose_chrome", () => {
    it("updates an existing screen's image and device block", async () => {
      // First, create a screen WITHOUT chrome
      await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Home", device: "iphone", chrome: false },
        state,
        renderer,
      );
      const screenId = state.screens[0].id;
      // device block should reflect the no-chrome state
      expect(state.screens[0].device.chrome).toEqual([]);

      // Now compose chrome on it
      const result = await handleScreenTool(
        "compose_chrome",
        { screenId },
        state,
        renderer,
      );
      expect(result.success).toBe(true);
      expect(result.device.preset).toBe("iphone");
      expect(result.device.chrome).toEqual([
        "status-bar-ios",
        "dynamic-island",
        "home-indicator",
      ]);
      expect(state.screens[0].device.safeArea).toEqual({ top: 59, bottom: 34, left: 0, right: 0 });
    });

    it("throws a friendly error when device cannot be inferred", async () => {
      await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Custom", width: 500, height: 500 },
        state,
        renderer,
      );
      const screenId = state.screens[0].id;
      await expect(
        handleScreenTool("compose_chrome", { screenId }, state, renderer),
      ).rejects.toThrow(/Cannot infer device/);
    });

    it("uses an explicit device argument when no persisted device exists", async () => {
      // Create with custom dimensions matching iphone @2x (786×1704)
      await handleScreenTool(
        "create_screen",
        { html: SIMPLE_HTML, name: "Custom", width: 393, height: 852 },
        state,
        renderer,
      );
      const screenId = state.screens[0].id;
      // strip the persisted device manually so we exercise the fallback
      state.screens[0].device = null;

      const result = await handleScreenTool(
        "compose_chrome",
        { screenId, device: "iphone" },
        state,
        renderer,
      );
      expect(result.device.preset).toBe("iphone");
    });
  });

  describe("get_chrome_info", () => {
    it("returns the full catalog when called with no args", async () => {
      const info = await handleScreenTool("get_chrome_info", {}, state, renderer);
      expect(info.devices).toHaveLength(2);
      expect(info.devices.map((d) => d.device).sort()).toEqual(["android", "iphone"]);
      expect(info.elements.length).toBeGreaterThanOrEqual(5);
    });

    it("returns auto chrome + safeArea for a single device", async () => {
      const info = await handleScreenTool("get_chrome_info", { device: "iphone" }, state, renderer);
      expect(info.device).toBe("iphone");
      expect(info.chrome).toEqual([
        "status-bar-ios",
        "dynamic-island",
        "home-indicator",
      ]);
      expect(info.safeArea).toEqual({ top: 59, bottom: 34, left: 0, right: 0 });
    });

    it("computes safeArea for an explicit chrome subset", async () => {
      const info = await handleScreenTool(
        "get_chrome_info",
        { device: "iphone", chrome: ["status-bar-ios"] },
        state,
        renderer,
      );
      expect(info.chrome).toEqual(["status-bar-ios"]);
      expect(info.safeArea).toEqual({ top: 54, bottom: 0, left: 0, right: 0 });
    });
  });
});

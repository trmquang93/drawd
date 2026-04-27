import { DEFAULT_SCREEN_WIDTH } from "../../../src/constants.js";
import {
  SUPPORTED_DEVICES,
  CHROME_IDS,
  getChromeInfo,
} from "../renderer/chrome/index.js";
import { inferDeviceFromDimensions } from "../renderer/device-presets.js";

// Shared schema fragments. The chrome system is the same shape on every
// render-producing tool, so we describe it once and reuse the description.
const CHROME_DESC =
  "Device chrome compositing. Pass \"auto\" (default) to apply the device's standard chrome (status bar + dynamic island/home indicator on iPhone, status bar + gesture pill on Android). Pass false to skip chrome entirely. Pass an explicit array of chrome ids to override (e.g. [\"status-bar-ios\"]). Available ids: " +
  CHROME_IDS.join(", ") +
  ". Chrome is composited on top of the rendered HTML — design HTML for the FULL viewport and respect the device safeArea returned by get_chrome_info.";

const CHROME_STYLE_DESC =
  "Chrome palette. \"light\" (default) uses dark glyphs on a transparent base — appropriate for light app screens. \"dark\" uses white glyphs — use when the app screen has a dark/photo background.";

const DEVICE_DESC =
  "Device preset for viewport size and chrome geometry. \"iphone\" = 393×852 (modern Pro class). \"android\" = 412×915 (Pixel class). Defaults to \"iphone\" when omitted unless explicit width/height is given.";

export const screenTools = [
  {
    name: "create_screen",
    description: "Create a new screen by rendering HTML content to an image. If no position is specified, the screen is auto-placed on a grid layout. Device chrome (status bar, home indicator/gesture pill, etc.) is composited automatically — design HTML for the full viewport and respect the device safe-area returned by get_chrome_info.",
    inputSchema: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML content to render as the screen image. Rendered by Satori (not a browser), so layout rules differ from standard HTML: (1) Use inline styles only — no <style> tags or CSS classes. (2) Every element MUST have display:flex if it has more than one child — default block/inline layout does not exist. Use flex-direction:column for vertical stacking, flex-direction:row for horizontal. (3) Wrap all text in a <div> — bare text nodes inside flex containers may be ignored. (4) Supported CSS: flexbox, colors, fonts (Inter only), borders, border-radius, padding, margin, background, linear-gradient, box-shadow, opacity, overflow, text styling. NOT supported: grid, position:absolute, transform, pseudo-elements, media queries. (5) Figma-compatible text — screens are often copied to Figma as editable nodes; follow these rules to prevent text wrapping: add white-space:nowrap to every text-leaf div; in flex rows using justify-content:space-between give the left child flex:1 and the right child flex-shrink:0; add overflow:hidden to card/field container divs; add flex-shrink:0 to icon, avatar, and badge elements." },
        name: { type: "string", description: "Screen name (e.g., 'Login Screen', 'Home Feed')" },
        device: {
          type: "string",
          description: DEVICE_DESC,
          enum: SUPPORTED_DEVICES,
        },
        width: { type: "number", description: "Custom viewport width (overrides device preset; disables chrome)" },
        height: { type: "number", description: "Custom viewport height (overrides device preset; disables chrome)" },
        chrome: { description: CHROME_DESC },
        chromeStyle: {
          type: "string",
          description: CHROME_STYLE_DESC,
          enum: ["light", "dark"],
        },
        position: {
          type: "object",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
          },
          description: "Canvas position. If omitted, auto-placed on grid.",
        },
        description: { type: "string", description: "Screen description for AI instruction generation" },
        notes: { type: "string", description: "Implementation notes (technical context, edge cases)" },
      },
      required: ["html", "name"],
    },
  },
  {
    name: "create_blank_screen",
    description: "Create a blank screen placeholder without an image. Useful for screens that are 'to be designed' later.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Screen name" },
        description: { type: "string", description: "Screen description" },
        notes: { type: "string", description: "Implementation notes" },
        position: {
          type: "object",
          properties: { x: { type: "number" }, y: { type: "number" } },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_screen",
    description: "Update properties of an existing screen (name, description, notes, status, etc.). To mark a screen as a reusable component, set componentRole to 'canonical' and supply a componentId (any unique string). To mark a screen as an instance of an existing component, set componentRole to 'instance' and pass the same componentId as the canonical. To unlink, set both to null.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen to update" },
        name: { type: "string" },
        description: { type: "string" },
        notes: { type: "string" },
        status: { type: "string", enum: ["new", "existing"] },
        tbd: { type: "boolean" },
        tbdNote: { type: "string" },
        roles: { type: "array", items: { type: "string" } },
        codeRef: { type: "string" },
        componentId: { type: ["string", "null"], description: "Reusable component group key. All screens sharing a componentId belong to the same component. Pass null to unlink." },
        componentRole: { type: ["string", "null"], enum: ["canonical", "instance", null], description: "Role within the component group. 'canonical' = owns the spec; 'instance' = references the canonical's spec. Pass null to unlink." },
      },
      required: ["screenId"],
    },
  },
  {
    name: "delete_screen",
    description: "Delete a screen and all its associated connections.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen to delete" },
      },
      required: ["screenId"],
    },
  },
  {
    name: "list_screens",
    description: "List all screens in the current flow with summary info (without image data). The 'device' summary block is present only when chrome was rendered for that screen.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_screen",
    description: "Get full details of a specific screen, including hotspots and (if present) the persisted device/chrome/safeArea block. Image data is excluded by default to keep responses small. When included, the image is downsampled to 400 px wide by default to reduce token cost; pass imageMaxWidth: 0 for the original full-resolution image.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen" },
        includeImage: { type: "boolean", description: "Include base64 imageData in response (default: false)" },
        imageMaxWidth: { type: "number", description: "Max width in px for the returned image. Image is re-rendered from SVG at this width to reduce base64 size and token cost. Pass 0 to disable resizing and return the original full-resolution image. Default: 400" },
      },
      required: ["screenId"],
    },
  },
  {
    name: "get_screen_code",
    description: "Get the source HTML for a screen that was created with code (via create_screen, batch_create_screens, update_screen_image, or Figma paste). Returns hasCode:false when the screen has no stored source (e.g., uploaded image or blank screen).",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen" },
      },
      required: ["screenId"],
    },
  },
  {
    name: "update_screen_image",
    description: "Re-render a screen's image from new HTML content. Device chrome is re-applied with the same rules as create_screen — pass chrome:false to opt out.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen to update" },
        html: { type: "string", description: "New HTML content to render. Use inline styles only. Every element with multiple children must have display:flex. See create_screen for full rendering constraints including Figma-compatibility rules (white-space:nowrap on text leaves, flex:1/flex-shrink:0 in space-between rows, overflow:hidden on containers)." },
        device: {
          type: "string",
          description: DEVICE_DESC,
          enum: SUPPORTED_DEVICES,
        },
        chrome: { description: CHROME_DESC },
        chromeStyle: {
          type: "string",
          description: CHROME_STYLE_DESC,
          enum: ["light", "dark"],
        },
      },
      required: ["screenId", "html"],
    },
  },
  {
    name: "batch_create_screens",
    description: "Create multiple screens at once with auto-layout grid placement. Each screen can have HTML content or be blank. Device, chrome, and chromeStyle apply uniformly to every rendered screen in the batch.",
    inputSchema: {
      type: "object",
      properties: {
        screens: {
          type: "array",
          items: {
            type: "object",
            properties: {
              html: { type: "string", description: "HTML content (omit for blank screen). Same Satori and Figma-compatibility rules as create_screen apply: inline styles only, display:flex on multi-child elements, white-space:nowrap on text leaves, overflow:hidden on containers." },
              name: { type: "string" },
              description: { type: "string" },
              notes: { type: "string" },
            },
            required: ["name"],
          },
          description: "Array of screen definitions",
        },
        device: {
          type: "string",
          description: DEVICE_DESC + " Defaults to \"iphone\" for the whole batch.",
          enum: SUPPORTED_DEVICES,
        },
        chrome: { description: CHROME_DESC },
        chromeStyle: {
          type: "string",
          description: CHROME_STYLE_DESC,
          enum: ["light", "dark"],
        },
      },
      required: ["screens"],
    },
  },
  {
    name: "compose_chrome",
    description: "Composite device chrome onto an existing screen (one created from upload, Figma paste, or previously rendered with chrome:false). Re-renders the screen image with status bar / home indicator / gesture pill applied and updates the persisted device block. Device is resolved in this order: (1) screen's own device.preset if set, (2) the device argument, (3) inferred from image dimensions. Throws when no device can be resolved.",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen to chrome" },
        device: {
          type: "string",
          description: "Override or supply the device preset. Required when the screen has no persisted device and dimensions don't match a known preset.",
          enum: SUPPORTED_DEVICES,
        },
        chrome: { description: CHROME_DESC },
        chromeStyle: {
          type: "string",
          description: CHROME_STYLE_DESC,
          enum: ["light", "dark"],
        },
      },
      required: ["screenId"],
    },
  },
  {
    name: "get_chrome_info",
    description: "Query the chrome subsystem for safe-area, auto-expansion, and the catalog of supported devices/elements. Call this BEFORE authoring HTML so your layout respects the device's safe area — e.g. on iPhone with auto chrome, top safeArea is 59 px and bottom is 34 px, so place primary content within those margins. Three call shapes: (1) no args → full catalog of devices + elements. (2) {device} → auto-chrome + safeArea for that device. (3) {device, chrome:[...]} → safeArea for an explicit chrome subset.",
    inputSchema: {
      type: "object",
      properties: {
        device: {
          type: "string",
          description: "Device to query. Omit for the full catalog.",
          enum: SUPPORTED_DEVICES,
        },
        chrome: { description: "Optional explicit chrome subset to compute safe-area for. If omitted with device set, the device's auto-chrome is used." },
      },
    },
  },
];

// The editor stores imageHeight as the *displayed* height on the canvas card,
// not the raw pixel height. The image renders at 100% of the card's content
// width (DEFAULT_SCREEN_WIDTH), so we must scale accordingly.
function displayedImageHeight(rawWidth, rawHeight) {
  if (!rawWidth || !rawHeight) return null;
  return Math.round(rawHeight * DEFAULT_SCREEN_WIDTH / rawWidth);
}

// Build the persisted device block for a screen. Returns null when the
// renderer didn't apply chrome (custom width/height with no device, or
// device-but-chrome:false on an unsupported device).
function buildDeviceBlock(renderResult) {
  if (!renderResult || !renderResult.device) return null;
  return {
    preset: renderResult.device,
    chrome: renderResult.chrome || [],
    chromeStyle: renderResult.chromeStyle || "light",
    safeArea: renderResult.safeArea || { top: 0, bottom: 0, left: 0, right: 0 },
  };
}

export async function handleScreenTool(name, args, state, renderer) {
  switch (name) {
    case "create_screen": {
      let imageData = null;
      let imageWidth = null;
      let imageHeight = null;
      let svgContent = null;
      let deviceBlock = null;
      const sourceHtml = args.html || null;

      if (args.html) {
        const result = await renderer.render(args.html, {
          device: args.device,
          width: args.width,
          height: args.height,
          chrome: args.chrome,
          chromeStyle: args.chromeStyle,
        });
        imageData = renderer.toDataUri(result.pngBuffer);
        imageWidth = result.width;
        imageHeight = displayedImageHeight(result.width, result.height);
        svgContent = result.svgString || null;
        deviceBlock = buildDeviceBlock(result);
      }

      const screen = state.addScreen({
        name: args.name,
        imageData,
        imageWidth,
        imageHeight,
        svgContent,
        sourceHtml,
        position: args.position,
        description: args.description,
        notes: args.notes,
        device: deviceBlock,
      });

      return {
        screenId: screen.id,
        name: screen.name,
        x: screen.x,
        y: screen.y,
        imageWidth,
        imageHeight,
        device: deviceBlock,
      };
    }

    case "create_blank_screen": {
      const screen = state.addScreen({
        name: args.name,
        description: args.description,
        notes: args.notes,
        position: args.position,
        tbd: true,
      });
      return { screenId: screen.id, name: screen.name, x: screen.x, y: screen.y };
    }

    case "update_screen": {
      const { screenId, ...updates } = args;
      const screen = state.updateScreen(screenId, updates);
      return { success: true, screenId: screen.id };
    }

    case "delete_screen": {
      const result = state.deleteScreen(args.screenId);
      return { success: true, ...result };
    }

    case "list_screens": {
      return {
        screens: state.screens.map((s) => ({
          id: s.id,
          name: s.name,
          x: s.x,
          y: s.y,
          hotspotCount: (s.hotspots || []).length,
          hasImage: !!s.imageData,
          hasCode: !!s.sourceHtml,
          description: s.description || "",
          status: s.status || "new",
          tbd: s.tbd || false,
          ...(s.device
            ? {
                device: {
                  preset: s.device.preset,
                  chrome: s.device.chrome,
                  chromeStyle: s.device.chromeStyle,
                  safeArea: s.device.safeArea,
                },
              }
            : {}),
        })),
      };
    }

    case "get_screen": {
      const screen = state.getScreen(args.screenId);
      if (!screen) throw new Error(`Screen not found: ${args.screenId}`);

      const result = { ...screen };
      if (!args.includeImage) {
        delete result.imageData;
        result.hasImage = !!screen.imageData;
        return result;
      }

      // Return image as a native MCP image content block so multimodal LLMs can see it
      const imageData = result.imageData;
      delete result.imageData;
      result.hasImage = !!imageData;

      const maxWidth = args.imageMaxWidth ?? 400;

      const content = [
        { type: "text", text: JSON.stringify(result, null, 2) },
      ];
      if (imageData) {
        const match = imageData.match(/^data:image\/([^;]+);base64,/);
        if (match) {
          const rawBase64 = imageData.slice(match[0].length);
          const subtype = match[1]; // e.g. "png", "jpeg", "svg+xml"

          if (subtype === "svg+xml") {
            // MCP image blocks don't support SVG; convert to PNG via resvg
            try {
              const { Resvg } = await import("@resvg/resvg-js");
              const svgString = Buffer.from(rawBase64, "base64").toString("utf-8");
              const resvg = new Resvg(svgString, { fitTo: { mode: "original" } });
              const pngBuffer = resvg.render().asPng();
              const pngBase64 = Buffer.from(pngBuffer).toString("base64");
              content.push({ type: "image", data: pngBase64, mimeType: "image/png" });
            } catch {
              content.push({ type: "text", text: "[SVG image — could not convert to PNG]" });
            }
          } else if (maxWidth > 0 && screen.svgContent && screen.imageWidth > maxWidth) {
            // Re-render a smaller PNG from the stored SVG to cut token cost
            try {
              const { Resvg } = await import("@resvg/resvg-js");
              const resvg = new Resvg(screen.svgContent, { fitTo: { mode: "width", value: maxWidth } });
              const pngBase64 = Buffer.from(resvg.render().asPng()).toString("base64");
              content.push({ type: "image", data: pngBase64, mimeType: "image/png" });
            } catch {
              content.push({ type: "image", data: rawBase64, mimeType: `image/${subtype}` });
            }
          } else {
            content.push({ type: "image", data: rawBase64, mimeType: `image/${subtype}` });
          }
        }
      }
      return { __contentBlocks: content };
    }

    case "get_screen_code": {
      const screen = state.getScreen(args.screenId);
      if (!screen) throw new Error(`Screen not found: ${args.screenId}`);
      return {
        screenId: screen.id,
        name: screen.name,
        hasCode: !!screen.sourceHtml,
        sourceHtml: screen.sourceHtml,
        figmaSource: screen.figmaSource,
      };
    }

    case "update_screen_image": {
      const screen = state.getScreen(args.screenId);
      if (!screen) throw new Error(`Screen not found: ${args.screenId}`);

      // Inherit device from the screen's own previously persisted block when
      // the caller doesn't override. Same for chromeStyle. This keeps a
      // re-render visually consistent with the original.
      const inheritedDevice = args.device || screen.device?.preset;
      const inheritedStyle = args.chromeStyle || screen.device?.chromeStyle;

      const result = await renderer.render(args.html, {
        device: inheritedDevice,
        chrome: args.chrome,
        chromeStyle: inheritedStyle,
      });
      const imgHeight = displayedImageHeight(result.width, result.height);
      const deviceBlock = buildDeviceBlock(result);
      state.updateScreen(args.screenId, {
        imageData: renderer.toDataUri(result.pngBuffer),
        imageWidth: result.width,
        imageHeight: imgHeight,
        svgContent: result.svgString || null,
        sourceHtml: args.html,
        device: deviceBlock,
      });

      return { success: true, imageWidth: result.width, imageHeight: imgHeight, device: deviceBlock };
    }

    case "batch_create_screens": {
      const results = [];
      for (const def of args.screens) {
        let imageData = null;
        let imageWidth = null;
        let imageHeight = null;
        let svgContent = null;
        let deviceBlock = null;

        if (def.html) {
          const result = await renderer.render(def.html, {
            device: args.device,
            chrome: args.chrome,
            chromeStyle: args.chromeStyle,
          });
          imageData = renderer.toDataUri(result.pngBuffer);
          imageWidth = result.width;
          imageHeight = displayedImageHeight(result.width, result.height);
          svgContent = result.svgString || null;
          deviceBlock = buildDeviceBlock(result);
        }

        const screen = state.addScreen({
          name: def.name,
          imageData,
          imageWidth,
          imageHeight,
          svgContent,
          sourceHtml: def.html || null,
          description: def.description,
          notes: def.notes,
          tbd: !def.html,
          device: deviceBlock,
        });

        results.push({
          screenId: screen.id,
          name: screen.name,
          x: screen.x,
          y: screen.y,
          ...(deviceBlock ? { device: deviceBlock } : {}),
        });
      }
      return { screens: results };
    }

    case "compose_chrome": {
      const screen = state.getScreen(args.screenId);
      if (!screen) throw new Error(`Screen not found: ${args.screenId}`);

      // Device-resolution priority:
      //   1. screen's persisted device.preset (round-trip on a Drawd-rendered screen)
      //   2. the explicit `device` argument
      //   3. infer from image dimensions (uploaded PNGs that match a known preset)
      // Throw a friendly error if all three fail — the caller has to commit
      // to a device before we can emit chrome geometry.
      let resolvedDevice = screen.device?.preset || args.device;
      if (!resolvedDevice && screen.imageWidth && screen.imageHeight) {
        // For inference we use the *raw* render dimensions (imageWidth is in
        // device pixels — 786 for an iPhone @2x). The displayed height was
        // scaled, so compute the raw height back from the SVG aspect ratio.
        // Simpler: just pass imageWidth × the rendered height we have if we
        // can; otherwise rely on the preset's 2× output match.
        resolvedDevice = inferDeviceFromDimensions(screen.imageWidth, screen.imageHeight);
      }
      if (!resolvedDevice) {
        throw new Error(
          `Cannot infer device for screen "${screen.name}". Pass an explicit device argument (one of: ${SUPPORTED_DEVICES.join(", ")}).`
        );
      }

      // Prefer the cached SVG path when available (no PNG decode needed).
      // Falls back to the stored imageData URI.
      const baseSvg = screen.svgContent || undefined;
      const baseImageDataUri = baseSvg ? undefined : (screen.imageData || undefined);
      if (!baseSvg && !baseImageDataUri) {
        throw new Error(
          `Screen "${screen.name}" has no image to chrome. Add an image first via update_screen_image or upload.`
        );
      }

      const result = await renderer.composeChrome({
        baseSvg,
        baseImageDataUri,
        device: resolvedDevice,
        chrome: args.chrome,
        chromeStyle: args.chromeStyle || screen.device?.chromeStyle || "light",
      });

      const imgHeight = displayedImageHeight(result.width, result.height);
      const deviceBlock = buildDeviceBlock(result);

      state.updateScreen(args.screenId, {
        imageData: renderer.toDataUri(result.pngBuffer),
        imageWidth: result.width,
        imageHeight: imgHeight,
        svgContent: result.svgString || null,
        device: deviceBlock,
      });

      return {
        success: true,
        screenId: screen.id,
        device: deviceBlock,
        chromeRenderError: result.chromeRenderError || undefined,
      };
    }

    case "get_chrome_info": {
      // Pure function delegate — no state mutation.
      return getChromeInfo({ device: args.device, chrome: args.chrome });
    }

    default:
      throw new Error(`Unknown screen tool: ${name}`);
  }
}

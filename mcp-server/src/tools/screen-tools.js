import { DEFAULT_SCREEN_WIDTH } from "../../../src/constants.js";

export const screenTools = [
  {
    name: "create_screen",
    description: "Create a new screen by rendering HTML content to an image. If no position is specified, the screen is auto-placed on a grid layout.",
    inputSchema: {
      type: "object",
      properties: {
        html: { type: "string", description: "HTML content to render as the screen image. Rendered by Satori (not a browser), so layout rules differ from standard HTML: (1) Use inline styles only — no <style> tags or CSS classes. (2) Every element MUST have display:flex if it has more than one child — default block/inline layout does not exist. Use flex-direction:column for vertical stacking, flex-direction:row for horizontal. (3) Wrap all text in a <div> — bare text nodes inside flex containers may be ignored. (4) Supported CSS: flexbox, colors, fonts (Inter only), borders, border-radius, padding, margin, background, linear-gradient, box-shadow, opacity, overflow, text styling. NOT supported: grid, position:absolute, transform, pseudo-elements, media queries. (5) Figma-compatible text — screens are often copied to Figma as editable nodes; follow these rules to prevent text wrapping: add white-space:nowrap to every text-leaf div; in flex rows using justify-content:space-between give the left child flex:1 and the right child flex-shrink:0; add overflow:hidden to card/field container divs; add flex-shrink:0 to icon, avatar, and badge elements." },
        name: { type: "string", description: "Screen name (e.g., 'Login Screen', 'Home Feed')" },
        device: {
          type: "string",
          description: "Device preset for viewport size",
          enum: ["iphone-15-pro", "iphone-se", "iphone-16-pro-max", "ipad", "ipad-pro-13", "android", "android-tablet"],
        },
        width: { type: "number", description: "Custom viewport width (overrides device preset)" },
        height: { type: "number", description: "Custom viewport height (overrides device preset)" },
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
    description: "Update properties of an existing screen (name, description, notes, status, etc.).",
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
    description: "List all screens in the current flow with summary info (without image data).",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_screen",
    description: "Get full details of a specific screen, including hotspots. Image data is excluded by default to keep responses small. When included, the image is downsampled to 400 px wide by default to reduce token cost; pass imageMaxWidth: 0 for the original full-resolution image.",
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
    name: "update_screen_image",
    description: "Re-render a screen's image from new HTML content. Use inline styles only (no <style> tags).",
    inputSchema: {
      type: "object",
      properties: {
        screenId: { type: "string", description: "ID of the screen to update" },
        html: { type: "string", description: "New HTML content to render. Use inline styles only. Every element with multiple children must have display:flex. See create_screen for full rendering constraints including Figma-compatibility rules (white-space:nowrap on text leaves, flex:1/flex-shrink:0 in space-between rows, overflow:hidden on containers)." },
        device: {
          type: "string",
          enum: ["iphone-15-pro", "iphone-se", "iphone-16-pro-max", "ipad", "ipad-pro-13", "android", "android-tablet"],
        },
      },
      required: ["screenId", "html"],
    },
  },
  {
    name: "batch_create_screens",
    description: "Create multiple screens at once with auto-layout grid placement. Each screen can have HTML content or be blank.",
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
          description: "Device preset for all screens (default: iphone-15-pro)",
          enum: ["iphone-15-pro", "iphone-se", "iphone-16-pro-max", "ipad", "ipad-pro-13", "android", "android-tablet"],
        },
      },
      required: ["screens"],
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

export async function handleScreenTool(name, args, state, renderer) {
  switch (name) {
    case "create_screen": {
      let imageData = null;
      let imageWidth = null;
      let imageHeight = null;
      let svgContent = null;
      const sourceHtml = args.html || null;

      if (args.html) {
        const result = await renderer.render(args.html, {
          device: args.device,
          width: args.width,
          height: args.height,
        });
        imageData = renderer.toDataUri(result.pngBuffer);
        imageWidth = result.width;
        imageHeight = displayedImageHeight(result.width, result.height);
        svgContent = result.svgString || null;
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
      });

      return {
        screenId: screen.id,
        name: screen.name,
        x: screen.x,
        y: screen.y,
        imageWidth,
        imageHeight,
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
          description: s.description || "",
          status: s.status || "new",
          tbd: s.tbd || false,
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

    case "update_screen_image": {
      const screen = state.getScreen(args.screenId);
      if (!screen) throw new Error(`Screen not found: ${args.screenId}`);

      const result = await renderer.render(args.html, { device: args.device });
      const imgHeight = displayedImageHeight(result.width, result.height);
      state.updateScreen(args.screenId, {
        imageData: renderer.toDataUri(result.pngBuffer),
        imageWidth: result.width,
        imageHeight: imgHeight,
        svgContent: result.svgString || null,
        sourceHtml: args.html,
      });

      return { success: true, imageWidth: result.width, imageHeight: imgHeight };
    }

    case "batch_create_screens": {
      const results = [];
      for (const def of args.screens) {
        let imageData = null;
        let imageWidth = null;
        let imageHeight = null;
        let svgContent = null;

        if (def.html) {
          const result = await renderer.render(def.html, { device: args.device });
          imageData = renderer.toDataUri(result.pngBuffer);
          imageWidth = result.width;
          imageHeight = displayedImageHeight(result.width, result.height);
          svgContent = result.svgString || null;
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
        });

        results.push({ screenId: screen.id, name: screen.name, x: screen.x, y: screen.y });
      }
      return { screens: results };
    }

    default:
      throw new Error(`Unknown screen tool: ${name}`);
  }
}

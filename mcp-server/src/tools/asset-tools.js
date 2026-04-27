/**
 * Asset tools — icon and stock-photo discovery for the Drawd MCP.
 *
 * Three tools:
 *   - generate_icon       Fetch one Iconify icon by collection + name (SVG).
 *   - search_icons        Search Iconify and return ranked candidate IDs.
 *   - find_stock_image    Search photos via Unsplash/Pexels/Picsum chain.
 *
 * Per the implementation plan, search_stock_images was merged into
 * find_stock_image — one tool, returning N results.
 */

import {
  fetchIcon,
  searchIcons as iconifySearch,
  RECOMMENDED_COLLECTIONS,
} from "../asset-fetchers/iconify.js";
import { findStockImage } from "../asset-fetchers/index.js";

export const assetTools = [
  {
    name: "generate_icon",
    description:
      "Fetch an icon from Iconify (275k+ icons across collections like " +
      RECOMMENDED_COLLECTIONS.join(", ") +
      ") and return it as an inline SVG string. Embed the returned SVG verbatim in the screen HTML before calling create_screen — Satori renders SVG natively. Use color='currentColor' to inherit text color from the surrounding HTML.",
    inputSchema: {
      type: "object",
      properties: {
        collection: {
          type: "string",
          description:
            "Iconify collection prefix. Recommended: " +
            RECOMMENDED_COLLECTIONS.join(", ") +
            ". Slugs are lowercase letters/digits/hyphens only.",
        },
        name: {
          type: "string",
          description:
            "Icon name within the collection (e.g. 'home', 'chevron-right').",
        },
        size: {
          type: "number",
          description: "Width/height in CSS pixels. Default 24.",
        },
        color: {
          type: "string",
          description:
            "CSS color (hex, rgb, or 'currentColor'). Default 'currentColor'.",
        },
      },
      required: ["collection", "name"],
    },
  },
  {
    name: "search_icons",
    description:
      "Search Iconify across all (or one) collections for icons matching a query. Returns ranked candidate icon IDs. Pick one and pass it to generate_icon to fetch the SVG.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query (e.g. 'hamburger menu')." },
        collection: {
          type: "string",
          description:
            "Optional. Restrict search to one collection (e.g. 'mdi').",
        },
        limit: {
          type: "number",
          description: "Max results. Default 12, max 64.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "find_stock_image",
    description:
      "Search royalty-free photos from Unsplash, Pexels, or Picsum and return URLs with attribution. Embed via <img src=\"...\"> in screen HTML; the renderer will fetch and inline the bytes at PNG-render time. With no API keys configured, falls back to Picsum (deterministic seeded photos — note Picsum does not actually search by query). Set UNSPLASH_ACCESS_KEY and/or PEXELS_API_KEY env vars for query-relevant results.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Photo search query (e.g. 'modern kitchen')." },
        source: {
          type: "string",
          enum: ["unsplash", "pexels", "picsum"],
          description:
            "Optional. If omitted, tries unsplash → pexels → picsum based on configured keys. Picks the first provider that has a key; Picsum is always available.",
        },
        limit: {
          type: "number",
          description: "Max results. Default 5, max 20.",
        },
      },
      required: ["query"],
    },
  },
];

export async function handleAssetTool(name, args, _state) {
  switch (name) {
    case "generate_icon": {
      if (!args?.collection) throw new Error("collection is required");
      if (!args?.name) throw new Error("name is required");
      const size = Number.isFinite(args.size) ? args.size : 24;
      const color = typeof args.color === "string" && args.color
        ? args.color
        : "currentColor";
      const svg = await fetchIcon(args.collection, args.name, { size, color });
      return {
        svg,
        collection: args.collection,
        name: args.name,
        size,
        color,
      };
    }

    case "search_icons": {
      if (!args?.query) throw new Error("query is required");
      const { results, total } = await iconifySearch(args.query, {
        prefix: args.collection,
        limit: args.limit,
      });
      return { results, total };
    }

    case "find_stock_image": {
      if (!args?.query) throw new Error("query is required");
      const out = await findStockImage(args.query, {
        source: args.source,
        limit: args.limit,
      });
      return out;
    }

    default:
      throw new Error(`Unknown asset tool: ${name}`);
  }
}

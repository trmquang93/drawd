# Drawd MCP Server

Standalone [Model Context Protocol](https://modelcontextprotocol.io) server for AI agent integration with Drawd flow files.

## `create_screen_with_hotspots`

Create a screen with hotspots and connections in a single transactional call. If any sub-step fails, all changes are rolled back — the `.drawd` file is either fully updated or unchanged.

### Placeholders

| Placeholder | Resolves to |
|-------------|-------------|
| `@self` | The just-created screen |
| `@caller` | The screen specified by `callerScreenId` (required when used) |

### Example

```json
{
  "screen": {
    "name": "Paywall",
    "html": "<div style=\"display:flex;flex-direction:column;width:393px;height:852px;background:#1a1a2e;\">...</div>",
    "device": "iphone",
    "x": 1240,
    "y": 4450
  },
  "hotspots": [
    {
      "label": "Dismiss",
      "x": 85, "y": 4, "w": 10, "h": 6,
      "action": "navigate",
      "target": "@caller"
    },
    {
      "label": "Purchase",
      "x": 8, "y": 82, "w": 84, "h": 8,
      "action": "custom",
      "customDescription": "Trigger in-app purchase flow"
    }
  ],
  "connections": [
    {
      "fromHotspot": "Purchase",
      "to": "screen-id-of-success-page",
      "action": "navigate",
      "data_flow": [{ "name": "productId", "type": "String" }]
    }
  ],
  "callerScreenId": "screen-id-that-opened-paywall",
  "includeThumbnail": true
}
```

### Response

```json
{
  "screenId": "173...",
  "name": "Paywall",
  "x": 1240,
  "y": 4450,
  "hotspotIds": ["173...a", "173...b"],
  "connectionIds": ["173...c", "173...d"],
  "imageWidth": 786,
  "imageHeight": 1704,
  "device": { "preset": "iphone", "chrome": ["status-bar-ios", "home-indicator-ios"], "chromeStyle": "light", "safeArea": { "top": 59, "bottom": 34 } },
  "warnings": [],
  "thumbnail": { "width": 200, "format": "png", "base64": "..." }
}
```

### Validation rules

- Hotspot labels must be unique within the call.
- `callerScreenId` must be provided (and reference an existing screen) when any placeholder uses `@caller`.
- `connections[].fromHotspot` must match a label in the `hotspots` array.
- Duplicate connections (same from-screen + to-screen + hotspot) that were already auto-created by a hotspot's `target` are silently skipped.

# Drawd MCP Server

Standalone MCP server for AI agent integration with Drawd flows.

## Tools

### Flow & Screen Management

| Tool | Description |
|------|-------------|
| `open_flow` | Open an existing `.drawd` file |
| `create_flow` | Create a new empty flow |
| `save_flow` | Save the current flow to disk |
| `get_flow_info` | Get flow summary (screens, connections, metadata) |
| `list_screens` | List all screens with positions and metadata |
| `get_screen` | Get a screen's full data including rendered image |
| `get_screen_code` | Get a screen's source HTML |
| `create_screen` | Create a new screen from HTML content |
| `create_blank_screen` | Create a placeholder screen |
| `update_screen` | Update screen properties |
| `update_screen_image` | Re-render a screen's HTML to update its image |
| `delete_screen` | Delete a screen and its connections |

### Hotspots & Connections

| Tool | Description |
|------|-------------|
| `create_hotspot` | Add an interactive hotspot to a screen |
| `update_hotspot` | Update hotspot properties |
| `delete_hotspot` | Remove a hotspot |
| `list_hotspots` | List hotspots on a screen |
| `create_connection` | Create a navigation connection between screens |
| `update_connection` | Update connection properties |
| `delete_connection` | Remove a connection |
| `list_connections` | List all connections |

### Documents & Data Models

| Tool | Description |
|------|-------------|
| `create_document` | Create a reference document |
| `update_document` | Update document content |
| `delete_document` | Remove a document |
| `list_documents` | List all documents |
| `create_data_model` | Create a data model definition |
| `update_data_model` | Update data model fields |
| `delete_data_model` | Remove a data model |
| `list_data_models` | List all data models |

### Annotations & Comments

| Tool | Description |
|------|-------------|
| `create_sticky_note` | Add a sticky note to the canvas |
| `create_screen_group` | Group screens together |
| `update_screen_group` | Update group properties |
| `delete_screen_group` | Remove a screen group |
| `create_comment` | Add a comment to a screen or hotspot |
| `update_comment` | Edit comment text |
| `resolve_comment` | Mark a comment as resolved |
| `delete_comment` | Remove a comment |
| `list_comments` | List comments with optional filters |

### Generation & Analysis

| Tool | Description |
|------|-------------|
| `validate_flow` | Run pre-generation validation checks |
| `generate_instructions` | Generate AI build instructions from the flow |
| `get_screen_instructions` | Get detailed screen implementation specs |
| `get_navigation_instructions` | Get navigation architecture docs |
| `get_build_guide` | Get platform-specific implementation guide |
| `analyze_navigation` | Detect entry screens, tab bars, modals, loops |
| `get_design_tokens` | Extract dominant design tokens from flow screens |

### Design Tokens

The `get_design_tokens` tool parses stored screen HTML across the flow and returns the dominant design tokens ranked by per-screen frequency.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `scopeRoot` | `string` | Screen group ID to scope analysis to |
| `screenIds` | `string[]` | Explicit screen IDs to analyze (takes precedence over `scopeRoot`) |

**Response shape:**

```json
{
  "colors": {
    "background": ["#0B0B0F"],
    "surface": ["#1F1F29"],
    "text": ["#FFFFFF", "#A0A0AB"],
    "accent": ["#7C5CFF"]
  },
  "typography": {
    "fontFamilies": ["Inter"],
    "sizes": [12, 14, 16, 20, 28]
  },
  "radii": [8, 12, 9999],
  "spacing": [4, 8, 12, 16, 24],
  "_meta": {
    "screensAnalyzed": 8,
    "screensTotal": 10,
    "screensSkipped": 2
  }
}
```

**Color categorization heuristics:**

- **background**: `background-color` values appearing on 50%+ of analyzed screens
- **surface**: `background-color` values appearing on fewer screens (cards, modals, inputs)
- **text**: values from the CSS `color` property
- **accent**: `border-color` values and border shorthand colors, deduplicated against other categories

### Assets

| Tool | Description |
|------|-------------|
| `generate_icon` | Generate an SVG icon from Iconify |
| `search_icons` | Search available icon sets |
| `find_stock_image` | Find a stock photo from Picsum |

### Selection

| Tool | Description |
|------|-------------|
| `get_current_selection` | Get the user's current canvas selection (requires bridge) |

## Usage

```bash
# Start on stdio (standard MCP transport)
npm start

# With a pre-loaded flow file
npm start -- --file path/to/flow.drawd
```

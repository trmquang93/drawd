# Drawd MCP Server

Model Context Protocol server for [Drawd](https://drawd.app) — enables AI agents to create and manage app flow designs programmatically.

## Tools

### Validation

#### `validate_html`

Validate HTML/CSS against Satori rendering constraints **without rasterizing**. Returns a structured list of warnings in milliseconds — use before `create_screen` / `update_screen_image` to catch layout bugs before the slow render step.

**Input:**

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `html`    | string | yes      | The HTML string to validate against Satori constraints |

**Output:**

```json
{
  "warnings": [
    { "path": "div[0] > span[0]", "rule": "text-needs-nowrap", "message": "Text leaf missing white-space: nowrap" },
    { "path": "div[0]", "rule": "multi-child-needs-flex", "message": "3 children but no display: flex" }
  ]
}
```

Empty `warnings: []` means the HTML passes all checks.

**Rules checked:**

| Rule ID                    | Description                                         |
|----------------------------|-----------------------------------------------------|
| `unsupported-position`     | `position: absolute` and `position: fixed` are not supported |
| `no-style-block`           | `<style>` blocks are not supported; use inline styles |
| `multi-child-needs-flex`   | Elements with 2+ children must have `display: flex` |
| `no-br-tag`               | `<br/>` is not supported; use margin/padding        |
| `text-needs-nowrap`        | Text leaves need `white-space: nowrap` to prevent unexpected wrapping |
| `unsupported-css-property` | CSS property is outside Satori's supported allowlist |

## Running

```bash
npm start                              # stdio transport
npm start -- --file path/to/flow.drawd # with pre-loaded flow
npm run dev                            # development mode (unbundled)
```

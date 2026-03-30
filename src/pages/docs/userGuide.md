## Getting Started

Drawd is a browser-based tool for designing app navigation flows. You upload screen images, place them on an infinite canvas, define interactive areas (hotspots), connect screens with navigation links, and then generate AI-ready build instructions for your developer or AI coding assistant.

No account or installation required. Everything runs in the browser. Your work is saved automatically to a `.drawd` file on your local machine.

### Quick start

- Open the editor at {{DOMAIN}}
- Click the Upload icon in the floating toolbar at the bottom, or drag image files directly onto the canvas
- Arrange screens by dragging them around the canvas
- Draw hotspot tap areas on screens to define interactive elements
- Connect screens by dragging from a hotspot handle to another screen
- Click "Generate" to produce AI build instructions

> [!TIP]
> For the best experience use Chrome or Edge. The auto-save feature requires a Chromium-based browser. Firefox and Safari work but without auto-save.

## Uploading Screens

Screens are the foundation of every Drawd project. Each screen represents a single view or state in your app — a login page, a dashboard, a modal, etc.

### Methods

- Floating toolbar — Click the Upload icon (`U`) in the bottom toolbar to open a file picker. Select one or more image files (PNG, JPG, WebP).
- Drag and drop — Drag image files from Finder or Explorer directly onto the canvas.
- Paste from clipboard — Copy an image (e.g. a screenshot) and press Cmd/Ctrl+V to paste it onto the canvas.
- Paste from Figma — Use `Shift+Cmd+C` in Figma to copy a frame as PNG, then paste into Drawd with `Cmd/Ctrl+V`. The frame appears as a pixel-perfect screen image with its Figma name.
- Add blank screen — Click the Blank Screen icon (`B`) in the bottom toolbar to create a placeholder screen without an image.

### Replacing an image

You can replace the image on an existing screen by pasting from the clipboard or dragging a new image file directly onto it. The screen's hotspots, connections, name, position, and notes are all preserved — only the image is swapped out.

### Paste from Figma

For pixel-perfect results, use `Shift+Cmd+C` (Copy as PNG) in Figma, then paste into Drawd with `Cmd/Ctrl+V`. Drawd automatically detects the Figma frame name and applies it to the screen.

If you use regular `Cmd+C` in Figma, Drawd renders a layout preview. Text, shapes, gradients, vectors, and shared library components appear at their correct positions, while photos and background images show as transparent areas since regular copy does not include image data. A loading overlay is shown during rendering.

After the layout preview is added, a tip appears suggesting `Shift+Cmd+C` for pixel-perfect results. If you follow the tip and paste within 30 seconds, the frame name is automatically applied to the new paste.

> [!TIP]
> For best results, copy one frame at a time. Use `Shift+Cmd+C` in Figma (not regular `Cmd+C`) to get a pixel-perfect image with all raster content included.

### Naming screens

Screens are named from their filename by default. To rename a screen, click the pencil icon on the screen card or in the left panel, or press `F2` when a screen is selected.

### Describing screens

Each screen has a description field in the right sidebar. Write a brief summary of what the screen does — this text is included in the generated AI instructions as context.

### Implementation notes

Below the description is an "Implementation Notes" field. Use this for developer-facing context: edge cases, technical constraints, or special behaviors. Notes appear in the generated output as a highlighted callout block.

> [!TIP]
> Multiple images can be uploaded or dropped at once. Drawd auto-arranges them in a grid layout on the canvas.

## Canvas Navigation

The canvas is an infinite workspace where you arrange and connect screens. You can pan freely in any direction and zoom in or out.

### Pan and zoom

- Pan — Click and drag on any empty canvas area
- Zoom — Scroll the mouse wheel up/down (range: 0.2x - 2x)

### Keyboard shortcuts

| `Cmd/Ctrl` `+` | Zoom in |
| `Cmd/Ctrl` `-` | Zoom out |
| `Cmd/Ctrl` `0` | Reset zoom to 100% |
| `Space` `drag` | Pan canvas (while holding Space) |

### Left panel

The Screens Panel on the left shows thumbnails of all screens. Click any thumbnail to select that screen and center the canvas on it. This is the fastest way to jump to a specific screen in a large flow.

### Moving screens

Click and drag the header area of any screen card to reposition it. The canvas supports free-form placement — arrange screens in whatever order makes sense for your flow.

### Multi-select with rubber-band

With the Select tool active (`V`), click and drag on an empty area of the canvas to draw a rubber-band selection rectangle. All screens and sticky notes within the rectangle are selected when you release. Selected objects show a dashed amber border with a glow effect.

- Shift+click or Cmd/Ctrl+click to toggle individual objects in or out of the selection
- Drag any selected object to move all selected objects together (multi-drag)
- Press Delete/Backspace to remove all selected objects in one step
- Press Cmd/Ctrl+G to group selected screens into a screen group
- Press Escape to clear the selection

### Floating toolbar

The floating toolbar at the bottom center of the canvas provides quick access to tools and actions. It contains a tool switcher (Select `V` and Pan `H`) and action buttons for uploading screens (`U`), adding blank screens (`B`), and creating sticky notes (`N`).

## Creating Hotspots

Hotspots are interactive tap areas drawn on screen images. They define which elements a user can interact with and what action triggers when tapped.

### Drawing a hotspot

Click and drag on any screen image to draw a rectangle. When you release, the Hotspot modal opens with the position and size pre-filled. The minimum size is 2% of the image in each dimension.

### Hotspot properties

- Label — A descriptive name for the element (e.g., "Login button", "Email input")
- Element type — Button, text-input, toggle, card, icon, link, image, tab, list-item, or other
- Action — What happens when the user taps this element

### Action types

- Navigate — Go to another screen
- Back — Return to the previous screen
- Modal — Open a screen as a modal overlay
- Conditional — Branch to different screens based on conditions
- API Call — Trigger an API endpoint with success/error paths
- Custom — Describe a custom behavior in free text

### Selecting and editing hotspots

Click a hotspot rectangle to select it (purple highlight). Click it again to enter reposition mode, then drag to move it within the image. Double-click to open the edit modal. Press `Delete` or `Backspace` to remove a selected hotspot.

### Moving hotspots between screens

Drag a selected hotspot beyond the edge of its screen and drop it onto another screen. A ghost preview follows your cursor showing the drop location. On release, the hotspot transfers to the target screen and all its connections update automatically. This is a single undo step.

### Multi-select

Hold `Shift` and click multiple hotspots on the same screen to select them. Use `Cmd/Ctrl`+`C` to copy and `Cmd/Ctrl`+`V` to paste them onto the currently selected screen. Press `Delete` to remove all selected hotspots.

> [!TIP]
> Drag from the green handle on the right edge of a selected hotspot directly to another screen to create a connection without opening the modal.

## Connecting Screens

Connections (navigation links) show how a user moves from one screen to another. They appear as curved arrows on the canvas between screen cards.

### Creating a connection via hotspot

Select a hotspot, then drag from the green handle on its right edge to another screen. The connection is created immediately. To set a label or change the target, open the hotspot modal and edit the Action field.

### Creating a plain connection

Drag from the right-edge connector dot on any screen card (not on a hotspot) to another screen to create a plain navigation connection. Plain connections can be labeled and converted to conditional branches.

### Editing a connection

Click any connection line to select it. Then:

- Drag the from/to endpoint circles to reroute the connection to a different screen
- Double-click the line to open the edit modal for its source hotspot
- Press Delete/Backspace to remove the connection (the hotspot is preserved)

### Connection labels

Plain connections can have a label (e.g., "Tap submit"). Labels appear as small text badges along the connection line on the canvas.

> [!NOTE]
> Deleting a connection removes only the arrow — the hotspot that created it remains on the screen.

### Data flow annotations

Annotate what data passes between screens along a connection. For example, "productId: String" flows from a product list to a product detail screen.

- Double-click a connection line to open the edit modal. A "Data Passed" section lets you add data items, each with a name, type, and optional description.
- For hotspot-backed connections, the same editor appears in the hotspot modal after the target screen selector.
- For API hotspots, each follow-up path (On Success / On Error) has its own data flow editor.
- Connections with data annotations show a teal badge on the canvas (e.g., "productId" or "3 params").
- Generated instructions include an "Input Parameters" table per screen listing all incoming data, and the navigation table includes a "Data" column.

> [!TIP]
> Data flow annotations are the bridge between "where users go" and "what information each screen needs". They prevent AI agents from generating screens that lack required parameters.

## Conditional Branching

Conditional branching lets you model flows where a single action leads to different screens depending on a condition — for example, different outcomes based on whether a user is authenticated.

### From a hotspot

In the Hotspot modal, set the Action to "Conditional". Add branch conditions using the "Add Branch" button. Each branch has a label (the condition text) and a target screen. The generated instructions include all branches with their labels.

### From a plain connection (drag-to-create)

When you drag a second connection from the same screen (without a hotspot), Drawd prompts "Create conditional branches?" — click Yes to convert both connections into an amber conditional group. Drag additional connections from the same screen to add more branches automatically.

### Editing condition labels

After creating a conditional group, inline label inputs appear along each connection line. Type the condition text (e.g., "user is subscriber") and press `Enter` to advance to the next input.

> [!TIP]
> Conditional connections are displayed in amber to distinguish them from regular navigation connections (purple).

## Screen States

Screen states let you model different visual variants of the same logical screen — for example, a loading state, an error state, or a logged-in vs. logged-out view.

### Adding a new state screen

Select a screen, then click "Add State" in the right sidebar. A new variant screen is created 250px to the right of the original, sharing a state group with it. The original screen is automatically labeled "Default".

### Linking an existing screen as a state variant

Drag a connection from one screen to another. A popup appears asking you to choose between **Navigate** (creates a normal navigation link) and **State Variant** (links the target screen into the source screen's state group). Choosing "State Variant" groups both screens together — a dashed connector line appears between them, and they are treated as a single logical screen in the generated instructions.

### Naming states

Each state has a name field visible in the sidebar (e.g., "Loading", "Error", "Empty"). State names appear in the screen header on the canvas and in the generated instructions.

### States in the generated output

State groups are reflected in the AI build instructions. Each variant screen is listed with its state name, and the instruction generator notes which screens share a group.

> [!NOTE]
> Deleting the only remaining variant in a state group automatically removes the group, returning that screen to standalone status.

## Sticky Notes

Sticky notes are colored annotations that float on the canvas. Use them for reminders, comments, or project notes alongside your screen designs.

### Creating a sticky note

Click the sticky note icon in the floating toolbar or press `N`. A new yellow note appears at the center of your viewport with the text area focused for immediate typing.

### Editing

Click the note's text area to start typing. Click away to exit edit mode. To change color, click one of the four color dots in the note header (yellow, blue, red, green).

### Selecting and moving

Click a sticky note to select it — a blue glow indicates selection and the right sidebar shows editing options (color, author, content, delete). Drag the note header to reposition it on the canvas. Drag the bottom-right corner to resize.

### Sidebar panel

When a sticky note is selected, the right sidebar shows a dedicated panel with a color picker, an author field (optional attribution), a content textarea, and a delete button.

### Batch operations

Sticky notes participate in rubber-band selection and multi-drag. `Shift`+click to add notes to a canvas selection. `Delete` removes all selected notes at once.

> [!NOTE]
> Sticky notes are saved in the .drawd file but are not included in the generated AI instructions. They are for your own reference during the design process.

## Screen Groups

Screen groups are visual containers that organize related screens on the canvas — for example, grouping all onboarding screens or all settings screens together.

### Creating a group

- Select one or more screens (click, or rubber-band select), then press Cmd/Ctrl+G
- Right-click a screen and choose "Add to Group" to join an existing group or create a new one

### Appearance

Groups appear as large semi-transparent rounded rectangles enclosing their member screens. The group name is displayed in a label at the top-left corner. Groups automatically resize as you move their member screens.

### Editing

Click the group label to rename it. Click the group border to select it. When selected, press `Delete` to remove the group container (member screens are preserved).

### Managing members

Right-click any screen and choose "Add to Group" to see a list of existing groups. Select one to add the screen, or choose "Create new group" to start a new one. Choose "Remove from group" to disassociate a screen from its group.

> [!TIP]
> Groups are informational and help you organize your canvas visually. They are saved in the .drawd file but do not affect the generated AI instructions.

## Data Models

Data models let you define your app's data structures — TypeScript types, JSON schemas, or plain descriptions — directly inside your Drawd project. They are included in the generated AI instructions as a dedicated `types.md` file.

### Opening the Data Models panel

Click the Data Models icon in the top toolbar to open the full-screen panel. The panel has a left sidebar listing all models and a right editor area.

### Adding a model

Click "+ New Model" in the sidebar. A new model is created with the name "Untitled Model" and auto-selected for editing. Type a name and paste or write your schema definition.

### Editing

Select a model from the sidebar to edit it. The editor shows a name field at the top and a large monospace textarea for the schema. Changes are saved automatically as you type.

### Deleting

Click the Delete button next to the model name. A confirmation prompt appears — click "Yes, delete" to confirm.

### In the generated output

When you generate AI instructions, all data models are compiled into a `types.md` file in the ZIP output. Each model appears as a named section with its schema in a code block, providing type context for your AI coding assistant.

> [!TIP]
> Define your core entities (User, Product, Order, etc.) as data models so the AI build instructions include exact type definitions rather than guessing your data shape.

## API Connections

The API action type on hotspots models network requests — tapping a button triggers an API endpoint, with separate navigation paths for success and error responses.

### Configuring an API hotspot

- Set the hotspot Action to "API Call"
- Enter the endpoint path (e.g., /api/users/login)
- Select the HTTP method (GET, POST, PUT, DELETE, PATCH)
- Optionally link an API document for full request/response schema
- Set On Success and On Error navigation actions

### API documents

API documents are project-level files (OpenAPI specs, markdown references, etc.) attached to the project via the Documents panel. Linking a document to an API hotspot includes its content in the generated instructions for that hotspot.

### Success and error paths

Each API hotspot can navigate to different screens on success or error. Set the target screen for each path in the modal. These paths are rendered in the generated instructions as distinct navigation branches.

> [!TIP]
> Use the Documents panel to store your OpenAPI spec. Link it to API hotspots so the AI build instructions include the exact request/response schema for each call.

## Documents

Documents are project-level text files attached to your Drawd project. They are included verbatim in the generated AI instructions when referenced by a hotspot.

### Opening the Documents panel

Click the "Docs" icon in the toolbar (or press `D`) to open the Documents panel. It is a full-screen overlay.

### Adding a document

Click "New Document" in the panel, give it a name (e.g., "API Spec", "Design System"), and paste or type the content. Documents support plain text and markdown.

### Referencing a document from a hotspot

In the Hotspot modal for an API action, use the "Link Document" dropdown to attach a document. The document's content is appended to the instruction block for that hotspot.

### Documents in the generated output

If any documents are referenced by hotspots, a `documents.md` file is included in the generated ZIP. It contains all referenced documents.

> [!NOTE]
> Deleting a document automatically clears its reference from any hotspots that linked to it.

## File Operations

Drawd saves projects as `.drawd` files containing all screens, connections, hotspots, and documents.

### Auto-save (Chromium only)

In Chrome or Edge, use File > Open to connect a `.drawd` file. Once connected, changes are automatically written to disk after 1.5 seconds of inactivity. A status dot in the toolbar shows the save state (yellow = saving, green = saved, red = error).

### File menu operations

- New — Clear the canvas and start a fresh project (prompts if unsaved work exists)
- Open — Open a .drawd file and replace the current canvas
- Save As — Write to a new or different .drawd file (Chromium only)
- Import — Merge a .drawd file into the current project
- Export — Download the current project as a .drawd file

### Keyboard shortcuts

| `Cmd/Ctrl` `S` | Save (or Save As if no file connected) |
| `Cmd/Ctrl` `O` | Open file |

### Drag a .drawd file onto the canvas

You can drag a `.drawd` file directly onto the canvas. If the canvas is empty, the file opens immediately. If there are existing screens, the Replace/Merge confirmation modal appears — choose Replace to swap the current project, or Merge to combine both projects together.

### Import vs. Open

Open replaces the current canvas entirely. Import merges the incoming screens and connections into the current project, automatically adjusting positions to avoid overlap.

> [!TIP]
> Export to .drawd before sharing with collaborators. They can open the file in any browser (auto-save requires Chromium, but manual export/import works everywhere).

## Generating AI Instructions

Drawd generates a structured set of markdown files that an AI coding assistant (or a developer) can use to build the screens and navigation logic you have designed.

### Running generation

Click the "Generate" button in the top toolbar. Select a target platform from the dropdown if desired. Drawd validates the project first and shows a warning if there are broken links or missing endpoints.

### Output files

- index.md — Master checklist: file manifest, screen roster, navigation summary
- main.md — High-level overview, screen roster table, validation warnings
- screens.md — Per-screen detail: hotspots, actions, implementation notes
- navigation.md — Complete navigation connection table
- build-guide.md — Framework-specific implementation guidance with code patterns
- documents.md — Referenced API documents (included only if documents are linked)
- tasks.md — Granular build task list with requirement IDs

### Platform selection

- Auto — Detects platform from screen dimensions
- SwiftUI — iOS/macOS patterns with Swift code snippets
- React Native — Cross-platform JS patterns
- Flutter — Dart/Flutter patterns
- Jetpack Compose — Android Kotlin patterns

### Downloading the output

Click "Download ZIP" in the Instructions panel to download all generated files plus the screen images in a single archive. The ZIP can be uploaded directly to an AI assistant as context for code generation.

> [!TIP]
> Requirement IDs (SCR-XXXXXXXX, HSP-XXXXXXXX-XXXX, NAV-XXXX) are stable across regenerations as long as screen and hotspot names stay the same. You can reference them in follow-up prompts to your AI assistant.

## Keyboard Shortcuts

Press `?` anywhere on the canvas to open the full keyboard shortcuts panel. The shortcuts below are organized by category.

### General

| `?` | Open shortcuts reference |
| `Escape` | Close modal / deselect / cancel action |

### File

| `Cmd/Ctrl` `S` | Save file |
| `Cmd/Ctrl` `O` | Open file |
| `Cmd/Ctrl` `V` | Paste image from clipboard |

### Tools

| `V` | Select tool (click and drag to select objects) |
| `H` | Pan tool (click and drag to pan canvas) |
| `U` | Upload screens |
| `B` | Add blank screen |
| `N` | Add sticky note |

### Canvas

| `Cmd/Ctrl` `+` | Zoom in |
| `Cmd/Ctrl` `-` | Zoom out |
| `Cmd/Ctrl` `0` | Reset zoom |
| `Space` `drag` | Pan canvas (while holding Space) |

### Editing

| `Cmd/Ctrl` `Z` | Undo |
| `Cmd/Ctrl` `Shift` `Z` | Redo |
| `Delete` | Delete selected screen, hotspot, connection, sticky note, or group |
| `Backspace` | Delete selected (same as Delete) |
| `F2` | Rename selected screen |
| `Cmd/Ctrl` `G` | Group selected screens |
| `Shift` `click` | Multi-select hotspots or toggle canvas selection |
| `Cmd/Ctrl` `C` | Copy selected hotspots |
| `Cmd/Ctrl` `V` | Paste hotspots onto selected screen |

> [!NOTE]
> Keyboard shortcuts are blocked when focus is inside an input or textarea, and when any modal is open.

## Collaboration

Drawd supports real-time collaboration so multiple people can view and edit the same flow simultaneously.

### Creating a room

- Click the Share icon in the top bar (between Data Models and the File dropdown)
- Enter a display name and choose a cursor color
- Click "Create Room"
- A 6-character room code will appear — share it with collaborators
- You can also copy a direct join link that opens the editor with the room pre-filled

### Joining a room

- Click Share and switch to the "Join" tab, or use the direct join link shared by the host
- Enter a display name, choose a color, and type the 6-character room code
- Click "Join Room"
- The host's current flow will load automatically

### Roles

- **Host** — the person who created the room. The host can change any guest's role by clicking their avatar in the top bar.
- **Editor** — can edit the canvas; changes sync to all peers in real time.
- **Viewer** — read-only mode. Canvas panning and zoom remain available, but all editing controls are hidden or disabled.

### Live cursors

Each connected peer's cursor appears on the canvas in real time with their chosen color and display name. The name label fades after 3 seconds of inactivity and reappears when the cursor moves.

### Presence indicators

When connected to a room, the top bar shows:
- A room code pill (click to copy) with a connection status dot (green = connected, yellow pulse = reconnecting)
- A "Viewing" badge when in read-only mode
- Colored avatar circles for each connected peer, with tooltips showing name and role
- A participant count next to the avatars
- A leave button to disconnect from the session

### Participants panel

Click the avatar circles area (or the participant count) in the top bar to open the Participants panel on the right side of the screen. The panel shows a full list of everyone in the room:

- Your own entry is always listed first, marked with "(You)" and your role badge
- Other participants are listed alphabetically with their display name, avatar color, and role
- As the host, you can change any guest's role directly from the panel using the role dropdown next to their name
- The panel header shows the total participant count

The panel closes when you click the X button, leave the room, or disconnect from the session.

### Host disconnect

If the host leaves or closes their browser, all guests see a "Session Ended" modal. They can choose to keep the current state and continue working locally, or leave the session.

### Known limitations

- Guest undo is not available while connected to a room.
- Very large flows with many high-resolution screen images may cause sync issues. Consider using lower-resolution screenshots for collaboration.
- Rapid changes by multiple editors may appear slightly delayed on other screens.

## MCP Server (AI Agent Integration)

The Drawd MCP server lets AI agents — such as Claude Code, Claude Desktop, or any MCP-compatible tool — programmatically create and edit app flows. An agent can design screens from HTML, add hotspots, connect screens, and generate build instructions, all without touching the Drawd UI.

### How it works

1. You install the MCP server as an npm package
2. You configure it in your AI tool (Claude Code, Claude Desktop, etc.)
3. The AI agent uses MCP tools to build a `.drawd` flow file on your machine
4. You open the `.drawd` file in Drawd at {{DOMAIN}} to review, refine, and generate instructions

### Installation

Install globally from npm:

```
npm install -g drawd-mcp-server
```

Or run directly without installing:

```
npx drawd-mcp-server
```

> [!NOTE]
> The MCP server requires Node.js 18 or later and Google Chrome (or Chromium) installed on your system for HTML-to-image rendering. If Chrome is not found automatically, set the `CHROME_PATH` environment variable to your Chrome executable path.

### Configuring Claude Code

Add the following to your project's `.mcp.json` file (or create one in your project root):

```json
{
  "mcpServers": {
    "drawd": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "drawd-mcp-server"]
    }
  }
}
```

If you installed globally, use the shorter form:

```json
{
  "mcpServers": {
    "drawd": {
      "type": "stdio",
      "command": "drawd-mcp"
    }
  }
}
```

### Configuring Claude Desktop

Open Claude Desktop settings, go to the MCP section, and add a new server with:

- Name: `drawd`
- Command: `npx`
- Arguments: `-y drawd-mcp-server`

### Available tools

The MCP server exposes 27 tools organized by category:

- **File** — `create_flow`, `open_flow`, `save_flow`, `get_flow_info`
- **Screen** — `create_screen` (from HTML), `create_blank_screen`, `update_screen`, `delete_screen`, `list_screens`, `get_screen`, `update_screen_image`, `batch_create_screens`
- **Hotspot** — `create_hotspot`, `update_hotspot`, `delete_hotspot`, `list_hotspots`
- **Connection** — `create_connection`, `update_connection`, `delete_connection`, `list_connections`
- **Document** — `create_document`, `update_document`, `delete_document`, `list_documents`
- **Data Model** — `create_data_model`, `update_data_model`, `delete_data_model`, `list_data_models`
- **Annotation** — `create_sticky_note`, `create_screen_group`, `update_screen_group`, `delete_screen_group`
- **Generation** — `validate_flow`, `generate_instructions`, `analyze_navigation`

### Creating screens from HTML

The `create_screen` tool accepts an HTML string and renders it as a PNG screenshot using headless Chrome. You can specify a device preset to control the viewport size:

- `iphone-15-pro` (default) — 393 x 852
- `iphone-se` — 375 x 667
- `iphone-16-pro-max` — 440 x 956
- `ipad` — 820 x 1180
- `android` — 412 x 915

The AI agent writes the full screen UI as HTML/CSS, and the MCP server screenshots it into a Drawd screen at 2x resolution.

### Auto-connections from hotspots

When a hotspot is created with `action: "navigate"` and a `targetScreenId`, the corresponding connection is automatically created — just like in the Drawd UI. The agent does not need to call `create_connection` separately for hotspot-driven navigation.

### Example workflow

A typical agent interaction looks like this:

1. `create_flow` — create a new `.drawd` file
2. `create_screen` (x3) — render Login, Sign Up, and Home screens from HTML
3. `create_hotspot` — add a "Login" button on the Login screen pointing to Home
4. `create_hotspot` — add a "Sign Up" link on the Login screen pointing to Sign Up
5. `save_flow` — write the flow to disk
6. `generate_instructions` — produce AI build instruction files

You can then open the saved `.drawd` file in Drawd to visually inspect the flow, adjust screen positions, refine hotspots, and regenerate instructions.

### Pre-loading a flow

Start the MCP server with an existing `.drawd` file pre-loaded:

```
npx drawd-mcp-server -- --file path/to/your-flow.drawd
```

This lets the agent modify an existing flow without needing to call `open_flow` first.

> [!TIP]
> The MCP server works entirely with local `.drawd` files. There is no cloud connection required. Generated files are fully compatible with Drawd — open them via File > Open in any Chromium browser.

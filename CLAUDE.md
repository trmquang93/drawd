# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowForge is a visual **mobile app flow designer** — a React application that lets users design app navigation flows by uploading screen images, placing them on an infinite canvas, defining interactive hotspots/tap areas, connecting screens with navigation links, and generating AI build instructions from the resulting flow.

## Architecture

### Project Structure

```
flowforge.jsx              — Re-export entry point (backwards compat)
src/
  FlowForge.jsx            — Main component (orchestrator)
  components/
    ScreenNode.jsx          — Draggable screen card with image, hotspots, action buttons
    ConnectionLines.jsx     — SVG layer rendering interactive navigation arrows between screens
    HotspotModal.jsx        — Modal for creating/editing hotspot tap areas
    ConnectionEditModal.jsx — Modal for editing plain (non-hotspot) connections and conditional branching
    ConditionalPrompt.jsx   — Floating prompt for drag-to-create conditional branches
    InlineConditionLabels.jsx — Positioned inputs for editing condition labels on canvas
    DocumentsPanel.jsx      — Full-screen panel for managing project-level documents
    InstructionsPanel.jsx   — Panel displaying generated AI build instructions
    RenameModal.jsx         — Modal for renaming screens
    ImportConfirmModal.jsx  — Modal for import replace/merge confirmation
    TopBar.jsx              — Top toolbar with File dropdown (New/Open/Save As/Import/Export), upload, generate
    Sidebar.jsx             — Right panel showing selected screen details
    EmptyState.jsx          — Empty canvas placeholder
  hooks/
    useCanvas.js            — Pan, zoom, and drag logic
    useScreenManager.js     — Screen/connection/hotspot CRUD state
    useFilePersistence.js   — Auto-save to connected .flowforge file via File System Access API
  styles/
    theme.js                — COLORS, FONTS, FONT_LINK, shared style objects
  utils/
    generateId.js           — Unique ID generator (timestamp + random)
    generateInstructions.js — Legacy single-string AI instruction generator (delegates to generateInstructionFiles)
    generateInstructionFiles.js — Multi-file AI instruction generator (main.md, screens.md, navigation.md, build-guide.md, documents.md)
    analyzeNavGraph.js      — Navigation graph analysis (entry points, tab bars, modals, back loops)
    zipBuilder.js           — Zero-dependency browser-native ZIP file creator (STORE compression)
    buildPayload.js         — Pure function to construct .flowforge JSON payload (used by export and auto-save)
    exportFlow.js           — Export screens/connections/documents as .flowforge JSON file
    importFlow.js           — Parse and validate .flowforge JSON files (v1, v2, v3, v4, v5, and v6)
    mergeFlow.js            — Remap IDs and offset positions for merge imports
```

### Component Hierarchy

```
FlowForge (src/FlowForge.jsx)
  ├── TopBar — Toolbar: File dropdown (New/Open/Save As/Import/Export), upload, add blank, generate
  ├── Canvas area
  │   ├── ConnectionLines — SVG bezier arrows between screens
  │   ├── ConditionalPrompt — Floating "Create conditional branches?" prompt
  │   ├── InlineConditionLabels — Inline text inputs at connection midpoints for condition labels
  │   ├── ScreenNode[] — Draggable screen cards
  │   └── EmptyState — Shown when no screens exist
  ├── Sidebar — Selected screen details, hotspot list, incoming links
  ├── HotspotModal — Create/edit hotspot tap areas and actions
  ├── ConnectionEditModal — Edit plain connections (label, target, conditional branching)
  ├── DocumentsPanel — Project-level document management (full-screen overlay)
  ├── InstructionsPanel — Generated AI build instructions viewer
  ├── RenameModal — Screen rename dialog
  └── ImportConfirmModal — Import replace/merge confirmation dialog
```

### Key Data Structures

- **screens[]** — `{ id, name, x, y, width, imageData, imageWidth, imageHeight, description, hotspots[], stateGroup, stateName }`
- **connections[]** — `{ id, fromScreenId, toScreenId, hotspotId, label, action, connectionPath, condition, conditionGroupId }`
- **documents[]** — `{ id, name, content, createdAt }` — Project-level reusable documents (API specs, design guides, etc.)
- **connectionPath values**: `default`, `api-success`, `api-error`, `condition-0`, `condition-1`, ... `condition-N`
- **connection.condition** — `string`. The condition text for conditional connections (e.g., "user is subscriber"). Empty string for non-conditional connections.
- **connection.conditionGroupId** — `string | null`. Shared ID grouping conditional branch connections from the same source. Used for plain (non-hotspot) conditional connections. `null` = standalone connection.
- **hotspot** — `{ id, label, elementType, x, y, w, h (all %), action, targetScreenId, apiEndpoint, apiMethod, customDescription, documentId, onSuccessAction, onSuccessTargetId, onSuccessCustomDesc, onErrorAction, onErrorTargetId, onErrorCustomDesc }`
- **elementType values**: `button`, `text-input`, `toggle`, `card`, `icon`, `link`, `image`, `tab`, `list-item`, `other`
- **Hotspot actions**: `navigate`, `back`, `modal`, `conditional`, `api`, `custom`
- **api action fields**: `apiEndpoint` (string, e.g. "/api/users"), `apiMethod` ("GET"|"POST"|"PUT"|"DELETE"|"PATCH"), `documentId` (string|null, references a document in documents[])
- **api follow-up fields**: `onSuccessAction`/`onErrorAction` ("navigate"|"back"|"modal"|"custom"|""), `onSuccessTargetId`/`onErrorTargetId` (screen ID), `onSuccessCustomDesc`/`onErrorCustomDesc` (string)
- **conditional action fields**: `conditions` (array of `{ id, label, targetScreenId }` — each branch defines a condition text and target screen)
- **custom action fields**: `customDescription` (string, free-text behavior description)
- **.flowforge file** — `{ version: 1|2|3|4|5|6, metadata: { name, exportedAt, screenCount, connectionCount, documentCount }, viewport: { pan, zoom }, screens[], connections[], documents[] }`. v2 adds elementType, apiEndpoint, apiMethod, customDescription to hotspots. v3 adds apiDocs, onSuccessAction, onSuccessTargetId, onSuccessCustomDesc, onErrorAction, onErrorTargetId, onErrorCustomDesc to hotspots and connectionPath to connections. v4 adds stateGroup and stateName to screens. v5 replaces inline apiDocs with top-level documents[] and documentId references on hotspots. v6 adds conditions[] to hotspots (conditional branching) and condition field to connections.
- **stateGroup** — `string | null`. Shared group ID for screens that are variants of the same logical screen. `null` = standalone.
- **stateName** — `string`. Label for the screen state (e.g., "Default", "Loading", "Error"). Empty string for standalone screens.

### Custom Hooks

- **useCanvas** — Manages pan/zoom state, canvas mouse events (drag, pan, wheel zoom). Returns `{ pan, setPan, zoom, setZoom, isPanning, dragging, canvasRef, handleDragStart, handleMouseMove, handleMouseUp, handleCanvasMouseDown }`.
- **useScreenManager(pan, zoom, canvasRef)** — Manages screens, connections, documents, and hotspot CRUD. Returns screen/connection/document state, all mutation callbacks, plus `replaceAll(screens, connections, counter, documents)` and `mergeAll(screens, connections, documents)` for import. Also provides `moveHotspot(screenId, hotspotId, x, y)`, `updateScreenDimensions(screenId, imageWidth, imageHeight)`, `quickConnectHotspot(screenId, hotspotId, targetScreenId)` for interactive hotspot features, and `updateConnection(connectionId, patch)` / `deleteConnection(connectionId)` for direct connection manipulation. Plain connection editing: `saveConnectionGroup(originalConnId, payload)` handles navigate-or-conditional save from ConnectionEditModal, `deleteConnectionGroup(conditionGroupId)` removes all connections in a condition group. Drag-to-create conditional branches: `convertToConditionalGroup(existingConnId, fromScreenId, toScreenId)` converts an existing connection + new target into a conditional group (single undo step, returns groupId), `addToConditionalGroup(fromScreenId, toScreenId, conditionGroupId)` adds a new branch to an existing group. Document CRUD: `addDocument(name, content)` returns new ID synchronously, `updateDocument(docId, patch)`, `deleteDocument(docId)` (also clears documentId on any referencing hotspots). Also provides undo/redo via `canUndo`, `canRedo`, `undo()`, `redo()`, `captureDragSnapshot()`, `commitDragSnapshot()`.
  - **Screen placement**: `addScreen()` places screens on a grid layout (used by file upload and drag-and-drop). `addScreenAtCenter(imageData, name, offset)` places screens at the viewport center in world coordinates (used by paste and "Add Blank"). Multiple pasted images are staggered diagonally with `offset * 30px`.
  - **Screen states**: `addState(parentScreenId)` creates a variant screen 250px right of parent, sharing a `stateGroup` ID. If the parent has no group yet, one is generated and the parent gets `stateName: "Default"`. `updateStateName(screenId, stateName)` updates the state label. `removeScreen()` auto-cleans: if only one screen remains in a group after deletion, its `stateGroup` and `stateName` are cleared.

### Design System

Colors and shared styles are in `src/styles/theme.js`:
- `COLORS` — Dark theme with purple accent (`#6c5ce7`)
- `FONTS` — `{ ui, mono, heading }` font family constants
- `styles` — Reusable style objects: `monoLabel`, `input`, `select`, `modalOverlay`, `modalCard`, `modalTitle`, `btnPrimary`, `btnCancel`, `btnDanger`

### Canvas System

- **Pan**: Click-drag on empty canvas area
- **Zoom**: Mouse wheel (range 0.2x - 2x)
- **Drag-and-drop**: Images can be dropped directly onto the canvas
- **Screen dragging**: Click-drag on screen nodes to reposition

### Interactive Hotspot Features

- **Draw tap areas**: Click-and-drag on screen image to draw a rectangle. On release, HotspotModal opens with pre-filled x/y/w/h percentages. Min size guard: 2% w and h.
- **Select and reposition**: Click a hotspot to select it (purple highlight + glow). Click again to begin drag-reposition within image bounds.
- **Drag-from-hotspot to connect**: Drag from a selected hotspot's green handle (right edge) to another screen to create a navigation connection without modal. Preview line renders in success color.
- **hotspotInteraction state** in FlowForge.jsx: `{ mode: "selected"|"draw"|"reposition"|"hotspot-drag"|"resize"|"conn-endpoint-drag", screenId, hotspotId, ... }`
- **Connection line origins**: When a connection has a `hotspotId` and the screen has `imageHeight`, lines originate from hotspot center instead of screen right edge.

### Interactive Connection Lines

- **Click to select**: Click a connection line to highlight it (solid stroke, glow, brighter color) and show draggable endpoint handles. Transparent wide hit-path (`strokeWidth: 12`, `pointerEvents: "stroke"`) provides generous click target without blocking canvas.
- **Double-click to edit**: Double-click a connection line to open HotspotModal for its associated hotspot.
- **Drag endpoints to reroute**: Drag the from/to endpoint circles to reroute a connection to a different screen. Live bezier preview follows the mouse. Only updates the connection record (`fromScreenId`/`toScreenId`), not the hotspot.
- **Delete with keyboard**: Press Delete/Backspace to remove the selected connection. Only removes the connection record; the associated hotspot remains.
- **selectedConnection state** in FlowForge.jsx: Separate from `hotspotInteraction`. Selecting a connection clears hotspot interaction and vice versa. Clicking empty canvas clears both.
- **Endpoint drag** uses `hotspotInteraction` mode `"conn-endpoint-drag"` to reuse the existing mouse pipeline: `{ mode, connectionId, endpoint: "from"|"to", mouseX, mouseY }`.
- **ConnectionLines helpers**: `computePoints(conn, screens)` (exported) extracts from/to coordinates and control point; `bezierD()` builds the SVG path string.

### Drag-to-Create Conditional Branches

- **Scenario 1 — New group**: Dragging a second non-hotspot connection from the same screen shows a `ConditionalPrompt` floating card near the source screen. "Yes" converts both connections into a conditional group (amber lines with shared `conditionGroupId`); "No" creates a normal connection.
- **Scenario 2 — Join existing group**: If the source screen already has a conditional group, dragging a new connection auto-joins it as `condition-N` without a prompt.
- **Inline label editing**: After creating/joining a group, `InlineConditionLabels` renders positioned `<input>` elements at each connection's bezier midpoint. Enter advances to the next input; Enter on the last or Escape closes editing.
- **Dismissal**: Clicking canvas while prompt is open treats as "No". Escape dismisses the prompt without creating any connection.
- **State**: `conditionalPrompt` (prompt position + IDs) and `editingConditionGroup` (groupId) in FlowForge.jsx. Both are guarded in Delete/Undo/Redo keyboard handlers.

### Undo/Redo System

- **Snapshot-based**: Each undoable action stores a `{ screens, connections }` snapshot (deep clone via JSON) before the mutation. History stack lives in a `useRef` (`historyRef`) to avoid re-renders on push/pop.
- **Discrete mutations** (`addScreen`, `addScreenAtCenter`, `removeScreen`, `renameScreen`, `saveHotspot`, `deleteHotspot`, `quickConnectHotspot`, `addConnection`, `convertToConditionalGroup`, `addToConditionalGroup`, `updateConnection`, `deleteConnection`, `updateScreenDescription`) call `pushHistory()` before mutating.
- **Continuous drags** (`moveScreen`, `moveHotspot`, `resizeHotspot`) do NOT push history per frame. Instead, `captureDragSnapshot()` is called at drag-start and `commitDragSnapshot()` at drag-end, producing a single undo step.
- **Import operations** (`replaceAll`, `mergeAll`) clear the history stack entirely.
- **Not undoable**: `updateScreenDimensions` (layout-only, triggered by image load).
- **Keyboard shortcuts**: `Cmd/Ctrl+Z` for undo, `Cmd/Ctrl+Shift+Z` for redo. Guarded: skipped when focus is in input/textarea or any modal is open.
- **UI**: Undo/redo buttons in `TopBar` between stats and "Upload Screens" button.

### File Persistence (Auto-Save)

- **File System Access API**: Uses `showOpenFilePicker`/`showSaveFilePicker` to obtain a `FileSystemFileHandle` for silent read/write to a local `.flowforge` file. Chromium-only (Chrome/Edge); gracefully hidden in other browsers.
- **Auto-save**: `useFilePersistence` hook watches `screens` and `connections` via `useEffect`. When a connected file handle exists, changes are debounced at 1500ms and written to disk automatically.
- **FileHandle in useRef**: The `FileSystemFileHandle` is not serializable and must never enter the undo/redo JSON clone pipeline, so it's stored in a `useRef`.
- **Pan/zoom in refs**: Viewport changes do NOT trigger auto-save; only screen/connection mutations do.
- **skipNextSaveRef**: Prevents a redundant save immediately after opening a file (since `replaceAll` triggers the `useEffect`).
- **New flow**: File > New clears all screens, connections, documents, undo history, resets viewport to origin, and disconnects any open file handle. Shows `window.confirm` when screens exist.
- **Open replaces canvas**: Opening a file always replaces current state. Import remains available for merging.
- **Keyboard shortcuts**: `Cmd/Ctrl+S` saves immediately (or opens Save As picker if no file connected, or falls back to Export download); `Cmd/Ctrl+O` opens a file.
- **UI**: File dropdown menu in TopBar with New, Open, Save As (Chromium only), Import, Export. Connected filename shown as a badge with a save status dot (yellow pulse = saving, green = saved, red = error).
- **buildPayload.js**: Pure function extracted from `exportFlow.js` to construct the `.flowforge` JSON payload, reused by both export and auto-save.

### AI Instruction Generation

- **Multi-file output**: `generateInstructionFiles(screens, connections, options)` in `src/utils/generateInstructionFiles.js` produces a structured `{ files: [{name, content}], images: [{name, data}] }` object with 4 markdown files (main.md, screens.md, navigation.md, build-guide.md) and extracted PNG images.
- **Platform-specific**: Accepts `options.platform` ("auto"|"swiftui"|"react-native"|"flutter"|"jetpack-compose") to customize build guide with framework-specific code patterns.
- **Navigation analysis**: Uses `analyzeNavGraph()` from `src/utils/analyzeNavGraph.js` to detect entry screens, tab bar patterns, modal screens, and back loops.
- **Device detection**: `detectDeviceType(imageWidth, imageHeight)` maps screen dimensions to device categories (iPhone, iPad, Android, etc.).
- **Image extraction**: Base64 `imageData` is converted to PNG files in the `images/` folder of the ZIP output.
- **ZIP download**: `buildZip()` + `downloadZip()` from `src/utils/zipBuilder.js` create and download a ZIP file containing all instruction files and images.
- **Legacy compat**: `generateInstructions(screens, connections)` in `src/utils/generateInstructions.js` delegates to `generateInstructionFiles` and concatenates all file contents.
- **InstructionsPanel**: Tabbed UI showing each file, with rendered markdown view (toggle to raw), per-section copy, copy-all, and download ZIP buttons.
- **Platform selector**: Dropdown in TopBar next to the Generate button. State managed as `platformPreference` in FlowForge.jsx.
- **Screen descriptions**: Editable on ALL screens (not just blank ones) via the Sidebar.

## Code Conventions

- Styles use shared objects from `theme.js`, spread with inline overrides where needed
- IDs generated via `generateId()` using timestamp + random string
- React hooks: `useState`, `useRef`, `useCallback`, `useEffect` only
- No external state management — state split between `useCanvas` and `useScreenManager` hooks
- No TypeScript — plain JSX
- No routing — single-view application
- No build system — bare ESM imports of React

## Working with This Codebase

- `src/FlowForge.jsx` is the orchestrator (~780 lines). It wires hooks to components and manages all canvas interaction state.
- To add new canvas interactions, extend `useCanvas` hook.
- To add new screen/connection operations, extend `useScreenManager` hook.
- To add new UI sections, create a component in `src/components/` and compose it in `FlowForge.jsx`.
- When adding new shared styles, add them to `styles` in `src/styles/theme.js`.
- `flowforge.jsx` at the root is a re-export for backwards compatibility.

## Maintaining This Document

**IMPORTANT**: This CLAUDE.md file should be kept up-to-date as the project evolves.

### When to Update CLAUDE.md

Update this file when:
- **Architecture changes** — New components, hooks, or file structure changes
- **New features added** — New hotspot actions, canvas tools, export formats
- **Dependencies added** — If a build system or package.json is introduced
- **Conventions evolve** — New coding patterns or file organization

### How to Update

Run the `/claude-init` skill to regenerate or enhance this file, or manually update specific sections as changes occur.

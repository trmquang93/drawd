import { L_COLORS, L_FONTS } from "../landing/landingTheme";
import { DOMAIN } from "../../constants";

// Shared prose style helpers
const P = ({ children, style }) => (
  <p style={{ fontFamily: L_FONTS.ui, fontSize: 15, color: L_COLORS.textMuted, lineHeight: 1.75, marginTop: 0, marginBottom: 16, ...style }}>
    {children}
  </p>
);

const H3 = ({ children }) => (
  <h3 style={{ fontFamily: L_FONTS.heading, fontWeight: 600, fontSize: 16, color: L_COLORS.text, marginTop: 28, marginBottom: 8, letterSpacing: "-0.02em" }}>
    {children}
  </h3>
);

const Kbd = ({ children }) => (
  <kbd style={{
    display: "inline-block",
    fontFamily: L_FONTS.mono,
    fontSize: 12,
    color: L_COLORS.text,
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${L_COLORS.border}`,
    borderRadius: 5,
    padding: "2px 7px",
    lineHeight: 1.6,
    letterSpacing: 0,
  }}>
    {children}
  </kbd>
);

const TipBox = ({ children }) => (
  <div style={{
    background: L_COLORS.accent008,
    border: `1px solid ${L_COLORS.accent02}`,
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 16,
  }}>
    <span style={{ fontFamily: L_FONTS.mono, fontSize: 11, fontWeight: 600, color: L_COLORS.accentLight, letterSpacing: "0.06em" }}>TIP</span>
    <div style={{ fontFamily: L_FONTS.ui, fontSize: 14, color: L_COLORS.textMuted, lineHeight: 1.65, marginTop: 4 }}>
      {children}
    </div>
  </div>
);

const NoteBox = ({ children }) => (
  <div style={{
    background: L_COLORS.amber007,
    border: `1px solid ${L_COLORS.amber02}`,
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 16,
  }}>
    <span style={{ fontFamily: L_FONTS.mono, fontSize: 11, fontWeight: 600, color: L_COLORS.amber, letterSpacing: "0.06em" }}>NOTE</span>
    <div style={{ fontFamily: L_FONTS.ui, fontSize: 14, color: L_COLORS.textMuted, lineHeight: 1.65, marginTop: 4 }}>
      {children}
    </div>
  </div>
);

const UL = ({ items }) => (
  <ul style={{ paddingLeft: 20, margin: "0 0 16px 0" }}>
    {items.map((item, i) => (
      <li key={i} style={{ fontFamily: L_FONTS.ui, fontSize: 15, color: L_COLORS.textMuted, lineHeight: 1.75, marginBottom: 4 }}>
        {item}
      </li>
    ))}
  </ul>
);

const ShortcutRow = ({ keys, action }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
    <div style={{ display: "flex", gap: 4, flexShrink: 0, minWidth: 140 }}>
      {keys.map((k, i) => <Kbd key={i}>{k}</Kbd>)}
    </div>
    <span style={{ fontFamily: L_FONTS.ui, fontSize: 14, color: L_COLORS.textMuted }}>
      {action}
    </span>
  </div>
);

// ── Section definitions ──────────────────────────────────────────────────────

export const DOC_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    content: (
      <>
        <P>
          Drawd is a browser-based tool for designing app navigation flows. You upload screen
          images, place them on an infinite canvas, define interactive areas (hotspots), connect
          screens with navigation links, and then generate AI-ready build instructions for your
          developer or AI coding assistant.
        </P>
        <P>
          No account or installation required. Everything runs in the browser. Your work is saved
          automatically to a <code style={{ fontFamily: L_FONTS.mono, fontSize: 13, color: L_COLORS.accentLight }}>.drawd</code> file
          on your local machine.
        </P>
        <H3>Quick start</H3>
        <UL items={[
          `Open the editor at ${DOMAIN}`,
          'Click "Upload Screens" in the top toolbar, or drag image files directly onto the canvas',
          "Arrange screens by dragging them around the canvas",
          "Draw hotspot tap areas on screens to define interactive elements",
          "Connect screens by dragging from a hotspot handle to another screen",
          'Click "Generate" to produce AI build instructions',
        ]} />
        <TipBox>
          For the best experience use Chrome or Edge. The auto-save feature (File System Access API)
          requires a Chromium-based browser. Firefox and Safari work but without auto-save.
        </TipBox>
      </>
    ),
  },

  {
    id: "uploading-screens",
    title: "Uploading Screens",
    content: (
      <>
        <P>
          Screens are the foundation of every Drawd project. Each screen represents a single
          view or state in your app — a login page, a dashboard, a modal, etc.
        </P>
        <H3>Methods</H3>
        <UL items={[
          'Toolbar button — Click "Upload Screens" to open a file picker. Select one or more image files (PNG, JPG, WebP).',
          "Drag and drop — Drag image files from Finder or Explorer directly onto the canvas.",
          'Paste from clipboard — Copy an image (e.g. a screenshot) and press Cmd/Ctrl+V to paste it onto the canvas.',
          'Add blank screen — Click "Add Blank" in the toolbar to create a placeholder screen without an image.',
        ]} />
        <H3>Naming screens</H3>
        <P>
          Screens are named from their filename by default. To rename a screen, click the pencil
          icon on the screen card or in the left panel, or press <Kbd>F2</Kbd> when a screen is
          selected.
        </P>
        <H3>Describing screens</H3>
        <P>
          Each screen has a description field in the right sidebar. Write a brief summary of what
          the screen does — this text is included in the generated AI instructions as context.
        </P>
        <H3>Implementation notes</H3>
        <P>
          Below the description is an "Implementation Notes" field. Use this for developer-facing
          context: edge cases, technical constraints, or special behaviors. Notes appear in the
          generated output as a highlighted callout block.
        </P>
        <TipBox>
          Multiple images can be uploaded or dropped at once. Drawd auto-arranges them in a grid
          layout on the canvas.
        </TipBox>
      </>
    ),
  },

  {
    id: "canvas-navigation",
    title: "Canvas Navigation",
    content: (
      <>
        <P>
          The canvas is an infinite workspace where you arrange and connect screens. You can pan
          freely in any direction and zoom in or out.
        </P>
        <H3>Pan and zoom</H3>
        <UL items={[
          "Pan — Click and drag on any empty canvas area",
          "Zoom — Scroll the mouse wheel up/down (range: 0.2× – 2×)",
        ]} />
        <H3>Keyboard shortcuts</H3>
        <ShortcutRow keys={["Cmd/Ctrl", "+"]} action="Zoom in" />
        <ShortcutRow keys={["Cmd/Ctrl", "–"]} action="Zoom out" />
        <ShortcutRow keys={["Cmd/Ctrl", "0"]} action="Reset zoom to 100%" />
        <ShortcutRow keys={["Space", "drag"]} action="Pan canvas (while holding Space)" />
        <H3>Left panel</H3>
        <P>
          The Screens Panel on the left shows thumbnails of all screens. Click any thumbnail to
          select that screen and center the canvas on it. This is the fastest way to jump to a
          specific screen in a large flow.
        </P>
        <H3>Moving screens</H3>
        <P>
          Click and drag the header area of any screen card to reposition it. The canvas supports
          free-form placement — arrange screens in whatever order makes sense for your flow.
        </P>
      </>
    ),
  },

  {
    id: "creating-hotspots",
    title: "Creating Hotspots",
    content: (
      <>
        <P>
          Hotspots are interactive tap areas drawn on screen images. They define which elements
          a user can interact with and what action triggers when tapped.
        </P>
        <H3>Drawing a hotspot</H3>
        <P>
          Click and drag on any screen image to draw a rectangle. When you release, the Hotspot
          modal opens with the position and size pre-filled. The minimum size is 2% of the image
          in each dimension.
        </P>
        <H3>Hotspot properties</H3>
        <UL items={[
          "Label — A descriptive name for the element (e.g., \"Login button\", \"Email input\")",
          "Element type — Button, text-input, toggle, card, icon, link, image, tab, list-item, or other",
          "Action — What happens when the user taps this element",
        ]} />
        <H3>Action types</H3>
        <UL items={[
          "Navigate — Go to another screen",
          "Back — Return to the previous screen",
          "Modal — Open a screen as a modal overlay",
          "Conditional — Branch to different screens based on conditions",
          "API Call — Trigger an API endpoint with success/error paths",
          "Custom — Describe a custom behavior in free text",
        ]} />
        <H3>Selecting and editing hotspots</H3>
        <P>
          Click a hotspot rectangle to select it (purple highlight). Click it again to enter
          reposition mode, then drag to move it within the image. Double-click to open the edit
          modal. Press <Kbd>Delete</Kbd> or <Kbd>Backspace</Kbd> to remove a selected hotspot.
        </P>
        <H3>Multi-select</H3>
        <P>
          Hold <Kbd>Shift</Kbd> and click multiple hotspots on the same screen to select them.
          The batch action bar appears with Copy, Paste, and Delete options.
        </P>
        <TipBox>
          Drag from the green handle on the right edge of a selected hotspot directly to another
          screen to create a connection without opening the modal.
        </TipBox>
      </>
    ),
  },

  {
    id: "connecting-screens",
    title: "Connecting Screens",
    content: (
      <>
        <P>
          Connections (navigation links) show how a user moves from one screen to another. They
          appear as bezier arrows on the canvas between screen cards.
        </P>
        <H3>Creating a connection via hotspot</H3>
        <P>
          Select a hotspot, then drag from the green handle on its right edge to another screen.
          The connection is created immediately. To set a label or change the target, open the
          hotspot modal and edit the Action field.
        </P>
        <H3>Creating a plain connection</H3>
        <P>
          Drag from the right-edge connector dot on any screen card (not on a hotspot) to another
          screen to create a plain navigation connection. Plain connections can be labeled and
          converted to conditional branches.
        </P>
        <H3>Editing a connection</H3>
        <P>
          Click any connection line to select it. Then:
        </P>
        <UL items={[
          "Drag the from/to endpoint circles to reroute the connection to a different screen",
          "Double-click the line to open the edit modal for its source hotspot",
          "Press Delete/Backspace to remove the connection (the hotspot is preserved)",
        ]} />
        <H3>Connection labels</H3>
        <P>
          Plain connections can have a label (e.g., "Tap submit"). Labels appear as small text
          badges along the connection line on the canvas.
        </P>
        <NoteBox>
          Deleting a connection removes only the arrow — the hotspot that created it remains on
          the screen.
        </NoteBox>
      </>
    ),
  },

  {
    id: "conditional-branching",
    title: "Conditional Branching",
    content: (
      <>
        <P>
          Conditional branching lets you model flows where a single action leads to different
          screens depending on a condition — for example, different outcomes based on whether a
          user is authenticated.
        </P>
        <H3>From a hotspot</H3>
        <P>
          In the Hotspot modal, set the Action to "Conditional". Add branch conditions using the
          "Add Branch" button. Each branch has a label (the condition text) and a target screen.
          The generated instructions include all branches with their labels.
        </P>
        <H3>From a plain connection (drag-to-create)</H3>
        <P>
          When you drag a second connection from the same screen (without a hotspot), Drawd
          prompts "Create conditional branches?" — click Yes to convert both connections into an
          amber conditional group. Drag additional connections from the same screen to add more
          branches automatically.
        </P>
        <H3>Editing condition labels</H3>
        <P>
          After creating a conditional group, inline label inputs appear along each connection
          line. Type the condition text (e.g., "user is subscriber") and press <Kbd>Enter</Kbd>
          to advance to the next input.
        </P>
        <TipBox>
          Conditional connections are displayed in amber to distinguish them from regular
          navigation connections (purple).
        </TipBox>
      </>
    ),
  },

  {
    id: "screen-states",
    title: "Screen States",
    content: (
      <>
        <P>
          Screen states let you model different visual variants of the same logical screen — for
          example, a loading state, an error state, or a logged-in vs. logged-out view.
        </P>
        <H3>Adding a state</H3>
        <P>
          Select a screen, then click "Add State" in the right sidebar. A new variant screen is
          created 250px to the right of the original, sharing a state group with it. The original
          screen is automatically labeled "Default".
        </P>
        <H3>Naming states</H3>
        <P>
          Each state has a name field visible in the sidebar (e.g., "Loading", "Error", "Empty").
          State names appear in the screen header on the canvas and in the generated instructions.
        </P>
        <H3>States in the generated output</H3>
        <P>
          State groups are reflected in the AI build instructions. Each variant screen is listed
          with its state name, and the instruction generator notes which screens share a group.
        </P>
        <NoteBox>
          Deleting the only remaining variant in a state group automatically removes the group
          metadata, returning that screen to standalone status.
        </NoteBox>
      </>
    ),
  },

  {
    id: "api-connections",
    title: "API Connections",
    content: (
      <>
        <P>
          The API action type on hotspots models asynchronous network calls — tapping a button
          triggers an API endpoint, with separate navigation paths for success and error responses.
        </P>
        <H3>Configuring an API hotspot</H3>
        <UL items={[
          "Set the hotspot Action to \"API Call\"",
          "Enter the endpoint path (e.g., /api/users/login)",
          "Select the HTTP method (GET, POST, PUT, DELETE, PATCH)",
          "Optionally link an API document for full request/response schema",
          "Set On Success and On Error navigation actions",
        ]} />
        <H3>API documents</H3>
        <P>
          API documents are project-level files (OpenAPI specs, markdown references, etc.) attached
          to the project via the Documents panel. Linking a document to an API hotspot includes its
          content in the generated instructions for that hotspot.
        </P>
        <H3>Success and error paths</H3>
        <P>
          Each API hotspot can navigate to different screens on success or error. Set the target
          screen for each path in the modal. These paths are rendered in the generated instructions
          as distinct navigation branches.
        </P>
        <TipBox>
          Use the Documents panel to store your OpenAPI spec. Link it to API hotspots so the AI
          build instructions include the exact request/response schema for each call.
        </TipBox>
      </>
    ),
  },

  {
    id: "documents",
    title: "Documents",
    content: (
      <>
        <P>
          Documents are project-level text files attached to your Drawd project. They are included
          verbatim in the generated AI instructions when referenced by a hotspot.
        </P>
        <H3>Opening the Documents panel</H3>
        <P>
          Click the "Docs" icon in the toolbar (or press <Kbd>D</Kbd>) to open the Documents
          panel. It is a full-screen overlay.
        </P>
        <H3>Adding a document</H3>
        <P>
          Click "New Document" in the panel, give it a name (e.g., "API Spec", "Design System"),
          and paste or type the content. Documents support plain text and markdown.
        </P>
        <H3>Referencing a document from a hotspot</H3>
        <P>
          In the Hotspot modal for an API action, use the "Link Document" dropdown to attach a
          document. The document's content is appended to the instruction block for that hotspot.
        </P>
        <H3>Documents in the generated output</H3>
        <P>
          If any documents are referenced by hotspots, a <code style={{ fontFamily: L_FONTS.mono, fontSize: 13, color: L_COLORS.accentLight }}>documents.md</code> file
          is included in the generated ZIP. It contains all referenced documents.
        </P>
        <NoteBox>
          Deleting a document automatically clears its reference from any hotspots that linked to it.
        </NoteBox>
      </>
    ),
  },

  {
    id: "file-operations",
    title: "File Operations",
    content: (
      <>
        <P>
          Drawd saves projects as <code style={{ fontFamily: L_FONTS.mono, fontSize: 13, color: L_COLORS.accentLight }}>.drawd</code> files
          — a JSON format containing all screens, connections, hotspots, and documents.
        </P>
        <H3>Auto-save (Chromium only)</H3>
        <P>
          In Chrome or Edge, use File &rarr; Open to connect a <code style={{ fontFamily: L_FONTS.mono, fontSize: 13, color: L_COLORS.accentLight }}>.drawd</code> file.
          Once connected, changes are automatically written to disk after 1.5 seconds of
          inactivity. A status dot in the toolbar shows the save state (yellow = saving, green =
          saved, red = error).
        </P>
        <H3>File menu operations</H3>
        <UL items={[
          "New — Clear the canvas and start a fresh project (prompts if unsaved work exists)",
          "Open — Open a .drawd file and replace the current canvas",
          "Save As — Write to a new or different .drawd file (Chromium only)",
          "Import — Merge a .drawd file into the current project",
          "Export — Download the current project as a .drawd file",
        ]} />
        <H3>Keyboard shortcuts</H3>
        <ShortcutRow keys={["Cmd/Ctrl", "S"]} action="Save (or Save As if no file connected)" />
        <ShortcutRow keys={["Cmd/Ctrl", "O"]} action="Open file" />
        <H3>Import vs. Open</H3>
        <P>
          Open replaces the current canvas entirely. Import merges the incoming screens and
          connections into the current project, remapping IDs to avoid collisions and offsetting
          positions to avoid overlap.
        </P>
        <TipBox>
          Export to .drawd before sharing with collaborators. They can open the file in any browser
          (auto-save requires Chromium, but manual export/import works everywhere).
        </TipBox>
      </>
    ),
  },

  {
    id: "generating-instructions",
    title: "Generating AI Instructions",
    content: (
      <>
        <P>
          Drawd generates a structured set of markdown files that an AI coding assistant (or a
          developer) can use to build the screens and navigation logic you have designed.
        </P>
        <H3>Running generation</H3>
        <P>
          Click the "Generate" button in the top toolbar. Select a target platform from the
          dropdown if desired. Drawd validates the project first and shows a warning if there are
          broken links or missing endpoints.
        </P>
        <H3>Output files</H3>
        <UL items={[
          "index.md — Master checklist: file manifest, screen roster, navigation summary",
          "main.md — High-level overview, screen roster table, validation warnings",
          "screens.md — Per-screen detail: hotspots, actions, implementation notes",
          "navigation.md — Complete navigation connection table",
          "build-guide.md — Framework-specific implementation guidance with code patterns",
          "documents.md — Referenced API documents (included only if documents are linked)",
          "tasks.md — Granular build task list with requirement IDs",
        ]} />
        <H3>Platform selection</H3>
        <UL items={[
          "Auto — Detects platform from screen dimensions",
          "SwiftUI — iOS/macOS patterns with Swift code snippets",
          "React Native — Cross-platform JS patterns",
          "Flutter — Dart/Flutter patterns",
          "Jetpack Compose — Android Kotlin patterns",
        ]} />
        <H3>Downloading the output</H3>
        <P>
          Click "Download ZIP" in the Instructions panel to download all generated files plus the
          screen images in a single archive. The ZIP can be uploaded directly to an AI assistant
          as context for code generation.
        </P>
        <TipBox>
          Requirement IDs (SCR-XXXXXXXX, HSP-XXXXXXXX-XXXX, NAV-XXXX) are stable across
          regenerations as long as screen and hotspot names stay the same. You can reference them
          in follow-up prompts to your AI assistant.
        </TipBox>
      </>
    ),
  },

  {
    id: "keyboard-shortcuts",
    title: "Keyboard Shortcuts",
    content: (
      <>
        <P>
          Press <Kbd>?</Kbd> anywhere on the canvas to open the full keyboard shortcuts panel.
          The shortcuts below are organized by category.
        </P>
        <H3>General</H3>
        <ShortcutRow keys={["?"]} action="Open shortcuts reference" />
        <ShortcutRow keys={["Escape"]} action="Close modal / deselect / cancel action" />
        <H3>File</H3>
        <ShortcutRow keys={["Cmd/Ctrl", "S"]} action="Save file" />
        <ShortcutRow keys={["Cmd/Ctrl", "O"]} action="Open file" />
        <ShortcutRow keys={["Cmd/Ctrl", "V"]} action="Paste image from clipboard" />
        <H3>Canvas</H3>
        <ShortcutRow keys={["Cmd/Ctrl", "+"]} action="Zoom in" />
        <ShortcutRow keys={["Cmd/Ctrl", "–"]} action="Zoom out" />
        <ShortcutRow keys={["Cmd/Ctrl", "0"]} action="Reset zoom" />
        <H3>Editing</H3>
        <ShortcutRow keys={["Cmd/Ctrl", "Z"]} action="Undo" />
        <ShortcutRow keys={["Cmd/Ctrl", "Shift", "Z"]} action="Redo" />
        <ShortcutRow keys={["Delete"]} action="Delete selected screen, hotspot, or connection" />
        <ShortcutRow keys={["Backspace"]} action="Delete selected (same as Delete)" />
        <ShortcutRow keys={["F2"]} action="Rename selected screen" />
        <ShortcutRow keys={["Shift", "click"]} action="Multi-select hotspots on same screen" />
        <ShortcutRow keys={["Cmd/Ctrl", "C"]} action="Copy selected hotspots" />
        <ShortcutRow keys={["Cmd/Ctrl", "V"]} action="Paste hotspots onto selected screen" />
        <NoteBox>
          Keyboard shortcuts are blocked when focus is inside an input or textarea, and when any
          modal is open.
        </NoteBox>
      </>
    ),
  },
];

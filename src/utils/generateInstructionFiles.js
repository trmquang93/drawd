import { analyzeNavGraph } from "./analyzeNavGraph.js";
import { PLATFORM_TERMINOLOGY, renderHotspotDetailBlock, renderBuildGuideActionTable } from "./instructionRenderers.js";
import { screenReqId, connectionReqId } from "./generateReqIds.js";

// --- Helpers ---

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sortedScreens(screens) {
  return [...screens].sort((a, b) => a.x - b.x || a.y - b.y);
}

export function detectDeviceType(imageWidth, imageHeight) {
  if (!imageWidth || !imageHeight) return null;

  const w = Math.min(imageWidth, imageHeight);
  const h = Math.max(imageWidth, imageHeight);
  const ratio = h / w;
  const isPortrait = imageHeight >= imageWidth;

  // iPad: ~4:3 ratio
  if (ratio >= 1.2 && ratio <= 1.45) {
    return isPortrait ? "iPad (portrait)" : "iPad (landscape)";
  }

  // iPhone: ~19.5:9 ratio (modern), ~16:9 (older)
  if (ratio >= 1.7 && ratio <= 2.3) {
    if (w >= 700 && w <= 1300) {
      // Retina pixel dimensions
      return ratio >= 2.0 ? "iPhone (portrait)" : "Android phone (portrait)";
    }
    if (w >= 350 && w <= 450) {
      // Point dimensions
      return ratio >= 2.0 ? "iPhone (portrait)" : "Android phone (portrait)";
    }
    return isPortrait ? "Mobile (portrait)" : "Mobile (landscape)";
  }

  // Wide landscape
  if (ratio < 1.2) {
    return "Mobile (landscape)";
  }

  return isPortrait ? "Mobile (portrait)" : "Mobile (landscape)";
}

function resolveHotspotLabel(connection, screens) {
  if (!connection.hotspotId) return connection.label || "";
  const sourceScreen = screens.find(s => s.id === connection.fromScreenId);
  if (!sourceScreen) return connection.label || "";
  const hotspot = sourceScreen.hotspots.find(h => h.id === connection.hotspotId);
  return hotspot?.label || connection.label || "";
}

function extractImages(screens) {
  const sorted = sortedScreens(screens);
  const images = [];

  sorted.forEach((s, i) => {
    if (!s.imageData) return;

    const commaIdx = s.imageData.indexOf(",");
    if (commaIdx === -1) return;

    const base64 = s.imageData.slice(commaIdx + 1);
    const binaryStr = atob(base64);
    const data = new Uint8Array(binaryStr.length);
    for (let j = 0; j < binaryStr.length; j++) {
      data[j] = binaryStr.charCodeAt(j);
    }

    const idx = String(i + 1).padStart(2, "0");
    const slug = s.stateGroup && s.stateName
      ? `${slugify(s.name)}-${slugify(s.stateName)}`
      : slugify(s.name);
    const name = `images/${idx}-${slug}.png`;
    images.push({ name, data, screenId: s.id });
  });

  return images;
}

function imageRefForScreen(screen, images) {
  const img = images.find(i => i.screenId === screen.id);
  return img ? img.name : null;
}

// Schema version for the generated instruction package.
// Increment when the generated output format changes in a breaking way.
const INSTRUCTION_SCHEMA_VERSION = 1;

// --- Sub-generators ---

function generateMainMd(screens, connections, options, navAnalysis, images, documents = [], screenGroups = []) {
  const sorted = sortedScreens(screens);
  const platform = options.platform || "auto";
  const platformLabel = platform === "auto"
    ? "Auto (choose based on project needs)"
    : (PLATFORM_TERMINOLOGY[platform]?.name || platform);
  const featureBrief = options.featureBrief || "";
  const taskLink = options.taskLink || "";
  const allScreens = options.allScreens || screens;

  // Detect dominant device type
  const deviceTypes = sorted
    .map(s => detectDeviceType(s.imageWidth, s.imageHeight))
    .filter(Boolean);
  const deviceType = deviceTypes.length > 0
    ? mostCommon(deviceTypes)
    : "Unknown";

  // Count by status
  const newScreens = allScreens.filter(s => !s.status || s.status === "new");
  const modifyScreens = allScreens.filter(s => s.status === "modify");
  const existingScreens = allScreens.filter(s => s.status === "existing");

  let md = `# AI Build Instructions\n\n`;

  // Validation warnings callout (prepended when issues were found before generation)
  const warnings = options.warnings || [];
  if (warnings.length > 0) {
    md += `## Validation Warnings\n\n`;
    md += `> The following issues were detected before generation. Review and address them for accurate output.\n\n`;
    const errors = warnings.filter((w) => w.level === "error");
    const notices = warnings.filter((w) => w.level === "warning");
    if (errors.length > 0) {
      md += `### Errors\n\n`;
      errors.forEach((e) => { md += `- **[${e.code}]** ${e.message}\n`; });
      md += `\n`;
    }
    if (notices.length > 0) {
      md += `### Warnings\n\n`;
      notices.forEach((w) => { md += `- **[${w.code}]** ${w.message}\n`; });
      md += `\n`;
    }
    md += `---\n\n`;
  }

  // Feature brief comes first
  if (featureBrief) {
    md += `## Feature Brief\n\n${featureBrief}\n\n---\n\n`;
  }

  md += `| | |\n|---|---|\n`;
  if (taskLink) md += `| **Ticket** | [${taskLink}](${taskLink}) |\n`;
  md += `| **Screens to build** | ${newScreens.length > 0 ? `${newScreens.length} new` : "—"}${modifyScreens.length > 0 ? `, ${modifyScreens.length} to modify` : ""}${existingScreens.length > 0 ? `, ${existingScreens.length} existing (context only)` : ""} |\n`;
  md += `| **Connections** | ${connections.length} |\n`;
  md += `| **Documents** | ${documents.length} |\n`;
  md += `| **Platform** | ${platformLabel} |\n`;
  md += `| **Device Type** | ${deviceType} |\n\n`;

  // Entry screens
  if (navAnalysis.entryScreens.length > 0) {
    const names = navAnalysis.entryScreens.map(s => s.name).join(", ");
    md += `**Entry screen${navAnalysis.entryScreens.length > 1 ? "s" : ""}:** ${names}\n\n`;
  }

  // Navigation summary
  if (navAnalysis.navigationSummary) {
    md += `**Navigation pattern:** ${navAnalysis.navigationSummary}\n\n`;
  }

  md += `---\n\n`;

  // Instruction Files table — prominent placement so the AI sees it before the roster
  md += `## Instruction Files\n\n`;
  md += `> **All instruction files are in the SAME DIRECTORY as this file (\`main.md\`).**\n`;
  md += `> Use the full path of this file's directory to locate them. These files contain\n`;
  md += `> detailed specs that this file intentionally omits — you MUST read them during implementation.\n\n`;
  md += `| File | Contains | When to read |\n`;
  md += `|------|----------|--------------|\n`;
  md += `| \`screens.md\` | Element types, hotspot positions, action mappings, acceptance criteria | Before implementing each screen |\n`;
  md += `| \`navigation.md\` | Connection graph, entry points, tab bars, modals, back navigation | Before wiring any navigation |\n`;
  md += `| \`build-guide.md\` | Platform-specific code patterns and action type mappings | Before writing implementation code |\n`;
  md += `| \`images/\` | Reference PNGs — the definitive visual design | Before implementing each screen |\n`;
  if (documents.length > 0) {
    md += `| \`documents.md\` | API specs, design guides, and project reference documents | When a hotspot references an API call or external document |\n`;
  }
  md += `\n`;

  md += `## How to Use These Instructions\n\n`;
  md += `> **This instruction package works for both single-agent and multi-agent workflows.**\n`;
  md += `>\n`;
  if (existingScreens.length > 0 || modifyScreens.length > 0) {
    md += `> **You are implementing a feature in an existing codebase.** Screens marked "Existing" are\n`;
    md += `> already implemented — do NOT rebuild them. Screens marked "Modify" need targeted changes.\n`;
    md += `> Screens marked "New" need to be created from scratch.\n`;
    md += `>\n`;
  }
  md += `> - **Single agent?** Follow the Implementation Workflow below for each screen yourself.\n`;
  md += `>   Read every referenced file before coding.\n`;
  md += `> - **Multi-agent orchestrator?** Delegate screens to sub-agents, including the\n`;
  md += `>   Implementation Workflow in each sub-agent's prompt.\n`;
  md += `>\n`;
  md += `> **Critical rule:** Every screen MUST be implemented by reading its spec in \`screens.md\`,\n`;
  md += `> its connections in \`navigation.md\`, and its reference image in \`images/\`. Do NOT\n`;
  md += `> implement from this summary alone.\n\n`;

  md += `## Planning Requirements\n\n`;
  md += `> **When you create an implementation plan, your plan MUST include these references\n`;
  md += `> for EACH screen.** Plans that omit these references will drift from the spec.\n\n`;
  md += `For every screen in your plan, include:\n\n`;
  md += `1. **Screen ID** — the \`SCR-XXXXXXXX\` identifier from the Roster below\n`;
  md += `2. **Image path** — full path to the reference image (same directory as this file + \`images/XX-name.png\`)\n`;
  md += `3. **Spec reference** — full path to \`screens.md\` + section anchor \`SCR-XXXXXXXX\`\n`;
  md += `4. **Connections** — list the navigation connections from \`navigation.md\` involving this screen\n`;
  md += `5. **Key interactions** — summarize the hotspot actions from the Screen Roster (navigate, api, modal, etc.)\n\n`;
  md += `**Example plan entry** (assuming this file is at \`/path/to/instructions/main.md\`):\n\n`;
  md += `    Screen: Login (\`SCR-a1b2c3d4\`)\n`;
  md += `    - Reference image: \`/path/to/instructions/images/01-login.png\`\n`;
  md += `    - Spec: Read \`/path/to/instructions/screens.md\` > \`SCR-a1b2c3d4\` before implementing\n`;
  md += `    - Navigation: Read \`/path/to/instructions/navigation.md\` for connections\n`;
  md += `    - Connections: Login → Dashboard (navigate), Login → Forgot Password (navigate)\n`;
  md += `    - Interactions: 2 buttons (Login → navigate, Forgot Password → navigate), 2 text inputs\n`;
  md += `    - Status: New\n\n`;
  md += `This ensures that when you move from planning to implementation, you still have\n`;
  md += `the exact file paths needed to read the detailed specs — even when the instructions\n`;
  md += `are not in the project folder.\n\n`;

  md += `## Screen Roster\n\n`;
  md += `Use this inventory to plan implementation. Each screen must be implemented following the Implementation Workflow below.\n\n`;

  // Build screenId → group lookup
  const screenGroupMap = {};
  for (const g of screenGroups) {
    for (const sid of g.screenIds) {
      screenGroupMap[sid] = g;
    }
  }
  const hasGroups = screenGroups.length > 0;

  if (hasGroups) {
    md += `| # | ID | Screen | Image | Spec | Group | Status | TBD | Access | Role |\n`;
    md += `|---|-------|--------|-------|------|-------|--------|-----|--------|------|\n`;
  } else {
    md += `| # | ID | Screen | Image | Spec | Status | TBD | Access | Role |\n`;
    md += `|---|-------|--------|-------|------|--------|-----|--------|------|\n`;
  }

  sorted.forEach((s, i) => {
    const reqId = screenReqId(s);
    const imgRef = imageRefForScreen(s, images) || "—";
    const isEntry = navAnalysis.entryScreens.some(e => e.id === s.id);
    const isModal = navAnalysis.modalScreens.some(m => m.id === s.id);
    const isTab = navAnalysis.tabBarPatterns.some(p => p.tabs.some(t => t.id === s.id));
    const isHub = navAnalysis.tabBarPatterns.some(p => p.hubScreenId === s.id);
    const navRoles = [];
    if (isEntry) navRoles.push("entry");
    if (isHub) navRoles.push("tab hub");
    if (isTab) navRoles.push("tab");
    if (isModal) navRoles.push("modal");
    const stateLabel = (s.stateGroup && s.stateName) ? ` (${s.stateName})` : "";
    const statusLabel = s.status === "existing" ? "⬜ Existing" : s.status === "modify" ? "🔶 Modify" : "🟢 New";
    const tbdLabel = s.tbd ? "⚠️" : "—";
    const accessLabel = (s.roles && s.roles.length > 0) ? s.roles.join(", ") : "—";
    const groupLabel = screenGroupMap[s.id] ? screenGroupMap[s.id].name : "—";
    const specRef = `\`screens.md\` > \`${reqId}\``;
    if (hasGroups) {
      md += `| ${i + 1} | \`${reqId}\` | ${s.name}${stateLabel} | \`${imgRef}\` | ${specRef} | ${groupLabel} | ${statusLabel} | ${tbdLabel} | ${accessLabel} | ${navRoles.length > 0 ? navRoles.join(", ") : "screen"} |\n`;
    } else {
      md += `| ${i + 1} | \`${reqId}\` | ${s.name}${stateLabel} | \`${imgRef}\` | ${specRef} | ${statusLabel} | ${tbdLabel} | ${accessLabel} | ${navRoles.length > 0 ? navRoles.join(", ") : "screen"} |\n`;
    }
  });
  md += `\n`;

  // Feature Areas summary (if groups exist)
  if (hasGroups) {
    md += `### Feature Areas\n\n`;
    for (const g of screenGroups) {
      const memberNames = g.screenIds
        .map(id => screens.find(s => s.id === id)?.name)
        .filter(Boolean)
        .join(", ");
      md += `- **${g.name}**${g.folderHint ? ` (\`${g.folderHint}\`)` : ""}: ${memberNames || "no screens"}\n`;
    }
    md += `\n`;
  }

  // Context-only screens (existing)
  if (existingScreens.length > 0) {
    md += `### Context Screens (do not rebuild)\n\n`;
    md += `These screens already exist in the codebase. Reference them for navigation context only:\n\n`;
    existingScreens.forEach((s) => {
      md += `- **${s.name}** — already implemented\n`;
    });
    md += `\n`;
  }

  md += `## Implementation Workflow\n\n`;
  md += `**Follow these steps for EVERY screen.** Do not skip or reorder steps.\n\n`;
  md += `### Step 1 — Read the reference image (REQUIRED)\n\n`;
  md += `Open the screen's PNG from the \`images/\` folder in the same directory as this file.\n`;
  md += `Use the full path from the Roster. Study colors, typography, spacing, layout.\n`;
  md += `**Do not proceed until you have analyzed the image.**\n\n`;
  md += `### Step 2 — Read the screen spec in \`screens.md\`\n\n`;
  md += `Open \`screens.md\` (same directory as this file) and find the screen by its ID\n`;
  md += `(e.g., \`SCR-XXXXXXXX\`). Read the FULL entry:\n\n`;
  md += `- Interactive Elements table (element types, positions, actions)\n`;
  md += `- Action detail blocks (API endpoints, conditional branches, custom descriptions)\n`;
  md += `- Implementation notes and acceptance criteria\n`;
  md += `- Device type\n\n`;
  md += `**Include these details in your plan for this screen** so they are available\n`;
  md += `during implementation.\n\n`;
  md += `### Step 3 — Read connections in \`navigation.md\`\n\n`;
  md += `Open \`navigation.md\` (same directory) and find all connections involving this screen.\n`;
  md += `**Add the connection list to your plan** — include source, target, trigger, and action.\n\n`;
  md += `### Step 4 — Read platform patterns in \`build-guide.md\`\n\n`;
  md += `Open \`build-guide.md\` (same directory).\n`;
  md += `Review action type mappings for the target platform.\n\n`;
  if (documents.length > 0) {
    md += `### Step 4b — Read API / reference documents in \`documents.md\`\n\n`;
    md += `If a hotspot involves an API call or references a document, open \`documents.md\`\n`;
    md += `(same directory) for specs, payloads, and design guides before implementing.\n\n`;
  }
  md += `### Step 5 — Implement\n\n`;
  md += `Build the screen matching the reference image exactly (unless design override active).\n`;
  md += `Wire all interactions per the spec from Steps 2–3.\n\n`;
  md += `> **Before writing code:** Re-read the screen's spec in \`screens.md\` if your plan\n`;
  md += `> does not include the full hotspot/action details. Do NOT implement from memory.\n\n`;
  md += `### Step 6 — Verify\n\n`;
  md += `Compare implementation to the reference image. Confirm all hotspot actions and\n`;
  md += `navigation connections match \`screens.md\` and \`navigation.md\`.\n\n`;

  md += `## Delegation & Progress Tracking\n\n`;
  md += `Analyze the Screen Roster and the navigation pattern above, then decide:\n\n`;
  md += `- **How to group screens into teams** — consider which screens are independent vs. share\n`;
  md += `  components or navigation context (e.g., entry flow, tab sections, modal overlays)\n`;
  md += `- **Parallelism** — screens with no shared dependencies can be implemented simultaneously;\n`;
  md += `  screens that share components or build on each other should be sequenced\n`;
  md += `- **How to track progress** — use whatever format keeps you accurate (checklist, table,\n`;
  md += `  counter). Update it as each agent reports back.\n\n`;
  md += `> **Before starting implementation:** state your plan — which screens go in which wave,\n`;
  md += `> and which spec files you will read for each. This keeps you accountable and makes retries easier.\n\n`;
  md += `> **The most common failure mode is skipping Steps 2–4 and implementing from this\n`;
  md += `> summary alone — the summary intentionally omits detail that exists in \`screens.md\`,\n`;
  md += `> \`navigation.md\`, and \`build-guide.md\`.**\n\n`;

  md += `## Design Override\n\n`;
  md += `If the user has explicitly stated that the designs are approximate — for example:\n`;
  md += `*"design is just a demo"*, *"screens are placeholders"*, *"don't follow the design exactly"*,\n`;
  md += `*"use your own judgment for visuals"* — then apply this override to every screen.\n`;
  md += `In override mode: preserve element positions and hierarchy from the images, but apply\n`;
  md += `your own color scheme, typography, and visual polish. Do not pixel-match.\n\n`;
  md += `**Default (no override):** match the reference images precisely.\n\n`;

  md += `## Final Integration\n\n`;
  md += `After all screens are implemented:\n\n`;
  md += `1. **Review results** — check each screen's completion status and confidence level\n`;
  md += `2. **Retry failures** — for any screen that failed or has Low confidence, revisit\n`;
  md += `   with the specific issue called out and the spec re-read\n`;
  md += `3. **Wire the app** — implement shared navigation setup, routing, tab bar wiring,\n`;
  md += `   and the app entry point connecting all screens together\n`;
  md += `4. **Final check** — confirm the navigation graph matches \`navigation.md\` and that all\n`;
  md += `   connections between screens work end-to-end\n\n`;

  // Open Questions (TBD items)
  const tbdScreens = sorted.filter(s => s.tbd);
  const tbdHotspots = sorted.flatMap(s =>
    (s.hotspots || []).filter(h => h.tbd).map(h => ({ screen: s, hotspot: h }))
  );
  if (tbdScreens.length > 0 || tbdHotspots.length > 0) {
    md += `## Open Questions\n\n`;
    md += `> **Do NOT implement items marked TBD** — flag them as questions for the developer first.\n\n`;
    if (tbdScreens.length > 0) {
      md += `### Screens\n\n`;
      tbdScreens.forEach(s => {
        md += `- **${s.name}**${s.tbdNote ? ` — ${s.tbdNote}` : ""}\n`;
      });
      md += `\n`;
    }
    if (tbdHotspots.length > 0) {
      md += `### Hotspots\n\n`;
      tbdHotspots.forEach(({ screen: s, hotspot: h }) => {
        md += `- **${s.name} / ${h.label || "Unnamed"}**${h.tbdNote ? ` — ${h.tbdNote}` : ""}\n`;
      });
      md += `\n`;
    }
  }

  return md;
}

export function mostCommon(arr) {
  const counts = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function generateScreenDetailMd(s, screens, connections, images, documents = []) {
  let md = "";

  if (s.description) {
    md += `${s.description}\n\n`;
  }

  if (s.codeRef) {
    md += `**File:** \`${s.codeRef}\`\n\n`;
  }

  // Input Parameters from incoming connections
  const incoming = (connections || []).filter(c => c.toScreenId === s.id && c.dataFlow?.length > 0);
  if (incoming.length > 0) {
    md += `#### Input Parameters\n\n`;
    md += `| Parameter | Type | From Screen | Via | Description |\n`;
    md += `|-----------|------|-------------|-----|-------------|\n`;
    for (const conn of incoming) {
      const fromScreen = screens.find(fs => fs.id === conn.fromScreenId);
      const trigger = resolveHotspotLabel(conn, screens) || conn.label || "\u2014";
      for (const d of conn.dataFlow) {
        md += `| ${d.name} | ${d.type || "Any"} | ${fromScreen?.name || "?"} | ${trigger} | ${d.description || "\u2014"} |\n`;
      }
    }
    md += `\n`;
  }

  if (s.acceptanceCriteria && s.acceptanceCriteria.length > 0) {
    md += `**Acceptance Criteria:**\n\n`;
    s.acceptanceCriteria.forEach((c) => { md += `- [ ] ${c}\n`; });
    md += `\n`;
  }

  if (s.notes) {
    md += `> **Implementation Notes:** ${s.notes}\n\n`;
  }

  const device = detectDeviceType(s.imageWidth, s.imageHeight);
  if (device) {
    md += `**Device:** ${device}\n\n`;
  }

  const imgRef = imageRefForScreen(s, images);
  if (imgRef) {
    md += `> **Visual Reference:** Open and analyze \`${imgRef}\` — this image is the definitive\n`;
    md += `> design for this screen. Extract exact colors, fonts, spacing, component layout, and\n`;
    md += `> visual hierarchy from the image before implementing.\n\n`;
    md += `![${s.name}](${imgRef})\n\n`;
  } else if (!s.imageData) {
    md += `*No design image — needs design*\n\n`;
  }

  if (s.hotspots.length > 0) {
    md += `#### Interactive Elements\n\n`;
    md += `| # | Label | Type | Gesture | Position | Action | Target |\n`;
    md += `|---|-------|------|---------|----------|--------|--------|\n`;

    s.hotspots.forEach((h, j) => {
      const label = h.label || "Unnamed";
      const type = h.elementType || "button";
      const gesture = h.interactionType || "tap";
      const pos = `(${h.x}%, ${h.y}%, ${h.w}%x${h.h}%)`;
      let actionStr = h.action;
      const tbdMarker = h.tbd ? " ⚠️" : "";
      let target = "\u2014";

      if (h.targetScreenId) {
        const targetScreen = screens.find(ts => ts.id === h.targetScreenId);
        target = targetScreen?.name || "Unknown";
      }

      md += `| ${j + 1} | ${label}${tbdMarker} | ${type} | ${gesture} | ${pos} | ${actionStr} | ${target} |\n`;
    });
    md += `\n`;

    for (const h of s.hotspots) {
      const actionDetail = renderHotspotDetailBlock(h, screens, documents);
      if (actionDetail) md += actionDetail;
      if (h.elementType === "text-input" && h.validation) {
        const v = h.validation;
        const parts = [];
        if (v.required) parts.push("required");
        if (v.inputType && v.inputType !== "text") parts.push(`type: ${v.inputType}`);
        if (v.minLength != null) parts.push(`min: ${v.minLength} chars`);
        if (v.maxLength != null) parts.push(`max: ${v.maxLength} chars`);
        if (v.pattern) parts.push(`pattern: "${v.pattern}"`);
        if (parts.length > 0) {
          md += `**${h.label || "Unnamed"}** (text-input) \u2014 ${parts.join(", ")}\n`;
          if (v.errorMessage) {
            md += `  Validation error: "${v.errorMessage}"\n`;
          }
          md += `\n`;
        }
      }
    }
  } else {
    md += `*No interactive elements defined*\n\n`;
  }

  return md;
}

function generateDocumentsMd(documents) {
  if (documents.length === 0) return null;
  let md = `# Project Documents\n\n`;
  md += `This file contains all reference documents attached to the project.\n\n`;
  documents.forEach((doc, i) => {
    md += `## ${i + 1}. ${doc.name}\n\n`;
    if (doc.content) {
      md += `\`\`\`\n${doc.content}\n\`\`\`\n\n`;
    } else {
      md += `*Empty document*\n\n`;
    }
  });
  return md;
}

function generateScreensMd(screens, connections, images, documents = []) {
  const sorted = sortedScreens(screens);

  // Separate screens by status
  const toBuild = sorted.filter(s => !s.status || s.status === "new" || s.status === "modify");
  const contextOnly = sorted.filter(s => s.status === "existing");

  let md = `# Screens\n\n`;

  // Build stateGroup map
  const stateGroups = {};
  for (const s of sorted) {
    if (s.stateGroup) {
      if (!stateGroups[s.stateGroup]) stateGroups[s.stateGroup] = [];
      stateGroups[s.stateGroup].push(s);
    }
  }

  const output = new Set();
  let screenNum = 0;

  // Build / modify screens first
  const primaryScreens = toBuild.length > 0 ? toBuild : sorted;
  primaryScreens.forEach((s) => {
    if (output.has(s.id)) return;

    screenNum++;

    const statusTag = s.status === "modify" ? " *(modify existing)*" : s.status === "existing" ? " *(existing — context only)*" : "";
    const tbdTag = s.tbd ? " ⚠️ TBD" : "";
    const rolesTag = (s.roles && s.roles.length > 0)
      ? ` — ${s.roles.map(r => {
          if (r === "admin") return "🛡️ Admin";
          if (r === "authenticated" || r === "auth") return "🔐 Authenticated";
          if (r === "guest" || r === "unauthenticated") return "🔓 Guest";
          return `🔑 ${r}`;
        }).join(", ")}`
      : "";

    if (s.stateGroup && stateGroups[s.stateGroup]?.length >= 2) {
      const group = stateGroups[s.stateGroup];
      md += `## Screen ${screenNum}: ${s.name}${statusTag}${tbdTag}${rolesTag} \`[${screenReqId(s)}]\`\n\n`;
      md += `*This screen has ${group.length} states:*\n\n`;

      group.forEach((gs) => {
        output.add(gs.id);
        md += `### State: ${gs.stateName || gs.name}\n\n`;
        md += generateScreenDetailMd(gs, screens, connections, images, documents);
      });

      md += `---\n\n`;
    } else {
      output.add(s.id);
      md += `## Screen ${screenNum}: ${s.name}${statusTag}${tbdTag}${rolesTag} \`[${screenReqId(s)}]\`\n\n`;
      if (s.tbd && s.tbdNote) {
        md += `> ⚠️ **TBD:** ${s.tbdNote}\n\n`;
      }
      md += generateScreenDetailMd(s, screens, connections, images, documents);
      md += `---\n\n`;
    }
  });

  // Context-only (existing) screens in a separate section
  if (contextOnly.length > 0 && toBuild.length > 0) {
    md += `---\n\n# Context Screens (already implemented — do NOT rebuild)\n\n`;
    md += `These screens exist in the codebase. Listed for reference only.\n\n`;
    contextOnly.forEach((s) => {
      output.add(s.id);
      screenNum++;
      md += `## Screen ${screenNum}: ${s.name} *(existing)* \`[${screenReqId(s)}]\`\n\n`;
      if (s.description) md += `${s.description}\n\n`;
      md += `---\n\n`;
    });
  }

  return md;
}

function generateNavigationMd(screens, connections, navAnalysis) {
  let md = `# Navigation Architecture\n\n`;

  // Summary from navAnalysis
  if (navAnalysis.navigationSummary) {
    md += `${navAnalysis.navigationSummary}\n\n`;
  }

  // Entry screens
  if (navAnalysis.entryScreens.length > 0) {
    md += `## Entry Screens\n\n`;
    for (const entry of navAnalysis.entryScreens) {
      md += `- **${entry.name}**\n`;
    }
    md += `\n`;
  }

  // Tab bar patterns
  if (navAnalysis.tabBarPatterns.length > 0) {
    md += `## Tab Bar Patterns\n\n`;
    for (const pattern of navAnalysis.tabBarPatterns) {
      md += `**${pattern.hubScreenName}** hub with ${pattern.tabs.length} tabs:\n`;
      for (const tab of pattern.tabs) {
        md += `  - ${tab.name}\n`;
      }
      md += `\n`;
    }
  }

  // Modal screens
  if (navAnalysis.modalScreens.length > 0) {
    md += `## Modal Screens\n\n`;
    for (const modal of navAnalysis.modalScreens) {
      md += `- **${modal.name}** (presented from ${modal.presentedFrom.name})\n`;
    }
    md += `\n`;
  }

  // Back loops
  if (navAnalysis.backLoops.length > 0) {
    md += `## Back Navigation\n\n`;
    for (const loop of navAnalysis.backLoops) {
      md += `- ${loop.from.name} back to ${loop.to.name}\n`;
    }
    md += `\n`;
  }

  // Connection list
  md += `## All Connections\n\n`;
  if (connections.length === 0) {
    md += `No connections defined yet.\n\n`;
  } else {
    md += `| # | ID | From | To | Trigger | Action | Transition | Condition | Data |\n`;
    md += `|---|-------|------|----|---------|--------|------------|-----------|------|\n`;
    connections.forEach((c, i) => {
      const reqId = connectionReqId(c);
      const from = screens.find(s => s.id === c.fromScreenId);
      const to = screens.find(s => s.id === c.toScreenId);
      const label = resolveHotspotLabel(c, screens);
      let actionCol = c.action || "navigate";
      if (c.connectionPath === "api-success") actionCol += " (success)";
      else if (c.connectionPath === "api-error") actionCol += " (error)";
      else if (c.connectionPath && c.connectionPath.startsWith("condition-")) actionCol += " (conditional)";
      const transitionCol = c.transitionType
        ? (c.transitionType === "custom" ? (c.transitionLabel || "custom") : c.transitionType)
        : "\u2014";
      const conditionCol = c.condition || "\u2014";
      const dataCol = c.dataFlow?.length > 0
        ? c.dataFlow.map(d => `${d.name}: ${d.type || "Any"}`).join(", ")
        : "\u2014";
      md += `| ${i + 1} | \`${reqId}\` | ${from?.name || "?"} | ${to?.name || "?"} | ${label || "\u2014"} | ${actionCol} | ${transitionCol} | ${conditionCol} | ${dataCol} |\n`;
    });
    md += `\n`;
  }

  return md;
}

function generateBuildGuideMd(screens, connections, options, screenGroups = []) {
  const platform = options.platform || "auto";
  const techStack = options.techStack || {};
  const hasTechStack = Object.values(techStack).some(Boolean);
  let md = `# Build Guide\n\n`;

  // Folder structure hints from screen groups
  const groupsWithHints = screenGroups.filter(g => g.folderHint);
  if (groupsWithHints.length > 0) {
    md += `## Suggested Folder Structure\n\n`;
    md += `Based on feature areas defined in the design:\n\n`;
    md += `\`\`\`\n`;
    for (const g of groupsWithHints) {
      const memberNames = g.screenIds
        .map(id => screens.find(s => s.id === id)?.name)
        .filter(Boolean);
      md += `${g.folderHint}\n`;
      for (const name of memberNames) {
        md += `  ${name.replace(/\s+/g, "")}.swift  # or equivalent\n`;
      }
    }
    md += `\`\`\`\n\n`;
  }

  if (hasTechStack) {
    md += `## Project Tech Stack\n\n`;
    md += `| | |\n|---|---|\n`;
    const labels = { stateManagement: "State Management", apiClient: "API Client", navigation: "Navigation", auth: "Auth", uiLibrary: "UI Library", testing: "Testing" };
    for (const [key, label] of Object.entries(labels)) {
      if (techStack[key]) md += `| **${label}** | ${techStack[key]} |\n`;
    }
    md += `\n`;
  }

  if (platform === "auto") {
    md += `## Implementation Instructions\n\n`;
    md += `1. Choose the appropriate framework for the target (React Native / Flutter / SwiftUI / Jetpack Compose for mobile; React / Next.js / Vue for web — assess from the reference images and project context)\n`;
    md += `2. Implement each screen listed in screens.md as a separate component/view\n`;
    md += `3. For EACH screen, open its reference image from the \`images/\` folder and replicate the visual design exactly — colors, typography, spacing, layout, and component hierarchy\n`;
    md += `4. Wire up all navigation flows exactly as described in navigation.md\n`;
    md += `5. For each interactive element, implement the specified action type:\n`;
    md += `   - **navigate** — Push/navigate to the target screen\n`;
    md += `   - **back** — Pop/go back to previous screen\n`;
    md += `   - **modal** — Present target screen as a modal/overlay\n`;
    md += `   - **api** — Make the specified HTTP request (see endpoint and method in screens.md)\n`;
    md += `   - **conditional** — Branch to different screens based on a condition (see screens.md for branch definitions)\n`;
    md += `   - **custom** — Implement custom logic as described in screens.md\n`;
    md += `6. Set up proper navigation stack/router with all routes\n`;
    md += `7. Add smooth transitions between screens matching platform conventions\n`;
    md += `8. Ensure responsive layout that adapts to different screen sizes\n`;
    md += `\n`;
    md += `## Sub-Agent Implementation Workflow\n\n`;
    md += `Each screen is implemented by a dedicated sub-agent. The sub-agent MUST follow these\n`;
    md += `steps in order — skipping step 1 is not permitted:\n\n`;
    md += `1. **Analyze the reference image (REQUIRED FIRST STEP)** — Open the PNG from \`images/\`, study the visual design: colors, typography, spacing, component layout, icons, and visual hierarchy. Do not proceed until you have read the image.\n`;
    md += `2. **Read the screen spec** — Review the screen's entry in \`screens.md\` for element types, hotspot positions, and action mappings\n`;
    md += `3. **Check for design override** — If the user specified designs are approximate (e.g., "design is just a demo"), preserve layout structure but apply your own visual design instead of pixel-matching\n`;
    md += `4. **Build the UI** — Replicate the visual design from the reference image (precisely, or loosely if override is active)\n`;
    md += `5. **Wire interactions** — Implement all hotspot actions using patterns from \`screens.md\` and \`navigation.md\`\n`;
    md += `6. **Verify against image** — Compare your implementation to the reference image and adjust until they match (or until the layout matches, if override is active)\n`;
  } else {
    const pt = PLATFORM_TERMINOLOGY[platform];
    if (!pt) {
      md += `Unknown platform "${platform}". Using generic instructions.\n\n`;
      return md;
    }

    md += `## ${pt.name} Implementation\n\n`;
    md += `### Navigation Setup\n\n`;
    md += `${pt.stack}\n\n`;

    // Tab bar setup if applicable
    md += `### Tab Bar\n\n`;
    md += `${pt.tabs}\n\n`;

    md += renderBuildGuideActionTable(platform);

    md += `### Steps\n\n`;
    md += `1. Implement each screen from screens.md as a separate ${pt.name} view/component\n`;
    md += `2. For EACH screen, open its reference image from the \`images/\` folder and replicate the visual design exactly — colors, typography, spacing, layout, and component hierarchy\n`;
    md += `3. Wire up navigation flows from navigation.md using the patterns above\n`;
    md += `4. Handle API actions with proper error handling and loading states\n`;
    md += `5. Add smooth transitions matching ${pt.name} platform conventions\n`;
    md += `\n`;
    md += `## Sub-Agent Implementation Workflow\n\n`;
    md += `Each screen is implemented by a dedicated sub-agent. The sub-agent MUST follow these\n`;
    md += `steps in order — skipping step 1 is not permitted:\n\n`;
    md += `1. **Analyze the reference image (REQUIRED FIRST STEP)** — Open the PNG from \`images/\`, study the visual design: colors, typography, spacing, component layout, icons, and visual hierarchy. Do not proceed until you have read the image.\n`;
    md += `2. **Read the screen spec** — Review the screen's entry in \`screens.md\` for element types, hotspot positions, and action mappings\n`;
    md += `3. **Check for design override** — If the user specified designs are approximate (e.g., "design is just a demo"), preserve layout structure but apply your own visual design instead of pixel-matching\n`;
    md += `4. **Build the UI** — Replicate the visual design from the reference image (precisely, or loosely if override is active)\n`;
    md += `5. **Wire interactions** — Implement all hotspot actions using the ${pt.name} patterns in this guide and action mappings from \`navigation.md\`\n`;
    md += `6. **Verify against image** — Compare your implementation to the reference image and adjust until they match (or until the layout matches, if override is active)\n`;
  }

  return md;
}

function generateTasksMd(screens, connections, options) {
  const allScreens = options.allScreens || screens;
  const sorted = sortedScreens(screens);
  const toBuild = sorted.filter(s => !s.status || s.status === "new" || s.status === "modify");

  let md = `# Tasks\n\n`;
  md += `Checklist generated from scope. Copy into your task tracker or paste to your coding agent.\n\n`;

  let hasAny = false;
  (toBuild.length > 0 ? toBuild : sorted).forEach((s) => {
    const criteria = s.acceptanceCriteria || [];
    const outgoing = connections.filter(c => c.fromScreenId === s.id);
    if (criteria.length === 0 && outgoing.length === 0) return;

    hasAny = true;
    const tag = s.status === "modify" ? " *(modify)*" : "";
    md += `## ${s.name}${tag} \`[${screenReqId(s)}]\`\n\n`;

    if (s.codeRef) md += `> File: \`${s.codeRef}\`\n\n`;

    criteria.forEach((c) => {
      md += `- [ ] ${c}\n`;
    });

    outgoing.forEach((conn) => {
      const toScreen = allScreens.find(ts => ts.id === conn.toScreenId);
      const label = conn.label || resolveHotspotLabel(conn, allScreens) || "tap";
      if (toScreen) {
        const dataSuffix = conn.dataFlow?.length > 0
          ? ` (pass: ${conn.dataFlow.map(d => `${d.name}: ${d.type || "Any"}`).join(", ")})`
          : "";
        md += `- [ ] Wire: ${label} → ${toScreen.name}${dataSuffix}\n`;
      }
    });

    md += `\n`;
  });

  if (!hasAny) {
    md += `*No acceptance criteria defined. Add them in the Sidebar for each screen.*\n\n`;
  }

  return md;
}

function generateTypesMd(dataModels) {
  if (!dataModels || dataModels.length === 0) return null;
  let md = `# Data Models\n\n`;
  md += `Type definitions for this project. Reference these when implementing API calls and state.\n\n`;
  dataModels.forEach((model, i) => {
    md += `## ${i + 1}. ${model.name}\n\n`;
    if (model.schema) {
      md += `\`\`\`\n${model.schema}\n\`\`\`\n\n`;
    } else {
      md += `*No schema defined*\n\n`;
    }
  });
  return md;
}

/**
 * Generate a multi-file instruction package from screens and connections.
 *
 * @param {Array} screens - Array of screen objects
 * @param {Array} connections - Array of connection objects
 * @param {Object} options - { platform: "auto"|"swiftui"|"react-native"|"flutter"|"jetpack-compose", documents: [] }
 * @returns {{ files: Array<{ name: string, content: string }>, images: Array<{ name: string, data: Uint8Array }> }}
 */
function generateIndexMd(screens, connections, options, navAnalysis, images, documents, dataModels, generatedAt) {
  const sorted = sortedScreens(screens);
  let md = `# Index\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| **Schema version** | ${INSTRUCTION_SCHEMA_VERSION} |\n`;
  md += `| **Generated** | ${generatedAt} |\n`;
  md += `| **Screens** | ${sorted.length} |\n`;
  md += `| **Connections** | ${connections.length} |\n`;
  if (documents.length > 0) md += `| **Documents** | ${documents.length} |\n`;
  md += `\n`;

  md += `## Files in This Package\n\n`;
  md += `| File | Purpose |\n`;
  md += `|------|---------|\n`;
  md += `| \`index.md\` | This file — master checklist and manifest |\n`;
  md += `| \`main.md\` | Orchestrator instructions and screen roster |\n`;
  md += `| \`screens.md\` | Screen specifications and hotspot details |\n`;
  md += `| \`navigation.md\` | Navigation architecture and connection graph |\n`;
  md += `| \`build-guide.md\` | Platform-specific implementation guide |\n`;
  if (documents.length > 0) md += `| \`documents.md\` | Project reference documents |\n`;
  if (dataModels.length > 0) md += `| \`types.md\` | Data model definitions |\n`;
  md += `| \`tasks.md\` | Acceptance criteria checklist |\n`;
  md += `| \`images/\` | Screen reference images |\n`;
  md += `\n`;

  md += `## Screen Checklist\n\n`;
  md += `| ID | Done | Screen | Status | Image | Hotspots | Connections |\n`;
  md += `|----|------|--------|--------|-------|----------|-------------|\n`;
  sorted.forEach((s) => {
    const reqId = screenReqId(s);
    const imgRef = imageRefForScreen(s, images) || "—";
    const statusLabel = s.status === "existing" ? "Existing" : s.status === "modify" ? "Modify" : "New";
    const hotspotCount = (s.hotspots || []).length;
    const connCount = connections.filter((c) => c.fromScreenId === s.id || c.toScreenId === s.id).length;
    const stateLabel = (s.stateGroup && s.stateName) ? ` (${s.stateName})` : "";
    md += `| \`${reqId}\` | [ ] | ${s.name}${stateLabel} | ${statusLabel} | \`${imgRef}\` | ${hotspotCount} | ${connCount} |\n`;
  });
  md += `\n`;

  if (navAnalysis.navigationSummary) {
    md += `## Navigation Summary\n\n`;
    md += `${navAnalysis.navigationSummary}\n\n`;
  }

  md += `---\n\n`;
  md += `*Generated by [Drawd](https://drawd.app) — visual app flow designer*\n`;

  return md;
}

export function generateInstructionFiles(screens, connections, options = {}) {
  const documents = options.documents || [];
  const dataModels = options.dataModels || [];
  const screenGroups = options.screenGroups || [];
  const navAnalysis = analyzeNavGraph(screens, connections);
  const images = extractImages(screens);
  const generatedAt = new Date().toISOString();
  const schemaHeader = `<!-- drawd-schema: ${INSTRUCTION_SCHEMA_VERSION} | generated: ${generatedAt} -->\n\n`;

  const contentFiles = [
    { name: "main.md", content: generateMainMd(screens, connections, options, navAnalysis, images, documents, screenGroups) },
    { name: "screens.md", content: generateScreensMd(screens, connections, images, documents) },
    { name: "navigation.md", content: generateNavigationMd(screens, connections, navAnalysis) },
    { name: "build-guide.md", content: generateBuildGuideMd(screens, connections, options, screenGroups) },
  ];

  const documentsMd = generateDocumentsMd(documents);
  if (documentsMd) {
    contentFiles.push({ name: "documents.md", content: documentsMd });
  }

  const typesMd = generateTypesMd(dataModels);
  if (typesMd) {
    contentFiles.push({ name: "types.md", content: typesMd });
  }

  const tasksMd = generateTasksMd(screens, connections, options);
  contentFiles.push({ name: "tasks.md", content: tasksMd });

  // Prepend schema header to all content files
  const files = contentFiles.map((f) => ({ ...f, content: schemaHeader + f.content }));

  // index.md is the first file — generated after all others so it can reference them
  const indexMd = schemaHeader + generateIndexMd(screens, connections, options, navAnalysis, images, documents, dataModels, generatedAt);
  files.unshift({ name: "index.md", content: indexMd });

  return { files, images };
}

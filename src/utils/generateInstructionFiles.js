import { analyzeNavGraph } from "./analyzeNavGraph.js";

// --- Helpers ---

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sortedScreens(screens) {
  return [...screens].sort((a, b) => a.x - b.x || a.y - b.y);
}

function detectDeviceType(imageWidth, imageHeight) {
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

// --- Platform templates ---

const PLATFORM_TERMINOLOGY = {
  swiftui: {
    name: "SwiftUI",
    navigate: "Use `NavigationStack` with `.navigationDestination(for:)` to push the target view.",
    back: "Call `dismiss()` via `@Environment(\\.dismiss)` or pop from the navigation path.",
    modal: "Present the target view using `.sheet(isPresented:)` or `.fullScreenCover()`.",
    conditional: "Evaluate the condition and navigate to the matching target screen. Use `if`/`switch` to branch.",
    api: "Use `URLSession.shared.data(from:)` with `async/await`. Handle success/error follow-up actions in the completion. Mark the call with `// TODO: implement API`.",
    custom: "Add a `// TODO: custom action` comment with the description.",
    stack: "Set up a `NavigationStack` with a path-based router using `@State private var path = NavigationPath()`.",
    tabs: "Use `TabView` with `.tabItem { Label(\"Title\", systemImage: \"icon\") }` for each tab.",
  },
  "react-native": {
    name: "React Native",
    navigate: "Use `navigation.navigate('ScreenName')` from React Navigation's stack navigator.",
    back: "Call `navigation.goBack()` to return to the previous screen.",
    modal: "Use `navigation.navigate()` with `presentation: 'modal'` in stack screen options.",
    conditional: "Evaluate the condition and call `navigation.navigate()` to the matching target screen.",
    api: "Use `fetch()` or `axios` for the API call. Handle success/error follow-up navigation in `.then()`/`.catch()`. Add a `// TODO: implement API` comment.",
    custom: "Add a `// TODO: custom action` comment with the description.",
    stack: "Set up `createNativeStackNavigator()` with `NavigationContainer` wrapping `Stack.Navigator`.",
    tabs: "Use `createBottomTabNavigator()` with `Tab.Screen` for each tab.",
  },
  flutter: {
    name: "Flutter",
    navigate: "Use `Navigator.push(context, MaterialPageRoute(builder: (_) => TargetScreen()))`.",
    back: "Call `Navigator.pop(context)` to return to the previous screen.",
    modal: "Use `showModalBottomSheet()` or `showDialog()` to present the screen as an overlay.",
    conditional: "Evaluate the condition and call `Navigator.push()` to the matching target screen.",
    api: "Use the `http` package with `http.get()`/`http.post()`. Handle success/error follow-up navigation in try/catch. Add a `// TODO: implement API` comment.",
    custom: "Add a `// TODO: custom action` comment with the description.",
    stack: "Set up `MaterialApp` with named routes or `GoRouter` for declarative routing.",
    tabs: "Use `BottomNavigationBar` inside a `Scaffold` with an `IndexedStack` for tab content.",
  },
  "jetpack-compose": {
    name: "Jetpack Compose",
    navigate: "Use `navController.navigate(\"screenRoute\")` within a `NavHost`.",
    back: "Call `navController.popBackStack()` to return to the previous screen.",
    modal: "Use `Dialog { }` or `ModalBottomSheet { }` to present the screen as an overlay.",
    conditional: "Evaluate the condition and call `navController.navigate()` to the matching target screen.",
    api: "Use Retrofit or Ktor with coroutines. Handle success/error follow-up navigation in try/catch. Add a `// TODO: implement API` comment.",
    custom: "Add a `// TODO: custom action` comment with the description.",
    stack: "Set up `NavHost(navController, startDestination)` with `composable(\"route\") { }` for each screen.",
    tabs: "Use `Scaffold` with `NavigationBar` and `NavigationBarItem` for each tab.",
  },
};

// --- Sub-generators ---

function generateMainMd(screens, connections, options, navAnalysis, images, documents = [], screenGroups = []) {
  const sorted = sortedScreens(screens);
  const platform = options.platform || "auto";
  const platformLabel = platform === "auto"
    ? "Auto (choose based on project needs)"
    : (PLATFORM_TERMINOLOGY[platform]?.name || platform);
  const featureBrief = options.featureBrief || "";
  const taskLink = options.taskLink || "";
  const techStack = options.techStack || {};
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
  const hasStatusInfo = newScreens.length + modifyScreens.length + existingScreens.length > 0 &&
    (modifyScreens.length > 0 || existingScreens.length > 0);

  let md = `# AI Build Instructions\n\n`;

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

  md += `## Your Role as Orchestrator\n\n`;
  if (existingScreens.length > 0 || modifyScreens.length > 0) {
    md += `> **You are implementing a feature in an existing codebase.** Screens marked "Existing" are\n`;
    md += `> already implemented — do NOT rebuild them. Screens marked "Modify" need targeted changes.\n`;
    md += `> Screens marked "New" need to be created from scratch.\n`;
    md += `>\n`;
  } else {
    md += `> **You are the project orchestrator.** Your responsibility is to ship the implemented\n`;
    md += `> flow — whether it's a single feature, a partial user journey, or a complete app. You plan,\n`;
    md += `> delegate, track, and integrate. Assess the scope from the Screen Roster and navigation\n`;
    md += `> summary below: it may be a standalone product or a feature to wire into an existing codebase.\n`;
    md += `>\n`;
  }
  md += `> **What you work from:** This file (\`main.md\`) gives you everything you need to plan and\n`;
  md += `> delegate. You do NOT need to read the detail files (\`screens.md\`, \`navigation.md\`,\n`;
  md += `> \`build-guide.md\`) yourself — those are for your sub-agents. Trust the Screen Roster and\n`;
  md += `> navigation summary below to form your delegation strategy.\n`;
  md += `>\n`;
  md += `> **Your core loop:**\n`;
  md += `> 1. Study the Screen Roster and navigation pattern → assess scope and form a delegation plan\n`;
  md += `> 2. Spawn sub-agent teams to implement screens in parallel\n`;
  md += `> 3. Track progress; handle failures with retries\n`;
  md += `> 4. Once all screens are done, wire shared navigation and the entry point\n\n`;

  md += `## Screen Roster\n\n`;
  md += `Use this inventory to plan your delegation. Each sub-agent will implement one screen.\n\n`;

  // Build screenId → group lookup
  const screenGroupMap = {};
  for (const g of screenGroups) {
    for (const sid of g.screenIds) {
      screenGroupMap[sid] = g;
    }
  }
  const hasGroups = screenGroups.length > 0;

  if (hasGroups) {
    md += `| # | Screen | Image | Group | Status | TBD | Access | Role |\n`;
    md += `|---|--------|-------|-------|--------|-----|--------|------|\n`;
  } else {
    md += `| # | Screen | Image | Status | TBD | Access | Role |\n`;
    md += `|---|--------|-------|--------|-----|--------|------|\n`;
  }

  sorted.forEach((s, i) => {
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
    if (hasGroups) {
      md += `| ${i + 1} | ${s.name}${stateLabel} | \`${imgRef}\` | ${groupLabel} | ${statusLabel} | ${tbdLabel} | ${accessLabel} | ${navRoles.length > 0 ? navRoles.join(", ") : "screen"} |\n`;
    } else {
      md += `| ${i + 1} | ${s.name}${stateLabel} | \`${imgRef}\` | ${statusLabel} | ${tbdLabel} | ${accessLabel} | ${navRoles.length > 0 ? navRoles.join(", ") : "screen"} |\n`;
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

  md += `## Delegation & Progress Tracking\n\n`;
  md += `Analyze the Screen Roster and the navigation pattern above, then decide:\n\n`;
  md += `- **How to group screens into teams** — consider which screens are independent vs. share\n`;
  md += `  components or navigation context (e.g., entry flow, tab sections, modal overlays)\n`;
  md += `- **Parallelism** — screens with no shared dependencies can be implemented simultaneously;\n`;
  md += `  screens that share components or build on each other should be sequenced\n`;
  md += `- **How to track progress** — use whatever format keeps you accurate (checklist, table,\n`;
  md += `  counter). Update it as each sub-agent reports back.\n\n`;
  md += `> **Before spawning any sub-agents:** state your delegation plan — which screens go to which\n`;
  md += `> team/wave, and why. This keeps you accountable and makes retries easier to reason about.\n\n`;

  md += `## Design Override\n\n`;
  md += `If the user has explicitly stated that the designs are approximate — for example:\n`;
  md += `*"design is just a demo"*, *"screens are placeholders"*, *"don't follow the design exactly"*,\n`;
  md += `*"use your own judgment for visuals"* — then pass this override to every sub-agent.\n`;
  md += `In override mode: preserve element positions and hierarchy from the images, but apply\n`;
  md += `your own color scheme, typography, and visual polish. Do not pixel-match.\n\n`;
  md += `**Default (no override):** instruct sub-agents to match the reference images precisely.\n\n`;

  md += `## Sub-Agent Contract\n\n`;
  md += `Every sub-agent you spawn **must** follow these steps in order. Include this contract in\n`;
  md += `each sub-agent's prompt (substitute the screen name and image path from the Roster above):\n\n`;
  md += `\`\`\`\n`;
  md += `Implement the [Screen Name] screen.\n`;
  md += `\n`;
  md += `Step 1 — REQUIRED: Open and visually analyze [image path from roster]. Study the exact\n`;
  md += `colors, typography, spacing, component layout, icons, and visual hierarchy. Do not proceed\n`;
  md += `to step 2 until you have read the image.\n`;
  md += `\n`;
  md += `Step 2: Read the [Screen Name] section in screens.md for element types, hotspot positions,\n`;
  md += `and action mappings.\n`;
  md += `\n`;
  md += `Step 3: Read the relevant sections in navigation.md to understand how this screen connects\n`;
  md += `to the rest of the app.\n`;
  md += `\n`;
  md += `Step 4: Read build-guide.md for platform patterns and implement the screen, matching the\n`;
  md += `reference image exactly (unless the orchestrator passed a design override).\n`;
  md += `\n`;
  md += `Step 5: Wire all interactions (navigate, back, modal, api, custom) using the patterns\n`;
  md += `from build-guide.md.\n`;
  md += `\n`;
  md += `Step 6 — Verification: Compare your implementation to the reference image and adjust\n`;
  md += `until they match.\n`;
  md += `\n`;
  md += `When done, report back:\n`;
  md += `- What was implemented\n`;
  md += `- Any blockers or unresolved interactions\n`;
  md += `- Confidence level (High / Medium / Low) on visual fidelity\n`;
  md += `\`\`\`\n\n`;
  if (documents.length > 0) {
    md += `> **API / Reference Documents:** If a sub-agent encounters an API call or references a\n`;
    md += `> document, point them to \`documents.md\` for specs, payloads, and design guides.\n\n`;
  }

  md += `## Orchestrator Responsibilities\n\n`;
  md += `After all sub-agents report back:\n\n`;
  md += `1. **Review results** — check each agent's completion status and confidence level\n`;
  md += `2. **Retry failures** — for any agent that failed or reported Low confidence, re-spawn\n`;
  md += `   with the specific issue called out and tighter instructions\n`;
  md += `3. **Wire the app** — once all screens pass, implement shared navigation setup, routing,\n`;
  md += `   tab bar wiring, and the app entry point connecting all screens together\n`;
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

  md += `## File Reference\n\n`;
  md += `- **screens.md** — Detailed screen specifications, hotspots, and element descriptions\n`;
  md += `- **navigation.md** — Navigation architecture, flow connections, and graph analysis\n`;
  md += `- **build-guide.md** — Platform-specific implementation instructions and code patterns\n`;
  if (documents.length > 0) {
    md += `- **documents.md** — Project reference documents (API specs, design guides, etc.)\n`;
  }
  md += `- **images/** — Screen reference images (**PRIMARY design specification** — open and analyze each PNG)\n`;

  return md;
}

function mostCommon(arr) {
  const counts = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function generateScreenDetailMd(s, screens, images, documents = []) {
  let md = "";

  if (s.description) {
    md += `${s.description}\n\n`;
  }

  if (s.codeRef) {
    md += `**File:** \`${s.codeRef}\`\n\n`;
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
      if (h.action === "api" && (h.apiEndpoint || h.apiMethod)) {
        md += `**${h.label || "Unnamed"}** \u2014 API: \`${h.apiMethod || "GET"} ${h.apiEndpoint || "/endpoint"}\`\n\n`;

        if (h.requestSchema) {
          md += `Request:\n\`\`\`\n${h.requestSchema}\n\`\`\`\n\n`;
        }
        if (h.responseSchema) {
          md += `Response:\n\`\`\`\n${h.responseSchema}\n\`\`\`\n\n`;
        }

        if (h.onSuccessAction) {
          let successDetail = `On success: ${h.onSuccessAction}`;
          if (h.onSuccessTargetId) {
            const t = screens.find(ts => ts.id === h.onSuccessTargetId);
            if (t) successDetail += ` \u2192 ${t.name}`;
          }
          if (h.onSuccessAction === "custom" && h.onSuccessCustomDesc) {
            successDetail += ` (${h.onSuccessCustomDesc})`;
          }
          md += `- ${successDetail}\n`;
        }

        if (h.onErrorAction) {
          let errorDetail = `On error: ${h.onErrorAction}`;
          if (h.onErrorTargetId) {
            const t = screens.find(ts => ts.id === h.onErrorTargetId);
            if (t) errorDetail += ` \u2192 ${t.name}`;
          }
          if (h.onErrorAction === "custom" && h.onErrorCustomDesc) {
            errorDetail += ` (${h.onErrorCustomDesc})`;
          }
          md += `- ${errorDetail}\n`;
        }

        if (h.onSuccessAction || h.onErrorAction) md += `\n`;

        if (h.documentId) {
          const doc = documents.find((d) => d.id === h.documentId);
          if (doc) {
            md += `API Documentation: see **${doc.name}** in documents.md\n\n`;
          }
        }
      }
      if (h.action === "conditional" && h.conditions?.length > 0) {
        md += `**${h.label || "Unnamed"}** \u2014 Conditional branches:\n\n`;
        h.conditions.forEach((cond, ci) => {
          const t = cond.targetScreenId ? screens.find(ts => ts.id === cond.targetScreenId) : null;
          md += `- ${cond.label || `branch ${ci + 1}`} \u2192 ${t?.name || "none"}\n`;
        });
        md += `\n`;
      }
      if (h.action === "custom" && h.customDescription) {
        md += `**${h.label || "Unnamed"}** \u2014 Custom: ${h.customDescription}\n\n`;
      }
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
      md += `## Screen ${screenNum}: ${s.name}${statusTag}${tbdTag}${rolesTag}\n\n`;
      md += `*This screen has ${group.length} states:*\n\n`;

      group.forEach((gs) => {
        output.add(gs.id);
        md += `### State: ${gs.stateName || gs.name}\n\n`;
        md += generateScreenDetailMd(gs, screens, images, documents);
      });

      md += `---\n\n`;
    } else {
      output.add(s.id);
      md += `## Screen ${screenNum}: ${s.name}${statusTag}${tbdTag}${rolesTag}\n\n`;
      if (s.tbd && s.tbdNote) {
        md += `> ⚠️ **TBD:** ${s.tbdNote}\n\n`;
      }
      md += generateScreenDetailMd(s, screens, images, documents);
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
      md += `## Screen ${screenNum}: ${s.name} *(existing)*\n\n`;
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
    md += `| # | From | To | Trigger | Action | Transition | Condition |\n`;
    md += `|---|------|----|---------|--------|------------|-----------|\n`;
    connections.forEach((c, i) => {
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
      md += `| ${i + 1} | ${from?.name || "?"} | ${to?.name || "?"} | ${label || "\u2014"} | ${actionCol} | ${transitionCol} | ${conditionCol} |\n`;
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

    md += `### Action Types\n\n`;
    md += `| Action | Implementation |\n`;
    md += `|--------|---------------|\n`;
    md += `| **navigate** | ${pt.navigate} |\n`;
    md += `| **back** | ${pt.back} |\n`;
    md += `| **modal** | ${pt.modal} |\n`;
    md += `| **conditional** | ${pt.conditional} |\n`;
    md += `| **api** | ${pt.api} |\n`;
    md += `| **custom** | ${pt.custom} |\n\n`;

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
    md += `## ${s.name}${tag}\n\n`;

    if (s.codeRef) md += `> File: \`${s.codeRef}\`\n\n`;

    criteria.forEach((c) => {
      md += `- [ ] ${c}\n`;
    });

    outgoing.forEach((conn) => {
      const toScreen = allScreens.find(ts => ts.id === conn.toScreenId);
      const label = conn.label || resolveHotspotLabel(conn, allScreens) || "tap";
      if (toScreen) {
        md += `- [ ] Wire: ${label} → ${toScreen.name}\n`;
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
export function generateInstructionFiles(screens, connections, options = {}) {
  const documents = options.documents || [];
  const dataModels = options.dataModels || [];
  const screenGroups = options.screenGroups || [];
  const navAnalysis = analyzeNavGraph(screens, connections);
  const images = extractImages(screens);

  const files = [
    { name: "main.md", content: generateMainMd(screens, connections, options, navAnalysis, images, documents, screenGroups) },
    { name: "screens.md", content: generateScreensMd(screens, connections, images, documents) },
    { name: "navigation.md", content: generateNavigationMd(screens, connections, navAnalysis) },
    { name: "build-guide.md", content: generateBuildGuideMd(screens, connections, options, screenGroups) },
  ];

  const documentsMd = generateDocumentsMd(documents);
  if (documentsMd) {
    files.push({ name: "documents.md", content: documentsMd });
  }

  const typesMd = generateTypesMd(dataModels);
  if (typesMd) {
    files.push({ name: "types.md", content: typesMd });
  }

  const tasksMd = generateTasksMd(screens, connections, options);
  files.push({ name: "tasks.md", content: tasksMd });

  return { files, images };
}

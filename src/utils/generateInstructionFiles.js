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

function generateMainMd(screens, connections, options, navAnalysis, documents = []) {
  const sorted = sortedScreens(screens);
  const platform = options.platform || "auto";
  const platformLabel = platform === "auto"
    ? "Auto (choose based on project needs)"
    : (PLATFORM_TERMINOLOGY[platform]?.name || platform);

  // Detect dominant device type
  const deviceTypes = sorted
    .map(s => detectDeviceType(s.imageWidth, s.imageHeight))
    .filter(Boolean);
  const deviceType = deviceTypes.length > 0
    ? mostCommon(deviceTypes)
    : "Unknown";

  let md = `# Mobile App Flow — AI Build Instructions\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| **Screens** | ${screens.length} |\n`;
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

  md += `## How to Use These Instructions\n\n`;
  md += `> **AI Implementation Directive**\n`;
  md += `>\n`;
  md += `> These are multi-file instructions. \`main.md\` is the entry point — you MUST read all\n`;
  md += `> companion files before writing any code. Each screen must be implemented by a dedicated\n`;
  md += `> sub-agent that visually analyzes the screen's PNG image as its first step.\n`;
  md += `>\n`;
  md += `> The PNG images in \`images/\` are the **PRIMARY design specification**. The markdown\n`;
  md += `> files describe structure and interactions, but the images define exactly what to build.\n`;
  md += `> Image analysis is mandatory — do not skip or defer it.\n\n`;

  md += `## Design Override\n\n`;
  md += `If the user has explicitly stated that the designs are approximate — for example:\n`;
  md += `*"design is just a demo"*, *"screens are placeholders"*, *"don't follow the design exactly"*,\n`;
  md += `*"use your own judgment for visuals"* — then treat the PNG images as layout reference only.\n`;
  md += `In override mode: preserve element positions and hierarchy from the images, but apply\n`;
  md += `your own color scheme, typography, and visual polish. Do not pixel-match.\n\n`;
  md += `**Default (no override):** match the reference images as precisely as possible.\n\n`;

  md += `## Orchestration Workflow\n\n`;
  md += `Read all companion files first, then spawn one sub-agent per screen:\n\n`;
  md += `1. Read \`screens.md\` — understand every screen, its elements, and hotspot interactions\n`;
  md += `2. Read \`navigation.md\` — understand the full navigation architecture and flow\n`;
  md += `3. Read \`build-guide.md\` — understand platform patterns and implementation steps\n`;
  if (documents.length > 0) {
    md += `4. Read \`documents.md\` — review all API specs, design guides, and reference documents\n`;
    md += `5. For **each screen**, spawn a sub-agent with the prompt below — wait for all to complete\n`;
    md += `6. Wire up shared navigation, routing, and app entry point once all screens are built\n`;
  } else {
    md += `4. For **each screen**, spawn a sub-agent with the prompt below — wait for all to complete\n`;
    md += `5. Wire up shared navigation, routing, and app entry point once all screens are built\n`;
  }
  md += `\n`;

  md += `## Sub-Agent Prompt Template\n\n`;
  md += `Use this prompt for each screen sub-agent (fill in the screen name and image path):\n\n`;
  md += `\`\`\`\n`;
  md += `Implement the [Screen Name] screen.\n`;
  md += `\n`;
  md += `Step 1 — REQUIRED: Open and visually analyze images/[XX-screen-name.png]. Study the exact\n`;
  md += `colors, typography, spacing, component layout, icons, and visual hierarchy. Do not proceed\n`;
  md += `to step 2 until you have read the image.\n`;
  md += `\n`;
  md += `Step 2: Read the [Screen Name] section in screens.md for element types, hotspot positions,\n`;
  md += `and action mappings.\n`;
  md += `\n`;
  md += `Step 3: Implement the screen. Match the reference image exactly (unless the user has\n`;
  md += `specified a design override — in that case, preserve layout structure but apply your own\n`;
  md += `visual design).\n`;
  md += `\n`;
  md += `Step 4: Wire all interactions defined in the hotspot table (navigate, back, modal, api,\n`;
  md += `custom) using the patterns from build-guide.md.\n`;
  md += `\n`;
  md += `Step 5: Do a final visual check — compare your implementation to the reference image and\n`;
  md += `adjust until they match.\n`;
  md += `\`\`\`\n\n`;

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
    md += `| # | Label | Type | Position | Action | Target |\n`;
    md += `|---|-------|------|----------|--------|--------|\n`;

    s.hotspots.forEach((h, j) => {
      const label = h.label || "Unnamed";
      const type = h.elementType || "button";
      const pos = `(${h.x}%, ${h.y}%, ${h.w}%x${h.h}%)`;
      let actionStr = h.action;
      let target = "\u2014";

      if (h.targetScreenId) {
        const targetScreen = screens.find(ts => ts.id === h.targetScreenId);
        target = targetScreen?.name || "Unknown";
      }

      md += `| ${j + 1} | ${label} | ${type} | ${pos} | ${actionStr} | ${target} |\n`;
    });
    md += `\n`;

    for (const h of s.hotspots) {
      if (h.action === "api" && (h.apiEndpoint || h.apiMethod)) {
        md += `**${h.label || "Unnamed"}** \u2014 API: \`${h.apiMethod || "GET"} ${h.apiEndpoint || "/endpoint"}\`\n\n`;

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

  sorted.forEach((s) => {
    if (output.has(s.id)) return;

    screenNum++;

    if (s.stateGroup && stateGroups[s.stateGroup]?.length >= 2) {
      const group = stateGroups[s.stateGroup];
      md += `## Screen ${screenNum}: ${s.name}\n\n`;
      md += `*This screen has ${group.length} states:*\n\n`;

      group.forEach((gs) => {
        output.add(gs.id);
        md += `### State: ${gs.stateName || gs.name}\n\n`;
        md += generateScreenDetailMd(gs, screens, images, documents);
      });

      md += `---\n\n`;
    } else {
      output.add(s.id);
      md += `## Screen ${screenNum}: ${s.name}\n\n`;
      md += generateScreenDetailMd(s, screens, images, documents);
      md += `---\n\n`;
    }
  });

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
    md += `| # | From | To | Trigger | Action | Condition |\n`;
    md += `|---|------|----|---------|--------|-----------|\n`;
    connections.forEach((c, i) => {
      const from = screens.find(s => s.id === c.fromScreenId);
      const to = screens.find(s => s.id === c.toScreenId);
      const label = resolveHotspotLabel(c, screens);
      let actionCol = c.action || "navigate";
      if (c.connectionPath === "api-success") actionCol += " (success)";
      else if (c.connectionPath === "api-error") actionCol += " (error)";
      else if (c.connectionPath && c.connectionPath.startsWith("condition-")) actionCol += " (conditional)";
      const conditionCol = c.condition || "\u2014";
      md += `| ${i + 1} | ${from?.name || "?"} | ${to?.name || "?"} | ${label || "\u2014"} | ${actionCol} | ${conditionCol} |\n`;
    });
    md += `\n`;
  }

  return md;
}

function generateBuildGuideMd(screens, connections, options) {
  const platform = options.platform || "auto";
  let md = `# Build Guide\n\n`;

  if (platform === "auto") {
    md += `## Implementation Instructions\n\n`;
    md += `1. Create a mobile app (React Native / Flutter / SwiftUI / Jetpack Compose — choose based on project needs)\n`;
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
    md += `7. Add smooth transitions between screens matching mobile platform conventions\n`;
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

// --- Main export ---

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
  const navAnalysis = analyzeNavGraph(screens, connections);
  const images = extractImages(screens);

  const files = [
    { name: "main.md", content: generateMainMd(screens, connections, options, navAnalysis, documents) },
    { name: "screens.md", content: generateScreensMd(screens, connections, images, documents) },
    { name: "navigation.md", content: generateNavigationMd(screens, connections, navAnalysis) },
    { name: "build-guide.md", content: generateBuildGuideMd(screens, connections, options) },
  ];

  const documentsMd = generateDocumentsMd(documents);
  if (documentsMd) {
    files.push({ name: "documents.md", content: documentsMd });
  }

  return { files, images };
}

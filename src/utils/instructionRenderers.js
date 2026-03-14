// Platform-specific terminology for each supported framework.
// Each platform defines navigation, action, and routing patterns used in the build guide.
export const PLATFORM_TERMINOLOGY = {
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

// Registry of hotspot action renderers.
// Each entry owns its own markdown rendering logic for the detail block and build guide row.
// To add a new action type: add one entry here — no other file needs to change.
const HOTSPOT_ACTION_RENDERERS = {
  navigate: {
    tableActionLabel: (h) => h.action,
    detailBlock: (_h, _screens, _documents) => null,
    buildGuideRow: (pt) => (pt ? `| **navigate** | ${pt.navigate} |` : null),
  },
  back: {
    tableActionLabel: (h) => h.action,
    detailBlock: (_h, _screens, _documents) => null,
    buildGuideRow: (pt) => (pt ? `| **back** | ${pt.back} |` : null),
  },
  modal: {
    tableActionLabel: (h) => h.action,
    detailBlock: (_h, _screens, _documents) => null,
    buildGuideRow: (pt) => (pt ? `| **modal** | ${pt.modal} |` : null),
  },
  api: {
    tableActionLabel: (h) => h.action,
    detailBlock: (h, screens, documents) => {
      if (!(h.apiEndpoint || h.apiMethod)) return null;
      let md = `**${h.label || "Unnamed"}** \u2014 API: \`${h.apiMethod || "GET"} ${h.apiEndpoint || "/endpoint"}\`\n\n`;

      if (h.requestSchema) {
        md += `Request:\n\`\`\`\n${h.requestSchema}\n\`\`\`\n\n`;
      }
      if (h.responseSchema) {
        md += `Response:\n\`\`\`\n${h.responseSchema}\n\`\`\`\n\n`;
      }

      if (h.onSuccessAction) {
        let successDetail = `On success: ${h.onSuccessAction}`;
        if (h.onSuccessTargetId) {
          const t = screens.find((ts) => ts.id === h.onSuccessTargetId);
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
          const t = screens.find((ts) => ts.id === h.onErrorTargetId);
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

      return md;
    },
    buildGuideRow: (pt) => (pt ? `| **api** | ${pt.api} |` : null),
  },
  conditional: {
    tableActionLabel: (h) => h.action,
    detailBlock: (h, screens, _documents) => {
      if (!h.conditions?.length) return null;
      let md = `**${h.label || "Unnamed"}** \u2014 Conditional branches:\n\n`;
      h.conditions.forEach((cond, ci) => {
        const t = cond.targetScreenId ? screens.find((ts) => ts.id === cond.targetScreenId) : null;
        md += `- ${cond.label || `branch ${ci + 1}`} \u2192 ${t?.name || "none"}\n`;
      });
      md += `\n`;
      return md;
    },
    buildGuideRow: (pt) => (pt ? `| **conditional** | ${pt.conditional} |` : null),
  },
  custom: {
    tableActionLabel: (h) => h.action,
    detailBlock: (h, _screens, _documents) => {
      if (!h.customDescription) return null;
      return `**${h.label || "Unnamed"}** \u2014 Custom: ${h.customDescription}\n\n`;
    },
    buildGuideRow: (pt) => (pt ? `| **custom** | ${pt.custom} |` : null),
  },
};

// Dispatch to the registered renderer for h.action. Returns a markdown string or null.
export function renderHotspotDetailBlock(h, screens, documents) {
  const renderer = HOTSPOT_ACTION_RENDERERS[h.action];
  if (!renderer) return null;
  return renderer.detailBlock(h, screens, documents);
}

// Generate the full ### Action Types table for a specific platform.
// Returns null when platform is "auto" or unknown — callers handle those paths separately.
export function renderBuildGuideActionTable(platform) {
  const pt = PLATFORM_TERMINOLOGY[platform];
  if (!pt) return null;

  let md = `### Action Types\n\n`;
  md += `| Action | Implementation |\n`;
  md += `|--------|---------------|\n`;

  const actionOrder = ["navigate", "back", "modal", "conditional", "api", "custom"];
  for (const action of actionOrder) {
    const renderer = HOTSPOT_ACTION_RENDERERS[action];
    if (!renderer) continue;
    const row = renderer.buildGuideRow(pt);
    if (row) md += `${row}\n`;
  }
  md += `\n`;

  return md;
}

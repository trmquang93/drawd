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
    transitions: {
      push: "Standard `NavigationStack` push via `.navigationDestination(for:)`.",
      modal: "`.sheet(isPresented:)` — presents as a card that slides up from the bottom.",
      fullScreenCover: "`.fullScreenCover(isPresented:)` — covers the entire screen including safe areas.",
      replace: "Replace the navigation path: `path = NavigationPath([newScreen])`.",
      pop: "`dismiss()` via `@Environment(\\.dismiss)` to pop the current view.",
      tab: "`TabView` selection binding: `@State private var selectedTab: Int`.",
      fade: "`.transition(.opacity)` inside `withAnimation(.easeInOut(duration: 0.3))`.",
      slideUp: "`.transition(.move(edge: .bottom))` inside `withAnimation(.easeOut(duration: 0.3))`.",
      slideLeft: "`.transition(.move(edge: .trailing))` inside `withAnimation(.easeOut(duration: 0.3))`.",
      custom: "Custom `AnyTransition` — see connection label for transition description.",
    },
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
    transitions: {
      push: "Default stack push — `navigation.navigate('ScreenName')` with no extra options.",
      modal: "`presentation: 'modal'` on the `Stack.Screen` options.",
      fullScreenCover: "`presentation: 'fullScreenModal'` on the `Stack.Screen` options.",
      replace: "`navigation.replace('ScreenName')` to swap without adding to the stack.",
      pop: "`navigation.goBack()` or `navigation.pop()` to return to the previous screen.",
      tab: "`navigation.navigate('TabName')` targeting a tab in `createBottomTabNavigator()`.",
      fade: "`animation: 'fade'` in `Stack.Screen` options — fades between screens.",
      slideUp: "`animation: 'slide_from_bottom'` in `Stack.Screen` options.",
      slideLeft: "`animation: 'slide_from_right'` in `Stack.Screen` options (default for iOS push).",
      custom: "Custom `cardStyleInterpolator` or `transitionSpec` in `Stack.Screen` options — see connection label.",
    },
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
    transitions: {
      push: "`Navigator.push(context, MaterialPageRoute(builder: (_) => TargetScreen()))` — default slide-from-right.",
      modal: "`showModalBottomSheet(context: context, builder: (_) => TargetWidget())`.",
      fullScreenCover: "`MaterialPageRoute(builder: (_) => TargetScreen(), fullscreenDialog: true)`.",
      replace: "`Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => TargetScreen()))`.",
      pop: "`Navigator.pop(context)` to return to the previous route.",
      tab: "`DefaultTabController` with `TabBar` + `TabBarView`, or update `_selectedIndex` for `BottomNavigationBar`.",
      fade: "`PageRouteBuilder` with `FadeTransition(opacity: animation, child: page)` as `transitionsBuilder`.",
      slideUp: "`PageRouteBuilder` with `SlideTransition(position: Tween(begin: Offset(0, 1)).animate(animation))`.",
      slideLeft: "`PageRouteBuilder` with `SlideTransition(position: Tween(begin: Offset(-1, 0)).animate(animation))`.",
      custom: "Custom `PageRouteBuilder` with a `transitionsBuilder` — see connection label for details.",
    },
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
    transitions: {
      push: "`navController.navigate(\"route\")` — pair with `enterTransition`/`exitTransition` on `composable()`.",
      modal: "`ModalBottomSheet { }` or `Dialog { }` composable for overlay presentation.",
      fullScreenCover: "`composable()` with `enterTransition = { slideInVertically(initialOffsetY = { it }) }` covering the full screen.",
      replace: "`navController.navigate(\"route\") { popUpTo(currentRoute) { inclusive = true } }` to replace without backstack.",
      pop: "`navController.popBackStack()` to return to the previous destination.",
      tab: "`NavigationBar` with `NavigationBarItem`, update `selectedDestination` state to switch tabs.",
      fade: "`enterTransition = { fadeIn() }` and `exitTransition = { fadeOut() }` on `composable()`.",
      slideUp: "`enterTransition = { slideInVertically(initialOffsetY = { it }) }` on `composable()`.",
      slideLeft: "`enterTransition = { slideInHorizontally(initialOffsetX = { -it }) }` on `composable()`.",
      custom: "Custom `EnterTransition`/`ExitTransition` on `composable()` — see connection label for details.",
    },
  },
};

// Platform-specific accessibility API mappings.
// Each platform defines how to apply label, hint, role, and trait annotations.
export const ACCESSIBILITY_PLATFORM_MAP = {
  swiftui: {
    name: "SwiftUI",
    docsUrl: "https://developer.apple.com/accessibility/",
    label: `.accessibilityLabel("text")`,
    hint: `.accessibilityHint("text")`,
    roles: {
      button: `.accessibilityAddTraits(.isButton)`,
      link: `.accessibilityAddTraits(.isLink)`,
      image: `.accessibilityAddTraits(.isImage)`,
      heading: `.accessibilityAddTraits(.isHeader)`,
      text: `.accessibilityAddTraits(.isStaticText)`,
      "search-field": `.accessibilityAddTraits(.isSearchField)`,
      toggle: `.accessibilityAddTraits(.isToggle)`,
      slider: `Slider().accessibilityLabel("text")`,
      tab: `.accessibilityAddTraits(.isTabBar)`,
      alert: `alert modifier with accessibilityLabel`,
      menu: `.accessibilityAddTraits(.isButton)` + ` with Menu`,
      other: `.accessibilityAddTraits(...)`,
    },
    traits: {
      selected: `.accessibilityAddTraits(.isSelected)`,
      disabled: `.disabled(true)`,
      adjustable: `.accessibilityAdjustableAction { ... }`,
      header: `.accessibilityAddTraits(.isHeader)`,
      summary: `.accessibilityAddTraits(.isSummaryElement)`,
      "plays-sound": `.accessibilityAddTraits(.playsSound)`,
      "starts-media": `.accessibilityAddTraits(.startsMediaSession)`,
      "allows-direct-interaction": `.accessibilityAddTraits(.allowsDirectInteraction)`,
    },
  },
  "react-native": {
    name: "React Native",
    docsUrl: "https://reactnative.dev/docs/accessibility",
    label: `accessibilityLabel="text"`,
    hint: `accessibilityHint="text"`,
    roles: {
      button: `accessibilityRole="button"`,
      link: `accessibilityRole="link"`,
      image: `accessibilityRole="image"`,
      heading: `accessibilityRole="header"`,
      text: `accessibilityRole="text"`,
      "search-field": `accessibilityRole="search"`,
      toggle: `accessibilityRole="switch"`,
      slider: `accessibilityRole="adjustable"`,
      tab: `accessibilityRole="tab"`,
      alert: `accessibilityRole="alert"`,
      menu: `accessibilityRole="menu"`,
      other: `accessibilityRole="none"`,
    },
    traits: {
      selected: `accessibilityState={{ selected: true }}`,
      disabled: `accessibilityState={{ disabled: true }}`,
      adjustable: `accessibilityRole="adjustable"`,
      header: `accessibilityRole="header"`,
      summary: `accessibilityRole="summary"`,
      "plays-sound": `accessibilityHint (describe sound)`,
      "starts-media": `accessibilityHint (describe media)`,
      "allows-direct-interaction": `accessible={false} on inner touch`,
    },
  },
  flutter: {
    name: "Flutter",
    docsUrl: "https://docs.flutter.dev/ui/accessibility-and-internationalization/accessibility",
    label: `Semantics(label: "text")`,
    hint: `Semantics(hint: "text")`,
    roles: {
      button: `Semantics(button: true)`,
      link: `Semantics(link: true)`,
      image: `Semantics(image: true)`,
      heading: `Semantics(header: true)`,
      text: `Semantics(label: "text")`,
      "search-field": `Semantics(textField: true)`,
      toggle: `Semantics(toggled: value)`,
      slider: `Semantics(slider: true)`,
      tab: `Semantics(label: "tab name", selected: isSelected)`,
      alert: `Semantics(liveRegion: true)`,
      menu: `Semantics(button: true, label: "menu")`,
      other: `Semantics(label: "description")`,
    },
    traits: {
      selected: `Semantics(selected: true)`,
      disabled: `ExcludeSemantics or Semantics(enabled: false)`,
      adjustable: `Semantics(onIncrease: ..., onDecrease: ...)`,
      header: `Semantics(header: true)`,
      summary: `Semantics(label: "summary text")`,
      "plays-sound": `Semantics(hint: "plays sound")`,
      "starts-media": `Semantics(hint: "starts media")`,
      "allows-direct-interaction": `Semantics(scopesRoute: false)`,
    },
  },
  "jetpack-compose": {
    name: "Jetpack Compose",
    docsUrl: "https://developer.android.com/jetpack/compose/accessibility",
    label: `Modifier.semantics { contentDescription = "text" }`,
    hint: `Modifier.semantics { stateDescription = "text" }`,
    roles: {
      button: `Modifier.semantics { role = Role.Button }`,
      link: `Modifier.semantics { role = Role.Button } (with URL action)`,
      image: `Modifier.semantics { role = Role.Image }`,
      heading: `Modifier.semantics { heading() }`,
      text: `Text("...") (inherits semantics)`,
      "search-field": `Modifier.semantics { role = Role.Button } with search label`,
      toggle: `Modifier.semantics { role = Role.Switch }`,
      slider: `Modifier.semantics { role = Role.Range }`,
      tab: `Modifier.semantics { role = Role.Tab }`,
      alert: `LiveData with Modifier.semantics { liveRegion = LiveRegionMode.Polite }`,
      menu: `Modifier.semantics { role = Role.DropdownList }`,
      other: `Modifier.semantics { contentDescription = "..." }`,
    },
    traits: {
      selected: `Modifier.semantics { selected = true }`,
      disabled: `Modifier.semantics { disabled() }`,
      adjustable: `Modifier.semantics { setProgress(action = { ... }) }`,
      header: `Modifier.semantics { heading() }`,
      summary: `Modifier.semantics { contentDescription = "summary" }`,
      "plays-sound": `Modifier.semantics { stateDescription = "plays sound" }`,
      "starts-media": `Modifier.semantics { stateDescription = "starts media" }`,
      "allows-direct-interaction": `Modifier.semantics { clearAndSetSemantics { } }`,
    },
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

// Generate the full ### Transition Types table for a specific platform.
// Returns null when platform is "auto" or unknown — callers handle those paths separately.
export function renderBuildGuideTransitionTable(platform) {
  const pt = PLATFORM_TERMINOLOGY[platform];
  if (!pt || !pt.transitions) return null;

  let md = `### Transition Types\n\n`;
  md += `| Transition | Implementation |\n`;
  md += `|------------|---------------|\n`;

  const transitionOrder = ["push", "modal", "fullScreenCover", "replace", "pop", "tab", "fade", "slideUp", "slideLeft", "custom"];
  for (const t of transitionOrder) {
    if (pt.transitions[t]) {
      md += `| **${t}** | ${pt.transitions[t]} |\n`;
    }
  }
  md += `\n`;

  return md;
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

// Render an #### Accessibility subsection for hotspots that have accessibility annotations.
// Returns null when no hotspot has accessibility data.
export function renderAccessibilityBlock(hotspots) {
  const a11yHotspots = (hotspots || []).filter((h) => h.accessibility);
  if (a11yHotspots.length === 0) return null;

  let md = `#### Accessibility\n\n`;
  md += `| Element | A11y Label | Role | Hint | Traits |\n`;
  md += `|---------|-----------|------|------|--------|\n`;

  for (const h of a11yHotspots) {
    const a = h.accessibility;
    const name = h.label || "Unnamed";
    const a11yLabel = a.label || "\u2014";
    const role = a.role || "\u2014";
    const hint = a.hint || "\u2014";
    const traits = a.traits?.length > 0 ? a.traits.join(", ") : "\u2014";
    md += `| ${name} | ${a11yLabel} | ${role} | ${hint} | ${traits} |\n`;
  }
  md += `\n`;

  return md;
}

// Generate ### Accessibility guidance table for a specific platform's build guide.
// Returns null when platform is "auto" or unknown.
export function renderAccessibilityGuidance(platform) {
  const pm = ACCESSIBILITY_PLATFORM_MAP[platform];
  if (!pm) return null;

  let md = `### Accessibility\n\n`;
  md += `Apply accessibility annotations to every interactive element. Each hotspot's accessibility data from \`screens.md\` maps to ${pm.name} APIs:\n\n`;
  md += `| Property | Implementation |\n`;
  md += `|----------|---------------|\n`;
  md += `| **Label** | \`${pm.label}\` |\n`;
  md += `| **Hint** | \`${pm.hint}\` |\n`;

  // Show a few representative role mappings
  const roleExamples = ["button", "link", "image", "heading"];
  for (const r of roleExamples) {
    if (pm.roles[r]) {
      md += `| **Role: ${r}** | \`${pm.roles[r]}\` |\n`;
    }
  }

  // Show a few representative trait mappings
  const traitExamples = ["selected", "disabled", "header"];
  for (const t of traitExamples) {
    if (pm.traits[t]) {
      md += `| **Trait: ${t}** | \`${pm.traits[t]}\` |\n`;
    }
  }

  md += `\n`;
  md += `> For the full role and trait mapping, refer to the [${pm.name} accessibility documentation](${pm.docsUrl}).\n\n`;

  return md;
}

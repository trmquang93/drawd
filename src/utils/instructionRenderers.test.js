import { describe, it, expect } from "vitest";
import {
  renderHotspotDetailBlock,
  renderBuildGuideActionTable,
  renderBuildGuideTransitionTable,
} from "./instructionRenderers.js";

const makeScreen = (id, name) => ({ id, name });

const makeDoc = (id, name) => ({ id, name, content: "doc content" });

describe("renderHotspotDetailBlock", () => {
  it("returns null for navigate action", () => {
    const h = { action: "navigate", label: "Go" };
    expect(renderHotspotDetailBlock(h, [], [])).toBeNull();
  });

  it("returns null for back action", () => {
    const h = { action: "back", label: "Back" };
    expect(renderHotspotDetailBlock(h, [], [])).toBeNull();
  });

  it("returns null for modal action", () => {
    const h = { action: "modal", label: "Open" };
    expect(renderHotspotDetailBlock(h, [], [])).toBeNull();
  });

  it("returns null for unknown action", () => {
    const h = { action: "nonexistent", label: "X" };
    expect(renderHotspotDetailBlock(h, [], [])).toBeNull();
  });

  it("returns API detail block with endpoint, method, and document reference", () => {
    const h = {
      action: "api",
      label: "Login",
      apiEndpoint: "/api/login",
      apiMethod: "POST",
      documentId: "doc1",
    };
    const screens = [];
    const documents = [makeDoc("doc1", "Auth API")];
    const result = renderHotspotDetailBlock(h, screens, documents);
    expect(result).toContain("POST");
    expect(result).toContain("/api/login");
    expect(result).toContain("Auth API");
  });

  it("returns API detail block with success and error actions", () => {
    const h = {
      action: "api",
      label: "Fetch",
      apiEndpoint: "/api/data",
      apiMethod: "GET",
      onSuccessAction: "navigate",
      onSuccessTargetId: "s2",
      onErrorAction: "custom",
      onErrorCustomDesc: "Show toast",
    };
    const screens = [makeScreen("s2", "Dashboard")];
    const result = renderHotspotDetailBlock(h, screens, []);
    expect(result).toContain("On success: navigate");
    expect(result).toContain("Dashboard");
    expect(result).toContain("On error: custom");
    expect(result).toContain("Show toast");
  });

  it("returns null for api hotspot with no endpoint and no method", () => {
    const h = { action: "api", label: "Empty API" };
    expect(renderHotspotDetailBlock(h, [], [])).toBeNull();
  });

  it("returns conditional detail block listing each branch and target", () => {
    const h = {
      action: "conditional",
      label: "Check Role",
      conditions: [
        { label: "Admin", targetScreenId: "s1" },
        { label: "User", targetScreenId: "s2" },
      ],
    };
    const screens = [makeScreen("s1", "Admin Panel"), makeScreen("s2", "User Home")];
    const result = renderHotspotDetailBlock(h, screens, []);
    expect(result).toContain("Admin");
    expect(result).toContain("Admin Panel");
    expect(result).toContain("User");
    expect(result).toContain("User Home");
  });

  it("returns null for conditional with empty conditions array", () => {
    const h = { action: "conditional", label: "Empty", conditions: [] };
    expect(renderHotspotDetailBlock(h, [], [])).toBeNull();
  });

  it("returns custom detail block with description", () => {
    const h = {
      action: "custom",
      label: "Haptic",
      customDescription: "Trigger haptic feedback",
    };
    const result = renderHotspotDetailBlock(h, [], []);
    expect(result).toContain("Trigger haptic feedback");
    expect(result).toContain("Haptic");
  });

  it("returns null for custom with no description", () => {
    const h = { action: "custom", label: "Empty" };
    expect(renderHotspotDetailBlock(h, [], [])).toBeNull();
  });
});

describe("renderBuildGuideActionTable", () => {
  it("returns null for platform 'auto'", () => {
    expect(renderBuildGuideActionTable("auto")).toBeNull();
  });

  it("returns null for unknown platform", () => {
    expect(renderBuildGuideActionTable("cobol")).toBeNull();
  });

  it("returns a table string for swiftui", () => {
    const result = renderBuildGuideActionTable("swiftui");
    expect(result).toContain("### Action Types");
    expect(result).toContain("NavigationStack");
  });

  it("returns a table string for react-native", () => {
    const result = renderBuildGuideActionTable("react-native");
    expect(result).toContain("### Action Types");
    expect(result).toContain("navigation.navigate");
  });

  it("returns a table string for flutter", () => {
    const result = renderBuildGuideActionTable("flutter");
    expect(result).toContain("### Action Types");
    expect(result).toContain("Navigator.push");
  });

  it("returns a table string for jetpack-compose", () => {
    const result = renderBuildGuideActionTable("jetpack-compose");
    expect(result).toContain("### Action Types");
    expect(result).toContain("navController.navigate");
  });

  it("includes all 6 action types in the generated table", () => {
    const result = renderBuildGuideActionTable("swiftui");
    expect(result).toContain("**navigate**");
    expect(result).toContain("**back**");
    expect(result).toContain("**modal**");
    expect(result).toContain("**conditional**");
    expect(result).toContain("**api**");
    expect(result).toContain("**custom**");
  });
});

describe("renderBuildGuideTransitionTable", () => {
  it("returns null for platform 'auto'", () => {
    expect(renderBuildGuideTransitionTable("auto")).toBeNull();
  });

  it("returns null for unknown platform", () => {
    expect(renderBuildGuideTransitionTable("cobol")).toBeNull();
  });

  it("returns a table string for swiftui with platform-specific patterns", () => {
    const result = renderBuildGuideTransitionTable("swiftui");
    expect(result).toContain("### Transition Types");
    expect(result).toContain(".sheet");
    expect(result).toContain(".fullScreenCover");
    expect(result).toContain(".transition(.opacity)");
  });

  it("returns a table string for react-native with platform-specific patterns", () => {
    const result = renderBuildGuideTransitionTable("react-native");
    expect(result).toContain("### Transition Types");
    expect(result).toContain("fullScreenModal");
    expect(result).toContain("slide_from_bottom");
  });

  it("returns a table string for flutter with platform-specific patterns", () => {
    const result = renderBuildGuideTransitionTable("flutter");
    expect(result).toContain("### Transition Types");
    expect(result).toContain("FadeTransition");
    expect(result).toContain("fullscreenDialog");
  });

  it("returns a table string for jetpack-compose with platform-specific patterns", () => {
    const result = renderBuildGuideTransitionTable("jetpack-compose");
    expect(result).toContain("### Transition Types");
    expect(result).toContain("fadeIn");
    expect(result).toContain("slideInVertically");
  });

  it("includes all 10 transition types in the generated table", () => {
    const result = renderBuildGuideTransitionTable("swiftui");
    expect(result).toContain("**push**");
    expect(result).toContain("**modal**");
    expect(result).toContain("**fullScreenCover**");
    expect(result).toContain("**replace**");
    expect(result).toContain("**pop**");
    expect(result).toContain("**tab**");
    expect(result).toContain("**fade**");
    expect(result).toContain("**slideUp**");
    expect(result).toContain("**slideLeft**");
    expect(result).toContain("**custom**");
  });
});

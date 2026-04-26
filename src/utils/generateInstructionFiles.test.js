import { describe, it, expect } from "vitest";
import {
  slugify,
  sortedScreens,
  detectDeviceType,
  mostCommon,
  generateInstructionFiles,
  getComponentGroups,
} from "./generateInstructionFiles.js";

// --- Helper unit tests ---

describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("collapses multiple special characters into a single hyphen", () => {
    expect(slugify("foo--bar")).toBe("foo-bar");
  });

  it("trims leading/trailing non-alphanumeric characters", () => {
    expect(slugify("  leading/trailing  ")).toBe("leading-trailing");
  });
});

describe("sortedScreens", () => {
  it("sorts by x then y", () => {
    const screens = [
      { id: "a", x: 100, y: 0 },
      { id: "b", x: 0, y: 50 },
      { id: "c", x: 0, y: 10 },
    ];
    const sorted = sortedScreens(screens);
    expect(sorted.map((s) => s.id)).toEqual(["c", "b", "a"]);
  });

  it("does not mutate the original array", () => {
    const screens = [
      { id: "a", x: 100, y: 0 },
      { id: "b", x: 0, y: 0 },
    ];
    const original = [...screens];
    sortedScreens(screens);
    expect(screens).toEqual(original);
  });
});

describe("detectDeviceType", () => {
  it("returns null for null/undefined dimensions", () => {
    expect(detectDeviceType(null, null)).toBeNull();
    expect(detectDeviceType(undefined, undefined)).toBeNull();
    expect(detectDeviceType(0, 0)).toBeNull();
  });

  it("detects iPad for ~4:3 portrait ratio", () => {
    // iPad portrait: 768 x 1024 => ratio 1.33
    const result = detectDeviceType(768, 1024);
    expect(result).toContain("iPad");
  });

  it("detects iPhone for tall narrow portrait ratio", () => {
    // iPhone point dimensions: 390 x 844 => ratio 2.16
    const result = detectDeviceType(390, 844);
    expect(result).toContain("iPhone");
  });
});

describe("mostCommon", () => {
  it("returns the most frequent element", () => {
    expect(mostCommon(["a", "b", "a", "c", "a"])).toBe("a");
  });

  it("handles a tie by returning one of the tied values", () => {
    const result = mostCommon(["x", "y"]);
    expect(["x", "y"]).toContain(result);
  });
});

// --- Integration tests ---

describe("generateInstructionFiles", () => {
  const minimalScreen = {
    id: "s1",
    name: "Home",
    x: 0,
    y: 0,
    width: 390,
    imageWidth: 390,
    imageHeight: 844,
    hotspots: [],
  };

  const defaultOptions = { platform: "swiftui" };

  it("returns files array with required markdown files", () => {
    const result = generateInstructionFiles([minimalScreen], [], defaultOptions);
    const names = result.files.map((f) => f.name);
    expect(names).toContain("index.md");
    expect(names).toContain("main.md");
    expect(names).toContain("screens.md");
    expect(names).toContain("navigation.md");
    expect(names).toContain("build-guide.md");
    expect(names).toContain("tasks.md");
  });

  it("places index.md as the first file", () => {
    const result = generateInstructionFiles([minimalScreen], [], defaultOptions);
    expect(result.files[0].name).toBe("index.md");
  });

  it("prepends drawd-schema header comment to all files", () => {
    const result = generateInstructionFiles([minimalScreen], [], defaultOptions);
    for (const file of result.files) {
      expect(file.content).toMatch(/^<!-- drawd-schema:/);
    }
  });

  it("returns images array with one entry per screen that has imageData", () => {
    const screenWithImage = {
      ...minimalScreen,
      imageData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlz",
    };
    const result = generateInstructionFiles([screenWithImage], [], defaultOptions);
    expect(result.images.length).toBe(1);
    expect(result.images[0].name).toMatch(/^images\//);
  });

  it("returns empty images array when screens have no imageData", () => {
    const result = generateInstructionFiles([minimalScreen], [], defaultOptions);
    expect(result.images).toEqual([]);
  });

  it("includes documents.md when documents are provided", () => {
    const opts = {
      ...defaultOptions,
      documents: [{ id: "d1", name: "API Spec", content: "GET /users" }],
    };
    const result = generateInstructionFiles([minimalScreen], [], opts);
    const names = result.files.map((f) => f.name);
    expect(names).toContain("documents.md");
  });

  it("does not include documents.md when no documents provided", () => {
    const result = generateInstructionFiles([minimalScreen], [], defaultOptions);
    const names = result.files.map((f) => f.name);
    expect(names).not.toContain("documents.md");
  });

  it("does not include types.md when no dataModels provided", () => {
    const result = generateInstructionFiles([minimalScreen], [], defaultOptions);
    const names = result.files.map((f) => f.name);
    expect(names).not.toContain("types.md");
  });

  it("includes types.md when dataModels are provided", () => {
    const opts = {
      ...defaultOptions,
      dataModels: [{ name: "User", schema: "struct User { id: Int }" }],
    };
    const result = generateInstructionFiles([minimalScreen], [], opts);
    const names = result.files.map((f) => f.name);
    expect(names).toContain("types.md");
  });

  it("handles multiple screens sorted by position", () => {
    const screens = [
      { ...minimalScreen, id: "s2", name: "Settings", x: 400, y: 0 },
      { ...minimalScreen, id: "s1", name: "Home", x: 0, y: 0 },
    ];
    const result = generateInstructionFiles(screens, [], defaultOptions);
    // Should not throw and produce valid output
    expect(result.files.length).toBeGreaterThanOrEqual(6);
  });

  it("handles connections between screens", () => {
    const screens = [
      { ...minimalScreen, id: "s1", name: "Home" },
      { ...minimalScreen, id: "s2", name: "Settings", x: 400 },
    ];
    const connections = [
      { id: "c1", fromScreenId: "s1", toScreenId: "s2", label: "Go to Settings" },
    ];
    const result = generateInstructionFiles(screens, connections, defaultOptions);
    const navFile = result.files.find((f) => f.name === "navigation.md");
    expect(navFile.content).toContain("Settings");
  });

  it("renders human-readable transition labels in navigation.md", () => {
    const screens = [
      { ...minimalScreen, id: "s1", name: "Home" },
      { ...minimalScreen, id: "s2", name: "Detail", x: 400 },
    ];
    const connections = [
      { id: "c1", fromScreenId: "s1", toScreenId: "s2", transitionType: "fullScreenCover" },
      { id: "c2", fromScreenId: "s1", toScreenId: "s2", transitionType: "slideUp" },
      { id: "c3", fromScreenId: "s1", toScreenId: "s2", transitionType: "fade" },
    ];
    const result = generateInstructionFiles(screens, connections, defaultOptions);
    const navFile = result.files.find((f) => f.name === "navigation.md");
    expect(navFile.content).toContain("Full-screen cover");
    expect(navFile.content).toContain("Slide up");
    expect(navFile.content).toContain("Fade");
    expect(navFile.content).not.toContain("fullScreenCover");
    expect(navFile.content).not.toContain("slideUp");
  });

  it("includes Transition Types section in build-guide.md for platform-specific output", () => {
    const result = generateInstructionFiles([minimalScreen], [], { platform: "swiftui" });
    const buildGuide = result.files.find((f) => f.name === "build-guide.md");
    expect(buildGuide.content).toContain("### Transition Types");
    expect(buildGuide.content).toContain(".fullScreenCover");
    expect(buildGuide.content).toContain(".transition(.opacity)");
  });

  it("includes transition type guidance in build-guide.md for auto platform", () => {
    const result = generateInstructionFiles([minimalScreen], [], { platform: "auto" });
    const buildGuide = result.files.find((f) => f.name === "build-guide.md");
    expect(buildGuide.content).toContain("fullScreenCover");
    expect(buildGuide.content).toContain("slideUp");
  });

  it("includes Accessibility section in screens.md when hotspots have accessibility data", () => {
    const screenWithA11y = {
      ...minimalScreen,
      hotspots: [{
        id: "h1",
        label: "Login",
        elementType: "button",
        interactionType: "tap",
        action: "navigate",
        x: 10, y: 10, w: 80, h: 15,
        accessibility: { label: "Sign in", role: "button", hint: "Double tap to sign in", traits: [] },
      }],
    };
    const result = generateInstructionFiles([screenWithA11y], [], defaultOptions);
    const screensFile = result.files.find((f) => f.name === "screens.md");
    expect(screensFile.content).toContain("#### Accessibility");
    expect(screensFile.content).toContain("Sign in");
  });

  it("does not include Accessibility section when no hotspots have accessibility data", () => {
    const screenNoA11y = {
      ...minimalScreen,
      hotspots: [{
        id: "h1",
        label: "Button",
        elementType: "button",
        interactionType: "tap",
        action: "navigate",
        x: 10, y: 10, w: 80, h: 15,
      }],
    };
    const result = generateInstructionFiles([screenNoA11y], [], defaultOptions);
    const screensFile = result.files.find((f) => f.name === "screens.md");
    expect(screensFile.content).not.toContain("#### Accessibility");
  });

  it("includes Accessibility guidance in build-guide.md for platform-specific output", () => {
    const result = generateInstructionFiles([minimalScreen], [], { platform: "swiftui" });
    const buildGuide = result.files.find((f) => f.name === "build-guide.md");
    expect(buildGuide.content).toContain("### Accessibility");
    expect(buildGuide.content).toContain(".accessibilityLabel");
  });

  it("does not include platform Accessibility guidance in build-guide.md for auto platform", () => {
    const result = generateInstructionFiles([minimalScreen], [], { platform: "auto" });
    const buildGuide = result.files.find((f) => f.name === "build-guide.md");
    expect(buildGuide.content).not.toContain(".accessibilityLabel");
  });
});

// --- Reusable component tests ---

describe("getComponentGroups", () => {
  const baseScreen = { id: "s", name: "Card", x: 0, y: 0, width: 390, imageWidth: 390, imageHeight: 844, hotspots: [] };

  it("returns empty maps when no screens have componentId", () => {
    const result = getComponentGroups([{ ...baseScreen, id: "s1" }]);
    expect(result.canonicalByComponentId.size).toBe(0);
    expect(result.instancesByComponentId.size).toBe(0);
  });

  it("groups canonical and instances by componentId", () => {
    const screens = [
      { ...baseScreen, id: "s1", name: "Card", componentId: "c1", componentRole: "canonical" },
      { ...baseScreen, id: "s2", name: "Card on Home", componentId: "c1", componentRole: "instance" },
      { ...baseScreen, id: "s3", name: "Card on Detail", componentId: "c1", componentRole: "instance" },
    ];
    const result = getComponentGroups(screens);
    expect(result.canonicalByComponentId.get("c1").id).toBe("s1");
    expect(result.instancesByComponentId.get("c1").map((s) => s.id)).toEqual(["s2", "s3"]);
    expect(result.componentSlugByComponentId.get("c1")).toBe("card");
  });

  it("drops orphan instances that have no canonical", () => {
    const screens = [
      { ...baseScreen, id: "s1", name: "Orphan", componentId: "c1", componentRole: "instance" },
    ];
    const result = getComponentGroups(screens);
    expect(result.canonicalByComponentId.size).toBe(0);
    expect(result.instancesByComponentId.size).toBe(0);
  });

  it("disambiguates slugs when two components share a name", () => {
    const screens = [
      { ...baseScreen, id: "s1", name: "Card", componentId: "c1", componentRole: "canonical" },
      { ...baseScreen, id: "s2", name: "Card", componentId: "c2", componentRole: "canonical" },
    ];
    const result = getComponentGroups(screens);
    const slugs = [result.componentSlugByComponentId.get("c1"), result.componentSlugByComponentId.get("c2")];
    expect(slugs).toContain("card");
    expect(slugs).toContain("card-2");
  });
});

describe("generateInstructionFiles - reusable components", () => {
  const minimalScreen = {
    id: "s1",
    name: "Home",
    x: 0,
    y: 0,
    width: 390,
    imageWidth: 390,
    imageHeight: 844,
    hotspots: [],
  };
  const opts = { platform: "swiftui" };

  it("emits exactly one components/<slug>.md per canonical", () => {
    const screens = [
      { ...minimalScreen, id: "s1", name: "Card", componentId: "c1", componentRole: "canonical" },
      { ...minimalScreen, id: "s2", name: "Home", x: 400, componentId: "c1", componentRole: "instance" },
      { ...minimalScreen, id: "s3", name: "Detail", x: 800, componentId: "c1", componentRole: "instance" },
    ];
    const result = generateInstructionFiles(screens, [], opts);
    const componentFiles = result.files.filter((f) => f.name.startsWith("components/"));
    expect(componentFiles.length).toBe(1);
    expect(componentFiles[0].name).toBe("components/card.md");
  });

  it("emits no component files when no screens are marked canonical", () => {
    const result = generateInstructionFiles([minimalScreen], [], opts);
    const componentFiles = result.files.filter((f) => f.name.startsWith("components/"));
    expect(componentFiles.length).toBe(0);
  });

  it("renders instance screens as a stub linking to the canonical component file", () => {
    const screens = [
      { ...minimalScreen, id: "s1", name: "Card", componentId: "c1", componentRole: "canonical" },
      { ...minimalScreen, id: "s2", name: "Home", x: 400, componentId: "c1", componentRole: "instance" },
    ];
    const result = generateInstructionFiles(screens, [], opts);
    const screensFile = result.files.find((f) => f.name === "screens.md");
    expect(screensFile.content).toContain("Instance of [Card](components/card.md)");
  });

  it("does not duplicate hotspot tables for instance screens", () => {
    const hotspot = {
      id: "h1",
      label: "Login",
      elementType: "button",
      interactionType: "tap",
      action: "navigate",
      x: 10, y: 10, w: 80, h: 15,
    };
    const screens = [
      { ...minimalScreen, id: "s1", name: "Card", hotspots: [hotspot], componentId: "c1", componentRole: "canonical" },
      { ...minimalScreen, id: "s2", name: "Home", x: 400, hotspots: [hotspot], componentId: "c1", componentRole: "instance" },
    ];
    const result = generateInstructionFiles(screens, [], opts);
    const screensFile = result.files.find((f) => f.name === "screens.md");
    // Instance section should NOT include a hotspots table — only the canonical does.
    // Hotspots table emits a "| Login |" row; canonical contributes one such row.
    const matches = screensFile.content.match(/\| Login \|/g) || [];
    expect(matches.length).toBe(1);
  });

  it("adds a components/ row to main.md only when canonicals exist", () => {
    const noComponentResult = generateInstructionFiles([minimalScreen], [], opts);
    const noComponentMain = noComponentResult.files.find((f) => f.name === "main.md");
    expect(noComponentMain.content).not.toContain("Reusable component specs");

    const screens = [
      { ...minimalScreen, id: "s1", name: "Card", componentId: "c1", componentRole: "canonical" },
    ];
    const withComponentResult = generateInstructionFiles(screens, [], opts);
    const withComponentMain = withComponentResult.files.find((f) => f.name === "main.md");
    expect(withComponentMain.content).toContain("Reusable component specs");
  });

  it("component file lists placements with canonical and instances", () => {
    const screens = [
      { ...minimalScreen, id: "s1", name: "Card", componentId: "c1", componentRole: "canonical" },
      { ...minimalScreen, id: "s2", name: "Home", x: 400, componentId: "c1", componentRole: "instance" },
    ];
    const result = generateInstructionFiles(screens, [], opts);
    const componentFile = result.files.find((f) => f.name === "components/card.md");
    expect(componentFile.content).toContain("# Component: Card");
    expect(componentFile.content).toContain("canonical");
    expect(componentFile.content).toContain("instance");
    expect(componentFile.content).toContain("Home");
  });
});

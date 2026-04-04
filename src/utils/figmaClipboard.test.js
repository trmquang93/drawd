import { describe, it, expect } from "vitest";
import { buildFigmaClipboardHtml } from "./figmaClipboard";
import { readHTMLMessage } from "fig-kiwi/dist/index.esm.js";
import exampleRawNodeTree from "./__fixtures__/exampleRawNodeTree.json";
import expectedNodeChanges from "./__fixtures__/expectedNodeChanges.json";

// Our HTML wrapper entity-escapes the comment markers (e.g. &lt;!-- instead of <!--)
// so that DOM parsers decode them correctly when reading attribute values.
// The fig-kiwi reader does a raw string search, so we must unescape before passing it.
function decodeForFigKiwi(html) {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// Minimal node factories matching the shape dom-traversal.js produces.
function makeFrame(overrides = {}) {
  return {
    type: "FRAME",
    name: "Screen",
    x: 0,
    y: 0,
    width: 393,
    height: 852,
    opacity: 1,
    fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 1 }],
    strokes: [],
    strokeWeight: 0,
    strokeAlign: "INSIDE",
    effects: [],
    cornerRadius: 0,
    clipsContent: true,
    layoutMode: "NONE",
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    itemSpacing: 0,
    children: [],
    ...overrides,
  };
}

function makeRect(overrides = {}) {
  return {
    type: "RECTANGLE",
    name: "Box",
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    opacity: 1,
    fills: [{ type: "SOLID", color: { r: 0, g: 0.5, b: 1 }, opacity: 1 }],
    strokes: [],
    strokeWeight: 0,
    strokeAlign: "INSIDE",
    effects: [],
    cornerRadius: 8,
    clipsContent: false,
    layoutMode: "NONE",
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    paddingBottom: 0,
    itemSpacing: 0,
    children: [],
    ...overrides,
  };
}

function makeText(overrides = {}) {
  return {
    type: "TEXT",
    name: "Hello",
    x: 20,
    y: 20,
    width: 200,
    height: 24,
    singleLine: true,
    opacity: 1,
    characters: "Hello World",
    style: {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 400,
      italic: false,
      lineHeightPx: 19.2,
      letterSpacing: 0,
      textAlignHorizontal: "LEFT",
      textAlignVertical: "TOP",
      textDecoration: "NONE",
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }],
    },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    strokeAlign: "INSIDE",
    effects: [],
    children: [],
    ...overrides,
  };
}

describe("buildFigmaClipboardHtml", () => {
  it("produces HTML with figmeta and figma markers", () => {
    const html = buildFigmaClipboardHtml(makeFrame());
    expect(html).toContain("figmeta");
    expect(html).toContain("figma");
  });

  it("round-trips a root frame with no children", () => {
    const html = buildFigmaClipboardHtml(makeFrame());
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    // DOCUMENT + CANVAS + root FRAME = 3 nodeChanges
    expect(message.nodeChanges).toHaveLength(3);
    expect(message.nodeChanges[0].type).toBe("DOCUMENT");
    expect(message.nodeChanges[1].type).toBe("CANVAS");
    expect(message.nodeChanges[2].type).toBe("FRAME");
  });

  it("round-trips a FRAME containing a RECTANGLE child", () => {
    const root = makeFrame({ children: [makeRect()] });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    // DOCUMENT + CANVAS + FRAME + ROUNDED_RECTANGLE = 4
    expect(message.nodeChanges).toHaveLength(4);
    expect(message.nodeChanges[3].type).toBe("ROUNDED_RECTANGLE");
  });

  it("round-trips a FRAME containing a TEXT child", () => {
    const root = makeFrame({ children: [makeText()] });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    // DOCUMENT + CANVAS + FRAME + TEXT = 4
    expect(message.nodeChanges).toHaveLength(4);
    const textNode = message.nodeChanges[3];
    expect(textNode.type).toBe("TEXT");
    expect(textNode.textData.characters).toBe("Hello World");
  });

  it("encodes nested children correctly", () => {
    const root = makeFrame({
      children: [
        makeFrame({
          name: "Card",
          x: 0, y: 0, width: 393, height: 200,
          children: [makeRect(), makeText()],
        }),
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    // DOCUMENT + CANVAS + root FRAME + inner FRAME + RECT + TEXT = 6
    expect(message.nodeChanges).toHaveLength(6);
  });

  it("pastePageId matches the CANVAS node GUID", () => {
    const root = makeFrame();
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const canvasNode = message.nodeChanges.find((n) => n.type === "CANVAS");
    expect(message.pastePageId).toEqual(canvasNode.guid);
  });

  it("sets correct size on encoded nodes", () => {
    const root = makeFrame({ width: 393, height: 852 });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const frame = message.nodeChanges.find((n) => n.type === "FRAME");
    expect(frame.size.x).toBeCloseTo(393);
    expect(frame.size.y).toBeCloseTo(852);
  });

  it("writes archive version 20", () => {
    const html = buildFigmaClipboardHtml(makeFrame());
    // Extract the base64-encoded figma binary from the HTML
    const markerStart = "(figma)";
    const markerEnd = "(/figma)";
    const si = html.indexOf(markerStart) + markerStart.length;
    const ei = html.indexOf(markerEnd);
    const b64 = html.substring(si, ei);
    // Decode base64 to bytes; version uint32 LE is at offset 8 (after 8-byte prelude)
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const version = view.getUint32(8, /* littleEndian */ true);
    expect(version).toBe(20);
  });

  it("entity-escapes comment delimiters in HTML attributes", () => {
    const html = buildFigmaClipboardHtml(makeFrame());
    // The data-metadata and data-buffer attributes must use &lt;!-- not raw <!--
    expect(html).toContain("&lt;!--(figmeta)");
    expect(html).toContain("&lt;!--(figma)");
    // Raw comment-start must NOT appear inside attribute values
    const attrSection = html.slice(html.indexOf('data-metadata="'));
    expect(attrSection.indexOf('<!--')).toBe(-1);
  });

  it("includes isCut and publishedAssetGuids in the message", () => {
    const html = buildFigmaClipboardHtml(makeFrame());
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    expect(message.isCut).toBe(false);
    expect(message.publishedAssetGuids).toEqual([]);
  });

  it("preserves flex alignment properties from DOM traversal", () => {
    const root = makeFrame({
      layoutMode: "VERTICAL",
      primaryAxisAlignItems: "SPACE_BETWEEN",
      counterAxisAlignItems: "CENTER",
      children: [
        makeRect({ primaryGrow: 1 }),
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const frame = message.nodeChanges.find((n) => n.type === "FRAME");
    expect(frame.stackPrimaryAlignItems).toBe("SPACE_BETWEEN");
    expect(frame.stackCounterAlignItems).toBe("CENTER");
    const rect = message.nodeChanges.find((n) => n.type === "ROUNDED_RECTANGLE");
    expect(rect.stackChildPrimaryGrow).toBeCloseTo(1);
  });

  it("sets stackPrimarySizing FIXED on auto-layout frames", () => {
    const root = makeFrame({
      layoutMode: "VERTICAL",
      children: [makeRect()],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const frame = message.nodeChanges.find((n) => n.type === "FRAME");
    expect(frame.stackPrimarySizing).toBe("FIXED");
    expect(frame.stackCounterSizing).toBe("FIXED");
  });

  it("passes through STRETCH stackChildAlignSelf from node tree", () => {
    const root = makeFrame({
      layoutMode: "VERTICAL",
      children: [
        makeRect({ stackChildAlignSelf: "STRETCH" }),
        makeText({ stackChildAlignSelf: "STRETCH" }),
        makeRect({ stackChildAlignSelf: "AUTO" }),
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const rects = message.nodeChanges.filter((n) => n.type === "ROUNDED_RECTANGLE");
    const textNode = message.nodeChanges.find((n) => n.type === "TEXT");
    expect(rects[0].stackChildAlignSelf).toBe("STRETCH");
    expect(textNode.stackChildAlignSelf).toBe("STRETCH");
    expect(rects[1].stackChildAlignSelf).toBe("AUTO");
  });

  it("defaults stackChildAlignSelf to AUTO when not set on node", () => {
    const root = makeFrame({ children: [makeRect()] });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const rect = message.nodeChanges.find((n) => n.type === "ROUNDED_RECTANGLE");
    expect(rect.stackChildAlignSelf).toBe("AUTO");
  });

  it("includes layoutSize in textData matching node dimensions for single-line text", () => {
    const root = makeFrame({ children: [makeText({ width: 200, height: 24, singleLine: true })] });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const textNode = message.nodeChanges.find((n) => n.type === "TEXT");
    expect(textNode.textAutoResize).toBe("WIDTH_AND_HEIGHT");
    expect(textNode.textData.layoutSize).toEqual({ x: 200, y: 24 });
  });

  it("uses HEIGHT auto-resize with +1px width buffer for multi-line text", () => {
    const root = makeFrame({
      children: [makeText({ width: 300, height: 72, singleLine: false })],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const textNode = message.nodeChanges.find((n) => n.type === "TEXT");
    expect(textNode.textAutoResize).toBe("HEIGHT");
    expect(textNode.textData.layoutSize.x).toBe(301);
    expect(textNode.textData.layoutSize.y).toBe(72);
  });

  it("computes textTracking from letterSpacing in em thousandths", () => {
    const root = makeFrame({
      children: [makeText({
        width: 200, height: 24,
        style: {
          fontFamily: "Inter", fontSize: 16, fontWeight: 400, italic: false,
          lineHeightPx: 19.2, letterSpacing: 0.8,
          textAlignHorizontal: "LEFT", textAlignVertical: "TOP",
          textDecoration: "NONE",
          fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }],
        },
      })],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const textNode = message.nodeChanges.find((n) => n.type === "TEXT");
    // 0.8px / 16px fontSize * 1000 = 50
    expect(textNode.textTracking).toBeCloseTo(50);
  });

  it("encodes linear gradient fills from CSS string", () => {
    const root = makeFrame({
      fills: [
        {
          type: "GRADIENT_LINEAR",
          _raw: "linear-gradient(90deg, rgba(255,0,0,1) 0%, rgba(0,0,255,1) 100%)",
        },
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const frame = message.nodeChanges.find((n) => n.type === "FRAME");
    expect(frame.fillPaints.length).toBe(1);
    expect(frame.fillPaints[0].type).toBe("GRADIENT_LINEAR");
  });

  it("encodes independent corner radii", () => {
    const root = makeFrame({
      children: [
        makeRect({ rectangleCornerRadii: [4, 8, 12, 16], cornerRadius: undefined }),
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const rect = message.nodeChanges.find((n) => n.type === "ROUNDED_RECTANGLE");
    expect(rect.rectangleCornerRadiiIndependent).toBe(true);
    expect(rect.rectangleTopLeftCornerRadius).toBe(4);
    expect(rect.rectangleTopRightCornerRadius).toBe(8);
    expect(rect.rectangleBottomRightCornerRadius).toBe(12);
    expect(rect.rectangleBottomLeftCornerRadius).toBe(16);
  });

  it("encodes DROP_SHADOW effects", () => {
    const root = makeFrame({
      effects: [
        {
          type: "DROP_SHADOW",
          color: { r: 0, g: 0, b: 0, a: 0.25 },
          offset: { x: 0, y: 4 },
          radius: 8,
          spread: 0,
          visible: true,
          blendMode: "NORMAL",
        },
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const frame = message.nodeChanges.find((n) => n.type === "FRAME");
    expect(frame.effects.length).toBe(1);
    expect(frame.effects[0].type).toBe("DROP_SHADOW");
    expect(frame.effects[0].offset.y).toBe(4);
    expect(frame.effects[0].radius).toBe(8);
  });

  it("encodes TEXT with Bold Italic font style", () => {
    const root = makeFrame({
      children: [
        makeText({
          style: {
            fontFamily: "Inter",
            fontSize: 16,
            fontWeight: 700,
            italic: true,
            lineHeightPx: 19.2,
            letterSpacing: 0,
            textAlignHorizontal: "LEFT",
            textAlignVertical: "TOP",
            textDecoration: "NONE",
            fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }],
          },
        }),
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const textNode = message.nodeChanges.find((n) => n.type === "TEXT");
    expect(textNode.fontName.style).toBe("Bold Italic");
  });

  it("encodes stroke align OUTSIDE and CENTER", () => {
    const root = makeFrame({
      children: [
        makeRect({ strokeAlign: "OUTSIDE", strokeWeight: 2, strokes: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 }, opacity: 1 }] }),
        makeRect({ strokeAlign: "CENTER", strokeWeight: 1, strokes: [{ type: "SOLID", color: { r: 0, g: 1, b: 0 }, opacity: 1 }], x: 120 }),
      ],
    });
    const html = buildFigmaClipboardHtml(root);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const rects = message.nodeChanges.filter((n) => n.type === "ROUNDED_RECTANGLE");
    expect(rects[0].strokeAlign).toBe("OUTSIDE");
    expect(rects[1].strokeAlign).toBe("CENTER");
  });
});

// ─── Integration tests with example Sign Up screen fixture ──────────────────

describe("integration: example Sign Up screen fixture", () => {
  it("produces matching number of node changes", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    expect(message.nodeChanges.length).toBe(expectedNodeChanges.nodeChanges.length);
  });

  it("preserves all node types in correct order", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const actualTypes = message.nodeChanges.map((nc) => nc.type);
    const expectedTypes = expectedNodeChanges.nodeChanges.map((nc) => nc.type);
    expect(actualTypes).toEqual(expectedTypes);
  });

  it("preserves all node names in correct order", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const actualNames = message.nodeChanges.map((nc) => nc.name);
    const expectedNames = expectedNodeChanges.nodeChanges.map((nc) => nc.name);
    expect(actualNames).toEqual(expectedNames);
  });

  it("preserves node sizes", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    for (let i = 2; i < message.nodeChanges.length; i++) {
      const actual = message.nodeChanges[i];
      const expected = expectedNodeChanges.nodeChanges[i];
      if (expected.size) {
        expect(actual.size.x).toBeCloseTo(expected.size.x, 1);
        expect(actual.size.y).toBeCloseTo(expected.size.y, 1);
      }
    }
  });

  it("preserves parent-child relationships via position keys", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    for (let i = 2; i < message.nodeChanges.length; i++) {
      const actual = message.nodeChanges[i];
      const expected = expectedNodeChanges.nodeChanges[i];
      if (expected.parentIndex) {
        expect(actual.parentIndex.position).toBe(expected.parentIndex.position);
      }
    }
  });

  it("preserves fill paints for each node", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    for (let i = 2; i < message.nodeChanges.length; i++) {
      const actual = message.nodeChanges[i];
      const expected = expectedNodeChanges.nodeChanges[i];
      expect(actual.fillPaints.length).toBe(expected.fillPaints.length);
      for (let j = 0; j < actual.fillPaints.length; j++) {
        expect(actual.fillPaints[j].type).toBe(expected.fillPaints[j].type);
        if (actual.fillPaints[j].type === "SOLID") {
          expect(actual.fillPaints[j].color.r).toBeCloseTo(expected.fillPaints[j].color.r, 2);
          expect(actual.fillPaints[j].color.g).toBeCloseTo(expected.fillPaints[j].color.g, 2);
          expect(actual.fillPaints[j].color.b).toBeCloseTo(expected.fillPaints[j].color.b, 2);
          expect(actual.fillPaints[j].opacity).toBeCloseTo(expected.fillPaints[j].opacity, 2);
        }
      }
    }
  });

  it("preserves stroke paints for nodes with borders", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    for (let i = 2; i < message.nodeChanges.length; i++) {
      const actual = message.nodeChanges[i];
      const expected = expectedNodeChanges.nodeChanges[i];
      const actualStrokes = actual.strokePaints || [];
      const expectedStrokes = expected.strokePaints || [];
      expect(actualStrokes.length).toBe(expectedStrokes.length);
      for (let j = 0; j < actualStrokes.length; j++) {
        expect(actualStrokes[j].color.r).toBeCloseTo(expectedStrokes[j].color.r, 2);
        expect(actualStrokes[j].color.g).toBeCloseTo(expectedStrokes[j].color.g, 2);
        expect(actualStrokes[j].color.b).toBeCloseTo(expectedStrokes[j].color.b, 2);
      }
    }
  });

  it("preserves auto-layout properties", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    for (let i = 2; i < message.nodeChanges.length; i++) {
      const actual = message.nodeChanges[i];
      const expected = expectedNodeChanges.nodeChanges[i];
      expect(actual.stackMode).toBe(expected.stackMode);
      if (expected.stackMode && expected.stackMode !== "NONE") {
        expect(actual.stackSpacing).toBe(expected.stackSpacing);
        expect(actual.stackHorizontalPadding).toBe(expected.stackHorizontalPadding);
        expect(actual.stackVerticalPadding).toBe(expected.stackVerticalPadding);
        expect(actual.stackPaddingRight).toBe(expected.stackPaddingRight);
        expect(actual.stackPaddingBottom).toBe(expected.stackPaddingBottom);
        expect(actual.stackPrimarySizing).toBe("FIXED");
        expect(actual.stackCounterSizing).toBe("FIXED");
      }
    }
  });

  it("preserves TEXT node properties", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    const textNodes = message.nodeChanges.filter((nc) => nc.type === "TEXT");
    const expectedTexts = expectedNodeChanges.nodeChanges.filter((nc) => nc.type === "TEXT");
    expect(textNodes.length).toBe(expectedTexts.length);
    for (let i = 0; i < textNodes.length; i++) {
      expect(textNodes[i].textData.characters).toBe(expectedTexts[i].textData.characters);
      expect(textNodes[i].fontSize).toBe(expectedTexts[i].fontSize);
      expect(textNodes[i].fontName.family).toBe(expectedTexts[i].fontName.family);
      expect(textNodes[i].fontName.style).toBe(expectedTexts[i].fontName.style);
    }
  });

  it("preserves corner radius values", () => {
    const html = buildFigmaClipboardHtml(exampleRawNodeTree);
    const { message } = readHTMLMessage(decodeForFigKiwi(html));
    for (let i = 2; i < message.nodeChanges.length; i++) {
      const actual = message.nodeChanges[i];
      const expected = expectedNodeChanges.nodeChanges[i];
      if (expected.cornerRadius) {
        expect(actual.cornerRadius).toBe(expected.cornerRadius);
      }
    }
  });
});

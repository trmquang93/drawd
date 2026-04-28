// @vitest-environment node
//
// Unit tests for compose_* HTML building blocks.
// Validates Satori-safety constraints, composability, and inline:false mode.

import { describe, it, expect, beforeEach } from "vitest";
import {
  composePage,
  composeButton,
  composeListRow,
  composeSectionHeader,
  composeCard,
} from "../blocks.js";
import { clearFragments, expandFragments, getFragment } from "../store.js";

// ── Satori-safety helpers ────────────────────────────────────────────────────

/** Every div with multiple children must have display:flex. */
function assertNoBareFlex(html) {
  // Quick structural check: there should be no container div without display
  // in its style. The blocks always emit display:flex.
  const divStyleRe = /<div\s+style="([^"]*)"/g;
  let match;
  while ((match = divStyleRe.exec(html)) !== null) {
    expect(match[1]).toContain("display:flex");
  }
}

/** No position:absolute anywhere. */
function assertNoAbsolute(html) {
  expect(html).not.toContain("position:absolute");
  expect(html).not.toContain("position: absolute");
}

/** Text leaves have white-space:nowrap. */
function assertTextNowrap(html) {
  // Find divs that contain text (no child tags) — they should have nowrap.
  // This is a heuristic; the blocks put nowrap on every text-bearing div.
  // We verify the blocks follow that convention.
  const textDivRe = /<div style="([^"]*)">[^<]+<\/div>/g;
  let match;
  while ((match = textDivRe.exec(html)) !== null) {
    const style = match[1];
    // Spacer divs (empty) and icon wrappers won't have nowrap — skip those
    if (style.includes("font-size:") || style.includes("font-weight:")) {
      expect(style).toContain("white-space:nowrap");
    }
  }
}

function assertSatoriSafe(html) {
  assertNoBareFlex(html);
  assertNoAbsolute(html);
  assertTextNowrap(html);
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearFragments();
});

describe("compose_page", () => {
  it("wraps children with safe-area spacers", () => {
    const html = composePage({
      safeArea: { top: 59, bottom: 34 },
      children: "<div style=\"display:flex;\">content</div>",
    });
    expect(html).toContain("height:59px");
    expect(html).toContain("height:34px");
    expect(html).toContain("content");
    assertSatoriSafe(html);
  });

  it("uses default safe area when omitted", () => {
    const html = composePage({});
    expect(html).toContain("height:59px");
    expect(html).toContain("height:34px");
  });

  it("applies custom background", () => {
    const html = composePage({ background: "#1a1a1a" });
    expect(html).toContain("background:#1a1a1a");
  });

  it("applies custom tokens", () => {
    const html = composePage({
      tokens: { background: "#000", fontFamily: "Helvetica" },
    });
    expect(html).toContain("background:#000");
    expect(html).toContain("font-family:Helvetica");
  });
});

describe("compose_button", () => {
  it("renders primary variant by default", () => {
    const html = composeButton({ label: "Sign In" });
    expect(html).toContain("Sign In");
    expect(html).toContain("background:#007AFF");
    assertSatoriSafe(html);
  });

  it("renders secondary variant with border", () => {
    const html = composeButton({ label: "Cancel", variant: "secondary" });
    expect(html).toContain("border:2px solid #007AFF");
  });

  it("renders destructive variant", () => {
    const html = composeButton({ label: "Delete", variant: "destructive" });
    expect(html).toContain("background:#FF3B30");
  });

  it("includes leading icon", () => {
    const icon = '<svg width="20" height="20"><circle r="10"/></svg>';
    const html = composeButton({ label: "Add", leadingIcon: icon });
    expect(html).toContain(icon);
    expect(html).toContain("margin-right:8px");
    assertSatoriSafe(html);
  });

  it("includes trailing icon", () => {
    const icon = '<svg width="16" height="16"><rect width="16" height="16"/></svg>';
    const html = composeButton({ label: "Next", trailingIcon: icon });
    expect(html).toContain(icon);
    expect(html).toContain("margin-left:8px");
  });
});

describe("compose_list_row", () => {
  it("renders title with trailing chevron by default", () => {
    const html = composeListRow({ title: "Settings" });
    expect(html).toContain("Settings");
    expect(html).toContain("<svg"); // chevron SVG
    assertSatoriSafe(html);
  });

  it("renders subtitle when provided", () => {
    const html = composeListRow({ title: "Wi-Fi", subtitle: "Connected" });
    expect(html).toContain("Connected");
    expect(html).toContain("font-size:15px");
  });

  it("hides chevron when trailingChevron is false", () => {
    const html = composeListRow({ title: "About", trailingChevron: false });
    expect(html).not.toContain("<svg");
  });

  it("includes leading icon", () => {
    const icon = '<svg width="24" height="24"><rect/></svg>';
    const html = composeListRow({ title: "Profile", leadingIcon: icon });
    expect(html).toContain(icon);
    expect(html).toContain("margin-right:12px");
    assertSatoriSafe(html);
  });
});

describe("compose_section_header", () => {
  it("uppercases the title", () => {
    const html = composeSectionHeader({ title: "General" });
    expect(html).toContain("GENERAL");
    assertSatoriSafe(html);
  });

  it("includes action text when provided", () => {
    const html = composeSectionHeader({ title: "Recents", action: "See All" });
    expect(html).toContain("See All");
    expect(html).toContain("color:#007AFF");
  });
});

describe("compose_card", () => {
  it("renders title, body, and footer sections", () => {
    const html = composeCard({
      title: "Payment",
      body: '<div style="display:flex;">Card ending in 4242</div>',
      footer: '<div style="display:flex;">Update</div>',
    });
    expect(html).toContain("Payment");
    expect(html).toContain("4242");
    expect(html).toContain("Update");
    assertSatoriSafe(html);
  });

  it("renders with only body", () => {
    const html = composeCard({
      body: '<div style="display:flex;">Just body</div>',
    });
    expect(html).toContain("Just body");
    expect(html).not.toContain("font-weight:600"); // no title
  });

  it("applies custom tokens", () => {
    const html = composeCard({
      title: "Custom",
      tokens: { cardBackground: "#1a1a2e", text: "#eee" },
    });
    expect(html).toContain("background:#1a1a2e");
    expect(html).toContain("color:#eee");
  });
});

describe("composability", () => {
  it("nests compose_button inside compose_card inside compose_page", () => {
    const btn = composeButton({ label: "Continue" });
    const card = composeCard({ title: "Welcome", body: btn });
    const page = composePage({
      safeArea: { top: 59, bottom: 34 },
      children: card,
    });

    // All three blocks are present
    expect(page).toContain("Continue");
    expect(page).toContain("Welcome");
    expect(page).toContain("height:59px");

    // Full output is Satori-safe
    assertSatoriSafe(page);
  });

  it("nests section_header + list_rows inside compose_page", () => {
    const header = composeSectionHeader({ title: "Settings" });
    const row1 = composeListRow({ title: "Wi-Fi", subtitle: "Connected" });
    const row2 = composeListRow({ title: "Bluetooth", subtitle: "On" });

    const page = composePage({
      children: header + row1 + row2,
    });

    expect(page).toContain("SETTINGS");
    expect(page).toContain("Wi-Fi");
    expect(page).toContain("Bluetooth");
    assertSatoriSafe(page);
  });
});

describe("inline: false (fragment references)", () => {
  it("returns a reference tag instead of HTML", () => {
    const ref = composeButton({ label: "OK", inline: false });
    expect(ref).toMatch(/^<x-button id="ref_[^"]+"\/>$/);
  });

  it("stores the fragment and can expand it", () => {
    const ref = composeButton({ label: "OK", inline: false });
    const idMatch = ref.match(/id="([^"]+)"/);
    expect(idMatch).toBeTruthy();
    const stored = getFragment(idMatch[1]);
    expect(stored).toContain("OK");
    expect(stored).toContain("background:#007AFF");
  });

  it("expands references in composed HTML", () => {
    const btnRef = composeButton({ label: "Save", inline: false });
    const cardRef = composeCard({
      title: "Form",
      footer: btnRef,
      inline: false,
    });

    const page = composePage({ children: cardRef });
    const expanded = expandFragments(page);

    expect(expanded).toContain("Save");
    expect(expanded).toContain("Form");
    expect(expanded).not.toContain("<x-");
  });

  it("each block type uses its own tag name", () => {
    expect(composePage({ inline: false })).toMatch(/<x-page /);
    expect(composeButton({ label: "X", inline: false })).toMatch(/<x-button /);
    expect(composeListRow({ title: "X", inline: false })).toMatch(/<x-list-row /);
    expect(composeSectionHeader({ title: "X", inline: false })).toMatch(/<x-section-header /);
    expect(composeCard({ inline: false })).toMatch(/<x-card /);
  });
});

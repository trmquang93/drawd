import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { timeAgo, targetLabel } from "./commentUtils.js";

// ── timeAgo ──────────────────────────────────────────────────────────────────

describe("timeAgo", () => {
  const NOW = new Date("2026-01-15T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for a timestamp less than 1 minute ago", () => {
    const ts = new Date(NOW.getTime() - 30_000).toISOString(); // 30s ago
    expect(timeAgo(ts)).toBe("just now");
  });

  it("returns 'Xm ago' for a timestamp 1–59 minutes ago", () => {
    const ts = new Date(NOW.getTime() - 30 * 60_000).toISOString(); // 30m ago
    expect(timeAgo(ts)).toBe("30m ago");
  });

  it("returns 'Xh ago' for a timestamp 1–23 hours ago", () => {
    const ts = new Date(NOW.getTime() - 2 * 60 * 60_000).toISOString(); // 2h ago
    expect(timeAgo(ts)).toBe("2h ago");
  });

  it("returns 'Xd ago' for a timestamp 24+ hours ago", () => {
    const ts = new Date(NOW.getTime() - 3 * 24 * 60 * 60_000).toISOString(); // 3d ago
    expect(timeAgo(ts)).toBe("3d ago");
  });

  it("boundary: exactly 60 minutes returns '1h ago' not '60m ago'", () => {
    const ts = new Date(NOW.getTime() - 60 * 60_000).toISOString();
    expect(timeAgo(ts)).toBe("1h ago");
  });

  it("boundary: exactly 24 hours returns '1d ago' not '24h ago'", () => {
    const ts = new Date(NOW.getTime() - 24 * 60 * 60_000).toISOString();
    expect(timeAgo(ts)).toBe("1d ago");
  });
});

// ── targetLabel ──────────────────────────────────────────────────────────────

describe("targetLabel", () => {
  const screens = [
    { id: "s1", name: "Home", hotspots: [{ id: "h1", label: "Login Button" }] },
    { id: "s2", name: "Profile", hotspots: [{ id: "h2", label: "" }] },
    { id: "s3", name: "", hotspots: [] },
  ];
  const connections = [
    { id: "c1", fromScreenId: "s1", toScreenId: "s2" },
    { id: "c2", fromScreenId: "s2", toScreenId: "s3" },
  ];

  // -- Screen targets --

  it("returns screen name for a matching screen target", () => {
    const comment = { targetType: "screen", targetId: "s1" };
    expect(targetLabel(comment, screens, connections)).toBe("Home");
  });

  it("returns 'Unnamed screen' when screen has no name", () => {
    const comment = { targetType: "screen", targetId: "s3" };
    expect(targetLabel(comment, screens, connections)).toBe("Unnamed screen");
  });

  it("returns 'Deleted screen' when screen is not found", () => {
    const comment = { targetType: "screen", targetId: "s-gone" };
    expect(targetLabel(comment, screens, connections)).toBe("Deleted screen");
  });

  // -- Hotspot targets --

  it("returns 'ScreenName › HotspotLabel' for a matching labeled hotspot", () => {
    const comment = { targetType: "hotspot", targetId: "h1" };
    expect(targetLabel(comment, screens, connections)).toBe("Home › Login Button");
  });

  it("returns 'ScreenName › Hotspot' when hotspot has no label", () => {
    const comment = { targetType: "hotspot", targetId: "h2" };
    expect(targetLabel(comment, screens, connections)).toBe("Profile › Hotspot");
  });

  it("returns 'Deleted hotspot' when hotspot is not found", () => {
    const comment = { targetType: "hotspot", targetId: "h-gone" };
    expect(targetLabel(comment, screens, connections)).toBe("Deleted hotspot");
  });

  // -- Connection targets --

  it("returns 'From → To' for a matching connection", () => {
    const comment = { targetType: "connection", targetId: "c1" };
    expect(targetLabel(comment, screens, connections)).toBe("Home → Profile");
  });

  it("uses '?' for missing screen names in a connection", () => {
    const partial = [{ id: "c3", fromScreenId: "s1", toScreenId: "s-gone" }];
    const comment = { targetType: "connection", targetId: "c3" };
    expect(targetLabel(comment, screens, partial)).toBe("Home → ?");
  });

  it("returns 'Deleted connection' when connection is not found", () => {
    const comment = { targetType: "connection", targetId: "c-gone" };
    expect(targetLabel(comment, screens, connections)).toBe("Deleted connection");
  });

  // -- Unknown type --

  it("returns 'Unknown target' for unrecognized targetType", () => {
    const comment = { targetType: "widget", targetId: "w1" };
    expect(targetLabel(comment, screens, connections)).toBe("Unknown target");
  });
});

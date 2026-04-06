import { describe, it, expect } from "vitest";
import { buildPayload, buildCollabPayload } from "./buildPayload.js";

describe("buildPayload", () => {
  const screens = [{ id: "s1" }, { id: "s2" }];
  const connections = [{ id: "c1" }];
  const documents = [{ id: "d1" }, { id: "d2" }, { id: "d3" }];

  it("sets version to 14", () => {
    const payload = buildPayload([], [], { x: 0, y: 0 }, 1);
    expect(payload.version).toBe(14);
  });

  it("sets metadata.screenCount to screens.length", () => {
    const payload = buildPayload(screens, [], { x: 0, y: 0 }, 1);
    expect(payload.metadata.screenCount).toBe(2);
  });

  it("sets metadata.connectionCount to connections.length", () => {
    const payload = buildPayload([], connections, { x: 0, y: 0 }, 1);
    expect(payload.metadata.connectionCount).toBe(1);
  });

  it("sets metadata.documentCount to documents.length", () => {
    const payload = buildPayload([], [], { x: 0, y: 0 }, 1, documents);
    expect(payload.metadata.documentCount).toBe(3);
  });

  it("passes viewport pan and zoom through", () => {
    const payload = buildPayload([], [], { x: 100, y: -50 }, 1.5);
    expect(payload.viewport).toEqual({ pan: { x: 100, y: -50 }, zoom: 1.5 });
  });

  it("passes screens, connections, and documents arrays through", () => {
    const payload = buildPayload(screens, connections, { x: 0, y: 0 }, 1, documents);
    expect(payload.screens).toBe(screens);
    expect(payload.connections).toBe(connections);
    expect(payload.documents).toBe(documents);
  });

  it("defaults documents to empty array", () => {
    const payload = buildPayload([], [], { x: 0, y: 0 }, 1);
    expect(payload.documents).toEqual([]);
  });

  it("sets metadata.exportedAt to a valid ISO timestamp", () => {
    const before = new Date().toISOString();
    const payload = buildPayload([], [], { x: 0, y: 0 }, 1);
    const after = new Date().toISOString();
    expect(payload.metadata.exportedAt).toBeDefined();
    expect(payload.metadata.exportedAt >= before).toBe(true);
    expect(payload.metadata.exportedAt <= after).toBe(true);
  });

  it("passes comments array through to the payload", () => {
    const comments = [{ id: "c1" }, { id: "c2" }];
    const payload = buildPayload([], [], { x: 0, y: 0 }, 1, [], "", "", {}, [], [], [], comments);
    expect(payload.comments).toBe(comments);
  });

  it("defaults comments to empty array when not provided", () => {
    const payload = buildPayload([], [], { x: 0, y: 0 }, 1);
    expect(payload.comments).toEqual([]);
  });
});

describe("buildCollabPayload", () => {
  it("includes the comments array in the output", () => {
    const comments = [{ id: "c1" }];
    const payload = buildCollabPayload([], [], [], "", "", {}, [], [], [], comments);
    expect(payload.comments).toBe(comments);
  });

  it("defaults comments to empty array when not provided", () => {
    const payload = buildCollabPayload([], []);
    expect(payload.comments).toEqual([]);
  });

  it("includes all expected top-level keys", () => {
    const payload = buildCollabPayload([], []);
    const keys = ["screens", "connections", "documents", "featureBrief", "taskLink", "techStack", "dataModels", "stickyNotes", "screenGroups", "comments"];
    for (const key of keys) {
      expect(payload).toHaveProperty(key);
    }
  });
});

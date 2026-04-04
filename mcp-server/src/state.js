import fs from "node:fs";
import path from "node:path";
import { generateId } from "../../src/utils/generateId.js";
import { importFlow } from "../../src/utils/importFlow.js";
import { buildPayload } from "../../src/utils/buildPayload.js";
import {
  DEFAULT_SCREEN_WIDTH,
  DEFAULT_FLOW_NAME,
  SCREEN_NAME_TEMPLATE,
} from "../../src/constants.js";
import { gridPosition } from "./utils/grid-layout.js";

export class FlowState {
  constructor() {
    this.screens = [];
    this.connections = [];
    this.documents = [];
    this.dataModels = [];
    this.stickyNotes = [];
    this.screenGroups = [];
    this.metadata = {
      name: DEFAULT_FLOW_NAME,
      featureBrief: "",
      taskLink: "",
      techStack: {},
    };
    this.viewport = { pan: { x: 0, y: 0 }, zoom: 1 };
    this.filePath = null;
    this._screenCounter = 1;
  }

  // ── File Operations ─────────────────────────

  load(filePath) {
    const text = fs.readFileSync(filePath, "utf-8");
    const data = importFlow(text);

    this.screens = data.screens;
    this.connections = data.connections;
    this.documents = data.documents || [];
    this.dataModels = data.dataModels || [];
    this.stickyNotes = data.stickyNotes || [];
    this.screenGroups = data.screenGroups || [];
    this.metadata = data.metadata || {};
    this.viewport = data.viewport || { pan: { x: 0, y: 0 }, zoom: 1 };
    this.filePath = filePath;
    this._screenCounter = this.screens.length + 1;
  }

  save(filePath) {
    const target = filePath || this.filePath;
    if (!target) {
      throw new Error("No file path specified. Pass a path or open/create a flow first.");
    }

    const payload = buildPayload(
      this.screens,
      this.connections,
      this.viewport.pan,
      this.viewport.zoom,
      this.documents,
      this.metadata.featureBrief || "",
      this.metadata.taskLink || "",
      this.metadata.techStack || {},
      this.dataModels,
      this.stickyNotes,
      this.screenGroups,
    );

    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(target, JSON.stringify(payload, null, 2), "utf-8");
    this.filePath = target;
  }

  _autoSave() {
    if (!this.filePath) {
      throw new Error(
        "No flow file is open. Call create_flow or open_flow first."
      );
    }
    this.save();
  }

  createNew(filePath, options = {}) {
    this.screens = [];
    this.connections = [];
    this.documents = [];
    this.dataModels = [];
    this.stickyNotes = [];
    this.screenGroups = [];
    this.metadata = {
      name: options.name || DEFAULT_FLOW_NAME,
      featureBrief: options.featureBrief || "",
      taskLink: options.taskLink || "",
      techStack: options.techStack || {},
    };
    this.viewport = { pan: { x: 0, y: 0 }, zoom: 1 };
    this.filePath = filePath;
    this._screenCounter = 1;

    if (filePath) {
      this.save(filePath);
    }
  }

  getSummary() {
    return {
      filePath: this.filePath,
      metadata: this.metadata,
      screenCount: this.screens.length,
      connectionCount: this.connections.length,
      documentCount: this.documents.length,
      dataModelCount: this.dataModels.length,
      stickyNoteCount: this.stickyNotes.length,
      screenGroupCount: this.screenGroups.length,
      screens: this.screens.map((s) => ({
        id: s.id,
        name: s.name,
        x: s.x,
        y: s.y,
        hotspotCount: (s.hotspots || []).length,
        hasImage: !!s.imageData,
        description: s.description || "",
        status: s.status || "new",
      })),
    };
  }

  // ── Screen Operations ───────────────────────

  addScreen(options = {}) {
    const {
      name,
      imageData = null,
      imageWidth,
      imageHeight,
      svgContent = null,
      sourceHtml = null,
      wireframe = null,
      position,
      description = "",
      notes = "",
      tbd = false,
      tbdNote = "",
    } = options;

    const pos = position || gridPosition(this.screens.length);
    const screenName = name || SCREEN_NAME_TEMPLATE(this._screenCounter);
    this._screenCounter++;

    const screen = {
      id: generateId(),
      name: screenName,
      x: pos.x,
      y: pos.y,
      width: DEFAULT_SCREEN_WIDTH,
      imageData,
      imageWidth: imageWidth || null,
      imageHeight: imageHeight || null,
      svgContent,
      sourceHtml,
      wireframe,
      description,
      notes,
      codeRef: "",
      status: "new",
      acceptanceCriteria: [],
      hotspots: [],
      stateGroup: null,
      stateName: "",
      tbd,
      tbdNote,
      roles: [],
      figmaSource: null,
    };

    this.screens.push(screen);
    this._autoSave();
    return screen;
  }

  getScreen(screenId) {
    return this.screens.find((s) => s.id === screenId) || null;
  }

  updateScreen(screenId, updates) {
    const screen = this.getScreen(screenId);
    if (!screen) throw new Error(`Screen not found: ${screenId}`);

    const allowed = [
      "name", "description", "notes", "codeRef", "status",
      "tbd", "tbdNote", "roles", "acceptanceCriteria",
      "imageData", "imageWidth", "imageHeight",
      "svgContent", "sourceHtml", "wireframe",
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        screen[key] = updates[key];
      }
    }
    this._autoSave();
    return screen;
  }

  deleteScreen(screenId) {
    const idx = this.screens.findIndex((s) => s.id === screenId);
    if (idx === -1) throw new Error(`Screen not found: ${screenId}`);

    this.screens.splice(idx, 1);

    const removed = this.connections.filter(
      (c) => c.fromScreenId === screenId || c.toScreenId === screenId
    );
    this.connections = this.connections.filter(
      (c) => c.fromScreenId !== screenId && c.toScreenId !== screenId
    );

    for (const group of this.screenGroups) {
      group.screenIds = group.screenIds.filter((id) => id !== screenId);
    }

    this._autoSave();
    return { removedConnectionCount: removed.length };
  }

  // ── Hotspot Operations ──────────────────────

  addHotspot(screenId, hotspot) {
    const screen = this.getScreen(screenId);
    if (!screen) throw new Error(`Screen not found: ${screenId}`);

    const hs = {
      id: generateId(),
      label: hotspot.label || "",
      elementType: hotspot.elementType || "button",
      interactionType: hotspot.interactionType || "tap",
      x: hotspot.x,
      y: hotspot.y,
      w: hotspot.w,
      h: hotspot.h,
      action: hotspot.action || "navigate",
      targetScreenId: hotspot.targetScreenId || null,
      apiEndpoint: hotspot.apiEndpoint || "",
      apiMethod: hotspot.apiMethod || "",
      requestSchema: hotspot.requestSchema || "",
      responseSchema: hotspot.responseSchema || "",
      customDescription: hotspot.customDescription || "",
      documentId: hotspot.documentId || null,
      conditions: hotspot.conditions || [],
      onSuccessAction: hotspot.onSuccessAction || "",
      onSuccessTargetId: hotspot.onSuccessTargetId || "",
      onSuccessCustomDesc: hotspot.onSuccessCustomDesc || "",
      onErrorAction: hotspot.onErrorAction || "",
      onErrorTargetId: hotspot.onErrorTargetId || "",
      onErrorCustomDesc: hotspot.onErrorCustomDesc || "",
      tbd: hotspot.tbd || false,
      tbdNote: hotspot.tbdNote || "",
      validation: hotspot.validation || null,
      transitionType: hotspot.transitionType || null,
      transitionLabel: hotspot.transitionLabel || "",
      accessibility: hotspot.accessibility || null,
    };

    if (!screen.hotspots) screen.hotspots = [];
    screen.hotspots.push(hs);

    // Auto-create connection for navigate/modal actions
    if ((hs.action === "navigate" || hs.action === "modal") && hs.targetScreenId) {
      this._addHotspotConnection(screenId, hs.targetScreenId, hs.id, hs.action, "default");
    }

    // Auto-create connections for API success/error
    if (hs.action === "api") {
      if (hs.onSuccessTargetId && hs.onSuccessAction) {
        this._addHotspotConnection(screenId, hs.onSuccessTargetId, hs.id, hs.onSuccessAction, "api-success");
      }
      if (hs.onErrorTargetId && hs.onErrorAction) {
        this._addHotspotConnection(screenId, hs.onErrorTargetId, hs.id, hs.onErrorAction, "api-error");
      }
    }

    // Auto-create connections for conditional branches
    if (hs.action === "conditional" && Array.isArray(hs.conditions)) {
      hs.conditions.forEach((cond, i) => {
        if (cond.targetScreenId) {
          this._addHotspotConnection(screenId, cond.targetScreenId, hs.id, "navigate", `condition-${i}`);
        }
      });
    }

    this._autoSave();
    return hs;
  }

  _addHotspotConnection(fromScreenId, toScreenId, hotspotId, action, connectionPath) {
    this.connections.push({
      id: generateId(),
      fromScreenId,
      toScreenId,
      hotspotId,
      label: "",
      action: action || "navigate",
      connectionPath: connectionPath || "default",
      condition: "",
      conditionGroupId: null,
      transitionType: null,
      transitionLabel: "",
    });
  }

  updateHotspot(screenId, hotspotId, updates) {
    const screen = this.getScreen(screenId);
    if (!screen) throw new Error(`Screen not found: ${screenId}`);

    const hs = (screen.hotspots || []).find((h) => h.id === hotspotId);
    if (!hs) throw new Error(`Hotspot not found: ${hotspotId}`);

    const allowed = [
      "label", "elementType", "interactionType", "x", "y", "w", "h",
      "action", "targetScreenId", "apiEndpoint", "apiMethod",
      "requestSchema", "responseSchema", "customDescription", "documentId",
      "conditions", "onSuccessAction", "onSuccessTargetId", "onSuccessCustomDesc",
      "onErrorAction", "onErrorTargetId", "onErrorCustomDesc",
      "tbd", "tbdNote", "validation", "transitionType", "transitionLabel", "accessibility",
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        hs[key] = updates[key];
      }
    }
    this._autoSave();
    return hs;
  }

  deleteHotspot(screenId, hotspotId) {
    const screen = this.getScreen(screenId);
    if (!screen) throw new Error(`Screen not found: ${screenId}`);

    const idx = (screen.hotspots || []).findIndex((h) => h.id === hotspotId);
    if (idx === -1) throw new Error(`Hotspot not found: ${hotspotId}`);

    screen.hotspots.splice(idx, 1);

    // Remove associated connections
    this.connections = this.connections.filter((c) => c.hotspotId !== hotspotId);
    this._autoSave();
  }

  // ── Connection Operations ───────────────────

  addConnection(options) {
    const { fromScreenId, toScreenId, label, action, hotspotId, connectionPath, condition, conditionGroupId, transitionType, transitionLabel, dataFlow } = options;

    if (!this.getScreen(fromScreenId)) throw new Error(`Source screen not found: ${fromScreenId}`);
    if (!this.getScreen(toScreenId)) throw new Error(`Target screen not found: ${toScreenId}`);

    // Prevent duplicate plain connections
    if (!hotspotId) {
      const exists = this.connections.some(
        (c) => c.fromScreenId === fromScreenId && c.toScreenId === toScreenId && !c.hotspotId
      );
      if (exists) throw new Error("A connection between these screens already exists.");
    }

    const conn = {
      id: generateId(),
      fromScreenId,
      toScreenId,
      hotspotId: hotspotId || null,
      label: label || "",
      action: action || "navigate",
      connectionPath: connectionPath || "default",
      condition: condition || "",
      conditionGroupId: conditionGroupId || null,
      transitionType: transitionType || null,
      transitionLabel: transitionLabel || "",
      dataFlow: dataFlow || [],
    };

    this.connections.push(conn);
    this._autoSave();
    return conn;
  }

  updateConnection(connectionId, updates) {
    const conn = this.connections.find((c) => c.id === connectionId);
    if (!conn) throw new Error(`Connection not found: ${connectionId}`);

    const allowed = [
      "label", "action", "fromScreenId", "toScreenId",
      "connectionPath", "condition", "conditionGroupId",
      "transitionType", "transitionLabel", "dataFlow",
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        conn[key] = updates[key];
      }
    }
    this._autoSave();
    return conn;
  }

  deleteConnection(connectionId) {
    const idx = this.connections.findIndex((c) => c.id === connectionId);
    if (idx === -1) throw new Error(`Connection not found: ${connectionId}`);
    this.connections.splice(idx, 1);
    this._autoSave();
  }

  // ── Document Operations ─────────────────────

  addDocument(options) {
    const doc = {
      id: generateId(),
      name: options.name || "Untitled Document",
      content: options.content || "",
      createdAt: new Date().toISOString(),
    };
    this.documents.push(doc);
    this._autoSave();
    return doc;
  }

  updateDocument(documentId, updates) {
    const doc = this.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error(`Document not found: ${documentId}`);
    if (updates.name !== undefined) doc.name = updates.name;
    if (updates.content !== undefined) doc.content = updates.content;
    this._autoSave();
    return doc;
  }

  deleteDocument(documentId) {
    const idx = this.documents.findIndex((d) => d.id === documentId);
    if (idx === -1) throw new Error(`Document not found: ${documentId}`);
    this.documents.splice(idx, 1);
    this._autoSave();
  }

  // ── Data Model Operations ───────────────────

  addDataModel(options) {
    const model = {
      id: generateId(),
      name: options.name || "Untitled Model",
      fields: options.fields || {},
    };
    this.dataModels.push(model);
    this._autoSave();
    return model;
  }

  updateDataModel(modelId, updates) {
    const model = this.dataModels.find((m) => m.id === modelId);
    if (!model) throw new Error(`Data model not found: ${modelId}`);
    if (updates.name !== undefined) model.name = updates.name;
    if (updates.fields !== undefined) model.fields = updates.fields;
    this._autoSave();
    return model;
  }

  deleteDataModel(modelId) {
    const idx = this.dataModels.findIndex((m) => m.id === modelId);
    if (idx === -1) throw new Error(`Data model not found: ${modelId}`);
    this.dataModels.splice(idx, 1);
    this._autoSave();
  }

  // ── Sticky Note Operations ──────────────────

  addStickyNote(options) {
    const note = {
      id: generateId(),
      x: options.x ?? 100,
      y: options.y ?? 100,
      width: options.width ?? 200,
      height: options.height ?? 150,
      content: options.content || "",
      color: options.color || "yellow",
      author: options.author || "",
    };
    this.stickyNotes.push(note);
    this._autoSave();
    return note;
  }

  updateStickyNote(noteId, updates) {
    const note = this.stickyNotes.find((n) => n.id === noteId);
    if (!note) throw new Error(`Sticky note not found: ${noteId}`);
    const allowed = ["content", "color", "x", "y", "width", "height", "author"];
    for (const key of allowed) {
      if (updates[key] !== undefined) note[key] = updates[key];
    }
    this._autoSave();
    return note;
  }

  deleteStickyNote(noteId) {
    const idx = this.stickyNotes.findIndex((n) => n.id === noteId);
    if (idx === -1) throw new Error(`Sticky note not found: ${noteId}`);
    this.stickyNotes.splice(idx, 1);
    this._autoSave();
  }

  // ── Screen Group Operations ─────────────────

  addScreenGroup(options) {
    const group = {
      id: generateId(),
      name: options.name || "Untitled Group",
      screenIds: options.screenIds || [],
      color: options.color || "#61afef",
    };
    this.screenGroups.push(group);
    this._autoSave();
    return group;
  }

  updateScreenGroup(groupId, updates) {
    const group = this.screenGroups.find((g) => g.id === groupId);
    if (!group) throw new Error(`Screen group not found: ${groupId}`);
    if (updates.name !== undefined) group.name = updates.name;
    if (updates.screenIds !== undefined) group.screenIds = updates.screenIds;
    if (updates.color !== undefined) group.color = updates.color;
    this._autoSave();
    return group;
  }

  deleteScreenGroup(groupId) {
    const idx = this.screenGroups.findIndex((g) => g.id === groupId);
    if (idx === -1) throw new Error(`Screen group not found: ${groupId}`);
    this.screenGroups.splice(idx, 1);
    this._autoSave();
  }

  // ── Metadata Operations ─────────────────────

  updateMetadata(updates) {
    if (updates.name !== undefined) this.metadata.name = updates.name;
    if (updates.featureBrief !== undefined) this.metadata.featureBrief = updates.featureBrief;
    if (updates.taskLink !== undefined) this.metadata.taskLink = updates.taskLink;
    if (updates.techStack !== undefined) this.metadata.techStack = updates.techStack;
    this._autoSave();
  }
}

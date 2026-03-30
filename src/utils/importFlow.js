import { generateId } from "./generateId";
import { FILE_VERSION, APP_NAME } from "../constants";

export function importFlow(fileText) {
  let data;
  try {
    data = JSON.parse(fileText);
  } catch {
    throw new Error("Invalid file: not valid JSON.");
  }

  if (typeof data.version !== "number") {
    throw new Error("Invalid file: missing version field.");
  }

  if (data.version > FILE_VERSION) {
    throw new Error(
      `Unsupported file version ${data.version}. Please update ${APP_NAME} to open this file.`
    );
  }

  if (!Array.isArray(data.screens)) {
    throw new Error("Invalid file: screens must be an array.");
  }

  if (!Array.isArray(data.connections)) {
    throw new Error("Invalid file: connections must be an array.");
  }

  // Ensure documents array exists
  if (!Array.isArray(data.documents)) {
    data.documents = [];
  }

  // Backward compat: default stateGroup/stateName for older files
  for (const screen of data.screens) {
    if (screen.stateGroup === undefined) screen.stateGroup = null;
    if (screen.stateName === undefined) screen.stateName = "";
    if (screen.notes === undefined) screen.notes = "";
    if (screen.codeRef === undefined) screen.codeRef = "";
    if (screen.status === undefined) screen.status = "new";
    if (!Array.isArray(screen.acceptanceCriteria)) screen.acceptanceCriteria = [];
    if (screen.tbd === undefined) screen.tbd = false;
    if (screen.tbdNote === undefined) screen.tbdNote = "";
    if (!Array.isArray(screen.roles)) screen.roles = [];
    if (screen.figmaSource === undefined) screen.figmaSource = null;
    if (Array.isArray(screen.hotspots)) {
      for (const hs of screen.hotspots) {
        if (!hs.elementType) hs.elementType = "button";
        if (!hs.interactionType) hs.interactionType = "tap";
        if (hs.tbd === undefined) hs.tbd = false;
        if (hs.tbdNote === undefined) hs.tbdNote = "";
        if (hs.validation === undefined) hs.validation = null;
        if (!hs.apiEndpoint) hs.apiEndpoint = "";
        if (!hs.apiMethod) hs.apiMethod = "";
        if (!hs.requestSchema) hs.requestSchema = "";
        if (!hs.responseSchema) hs.responseSchema = "";
        if (!hs.customDescription) hs.customDescription = "";
        if (!hs.conditions) hs.conditions = [];
        if (!hs.onSuccessAction) hs.onSuccessAction = "";
        if (!hs.onSuccessTargetId) hs.onSuccessTargetId = "";
        if (!hs.onSuccessCustomDesc) hs.onSuccessCustomDesc = "";
        if (!hs.onErrorAction) hs.onErrorAction = "";
        if (!hs.onErrorTargetId) hs.onErrorTargetId = "";
        if (!hs.onErrorCustomDesc) hs.onErrorCustomDesc = "";
        if (!Array.isArray(hs.dataFlow)) hs.dataFlow = [];
        if (!Array.isArray(hs.onSuccessDataFlow)) hs.onSuccessDataFlow = [];
        if (!Array.isArray(hs.onErrorDataFlow)) hs.onErrorDataFlow = [];

        // v4 -> v5 migration: promote inline apiDocs to a document
        if (data.version < 5) {
          if (hs.apiDocs) {
            const docId = generateId();
            const docName = hs.label
              ? `${hs.label} — API Docs`
              : `${hs.apiMethod || "API"} ${hs.apiEndpoint || "Docs"}`;
            data.documents.push({
              id: docId,
              name: docName,
              content: hs.apiDocs,
              createdAt: new Date().toISOString(),
            });
            hs.documentId = docId;
          } else {
            hs.documentId = null;
          }
          delete hs.apiDocs;
        } else {
          if (hs.documentId === undefined) hs.documentId = null;
        }
      }
    }
  }

  // Backward compat: default connectionPath for older files
  for (const conn of data.connections) {
    if (!conn.connectionPath) conn.connectionPath = "default";
    if (conn.condition === undefined) conn.condition = "";
    if (conn.conditionGroupId === undefined) conn.conditionGroupId = null;
    if (conn.transitionType === undefined) conn.transitionType = null;
    if (conn.transitionLabel === undefined) conn.transitionLabel = "";
    if (!Array.isArray(conn.dataFlow)) conn.dataFlow = [];
  }

  // Backward compat: featureBrief
  if (!data.metadata) data.metadata = {};
  if (!data.metadata.featureBrief) data.metadata.featureBrief = "";
  if (!data.metadata.taskLink) data.metadata.taskLink = "";
  if (!data.metadata.techStack) data.metadata.techStack = {};

  // Backward compat: dataModels
  if (!Array.isArray(data.dataModels)) data.dataModels = [];

  // Backward compat: stickyNotes / screenGroups
  if (!Array.isArray(data.stickyNotes)) data.stickyNotes = [];
  if (!Array.isArray(data.screenGroups)) data.screenGroups = [];

  return data;
}

import { buildPayload } from "./buildPayload";
import { FILE_EXTENSION, DEFAULT_EXPORT_FILENAME } from "../constants";

export function exportFlow(screens, connections, pan, zoom, documents = [], featureBrief = "", taskLink = "", techStack = {}, dataModels = [], stickyNotes = [], screenGroups = []) {
  const payload = buildPayload(screens, connections, pan, zoom, documents, featureBrief, taskLink, techStack, dataModels, stickyNotes, screenGroups);

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const timestamp = Date.now();
  const a = document.createElement("a");
  a.href = url;
  a.download = `${DEFAULT_EXPORT_FILENAME}-${timestamp}${FILE_EXTENSION}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

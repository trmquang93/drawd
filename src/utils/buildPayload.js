import { FILE_VERSION, DEFAULT_FLOW_NAME } from "../constants";

export function buildPayload(screens, connections, pan, zoom, documents = [], featureBrief = "", taskLink = "", techStack = {}, dataModels = [], stickyNotes = [], screenGroups = [], comments = []) {
  return {
    version: FILE_VERSION,
    metadata: {
      name: DEFAULT_FLOW_NAME,
      exportedAt: new Date().toISOString(),
      screenCount: screens.length,
      connectionCount: connections.length,
      documentCount: documents.length,
      featureBrief,
      taskLink,
      techStack,
    },
    viewport: { pan: { x: pan.x, y: pan.y }, zoom },
    screens,
    connections,
    documents,
    dataModels,
    stickyNotes,
    screenGroups,
    comments,
  };
}

export function buildCollabPayload(screens, connections, documents = [], featureBrief = "", taskLink = "", techStack = {}, dataModels = [], stickyNotes = [], screenGroups = [], comments = []) {
  return {
    screens,
    connections,
    documents,
    featureBrief,
    taskLink,
    techStack,
    dataModels,
    stickyNotes,
    screenGroups,
    comments,
  };
}

export function buildPayload(screens, connections, pan, zoom, documents = [], featureBrief = "", taskLink = "", techStack = {}, dataModels = []) {
  return {
    version: 8,
    metadata: {
      name: "Untitled Flow",
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
  };
}

export function buildPayload(screens, connections, pan, zoom, documents = []) {
  return {
    version: 6,
    metadata: {
      name: "Untitled Flow",
      exportedAt: new Date().toISOString(),
      screenCount: screens.length,
      connectionCount: connections.length,
      documentCount: documents.length,
    },
    viewport: { pan: { x: pan.x, y: pan.y }, zoom },
    screens,
    connections,
    documents,
  };
}

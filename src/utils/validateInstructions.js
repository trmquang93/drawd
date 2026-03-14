/**
 * Pre-generation validation pass. Returns an array of issues found in the
 * screens/connections/documents data before instructions are generated.
 *
 * @param {Array} screens
 * @param {Array} connections
 * @param {Object} options - { documents: [] }
 * @returns {Array<{ level: "error"|"warning", code: string, message: string, entityId?: string }>}
 */
export function validateInstructions(screens, connections, options = {}) {
  const documents = options.documents || [];
  const screenIds = new Set(screens.map((s) => s.id));
  const docIds = new Set(documents.map((d) => d.id));
  const issues = [];

  for (const screen of screens) {
    if (!screen.imageData && !screen.description) {
      issues.push({
        level: "warning",
        code: "SCREEN_EMPTY",
        message: `Screen "${screen.name}" has no image and no description`,
        entityId: screen.id,
      });
    }

    for (const h of screen.hotspots || []) {
      if (h.targetScreenId && !screenIds.has(h.targetScreenId)) {
        issues.push({
          level: "error",
          code: "BROKEN_HOTSPOT_TARGET",
          message: `Hotspot "${h.label || "Unnamed"}" on "${screen.name}" targets a missing screen`,
          entityId: h.id,
        });
      }

      if (h.documentId && !docIds.has(h.documentId)) {
        issues.push({
          level: "warning",
          code: "BROKEN_DOC_REF",
          message: `Hotspot "${h.label || "Unnamed"}" on "${screen.name}" references a missing document`,
          entityId: h.id,
        });
      }

      if (h.action === "api" && !h.apiEndpoint) {
        issues.push({
          level: "warning",
          code: "API_NO_ENDPOINT",
          message: `API hotspot "${h.label || "Unnamed"}" on "${screen.name}" has no endpoint defined`,
          entityId: h.id,
        });
      }
    }
  }

  for (const conn of connections) {
    if (!screenIds.has(conn.fromScreenId) || !screenIds.has(conn.toScreenId)) {
      issues.push({
        level: "error",
        code: "BROKEN_CONNECTION",
        message: `Connection references a missing screen (from: ${conn.fromScreenId}, to: ${conn.toScreenId})`,
        entityId: conn.id,
      });
    }
  }

  return issues;
}

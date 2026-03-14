// Stable human-readable requirement IDs derived from entity id fields.
// These IDs are used in generated markdown files so the AI consumer can
// cross-reference entities across files without relying on sequential numbers.

export function screenReqId(screen) {
  return `SCR-${screen.id.slice(0, 8)}`;
}

export function hotspotReqId(screen, hotspot) {
  return `HSP-${screen.id.slice(0, 8)}-${hotspot.id.slice(0, 4)}`;
}

export function connectionReqId(conn) {
  return `NAV-${conn.id.slice(0, 4)}`;
}

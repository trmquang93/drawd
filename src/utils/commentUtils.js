export function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function targetLabel(comment, screens, connections) {
  if (comment.targetType === "screen") {
    const s = screens.find((sc) => sc.id === comment.targetId);
    return s ? s.name || "Unnamed screen" : "Deleted screen";
  }
  if (comment.targetType === "hotspot") {
    for (const s of screens) {
      const hs = (s.hotspots || []).find((h) => h.id === comment.targetId);
      if (hs) return `${s.name || "Screen"} › ${hs.label || "Hotspot"}`;
    }
    return "Deleted hotspot";
  }
  if (comment.targetType === "connection") {
    const conn = connections.find((c) => c.id === comment.targetId);
    if (conn) {
      const from = screens.find((s) => s.id === conn.fromScreenId);
      const to = screens.find((s) => s.id === conn.toScreenId);
      return `${from?.name || "?"} → ${to?.name || "?"}`;
    }
    return "Deleted connection";
  }
  return "Unknown target";
}

/**
 * Analyzes the navigation graph of screens and connections to detect
 * structural patterns like entry points, tab bars, modals, and back loops.
 *
 * @param {Array} screens - Array of screen objects
 * @param {Array} connections - Array of connection objects
 * @returns {Object} Navigation graph analysis result
 */
export function analyzeNavGraph(screens, connections) {
  const screenMap = new Map(screens.map(s => [s.id, s]));

  const entryScreens = findEntryScreens(screens, connections, screenMap);
  const tabBarPatterns = findTabBarPatterns(screens, connections, screenMap);
  const modalScreens = findModalScreens(connections, screenMap);
  const backLoops = findBackLoops(connections, screenMap);
  const navigationSummary = buildSummary(entryScreens, tabBarPatterns, modalScreens, backLoops);

  return { entryScreens, tabBarPatterns, modalScreens, backLoops, navigationSummary };
}

function findEntryScreens(screens, connections, _screenMap) {
  const incomingTargets = new Set();
  for (const conn of connections) {
    if (conn.action === 'navigate' || conn.action === 'modal') {
      incomingTargets.add(conn.toScreenId);
    }
  }

  const entries = screens
    .filter(s => !incomingTargets.has(s.id))
    .map(s => ({ id: s.id, name: s.name }));

  if (entries.length > 0) return entries;

  // Fallback: leftmost screen
  if (screens.length === 0) return [];
  const leftmost = screens.reduce((min, s) => (s.x < min.x ? s : min), screens[0]);
  return [{ id: leftmost.id, name: leftmost.name }];
}

function findTabBarPatterns(screens, connections, screenMap) {
  // Group outgoing navigate connections by source screen
  const outgoing = new Map();
  for (const conn of connections) {
    if (conn.action !== 'navigate') continue;
    if (!outgoing.has(conn.fromScreenId)) {
      outgoing.set(conn.fromScreenId, []);
    }
    outgoing.set(conn.fromScreenId, [...outgoing.get(conn.fromScreenId), conn]);
  }

  const patterns = [];

  for (const [hubId, conns] of outgoing) {
    if (conns.length < 3 || conns.length > 5) continue;

    const hub = screenMap.get(hubId);
    if (!hub) continue;

    const targetScreens = conns
      .map(c => screenMap.get(c.toScreenId))
      .filter(Boolean);

    if (targetScreens.length < 3) continue;

    // Check if target screens are at similar Y positions
    const yValues = targetScreens.map(s => s.y);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    if (maxY - minY <= 100) {
      patterns.push({
        hubScreenId: hubId,
        hubScreenName: hub.name,
        tabs: targetScreens.map(s => ({ id: s.id, name: s.name })),
      });
    }
  }

  // Sort so the hub with the most tabs comes first
  patterns.sort((a, b) => b.tabs.length - a.tabs.length);

  return patterns;
}

function findModalScreens(connections, screenMap) {
  const modals = [];
  const seen = new Set();

  for (const conn of connections) {
    if (conn.action !== 'modal') continue;
    const target = screenMap.get(conn.toScreenId);
    const source = screenMap.get(conn.fromScreenId);
    if (!target || !source) continue;
    if (seen.has(target.id)) continue;
    seen.add(target.id);

    modals.push({
      id: target.id,
      name: target.name,
      presentedFrom: { id: source.id, name: source.name },
    });
  }

  return modals;
}

function findBackLoops(connections, screenMap) {
  return connections
    .filter(c => c.action === 'back')
    .map(c => {
      const from = screenMap.get(c.fromScreenId);
      const to = screenMap.get(c.toScreenId);
      if (!from || !to) return null;
      return {
        from: { id: from.id, name: from.name },
        to: { id: to.id, name: to.name },
      };
    })
    .filter(Boolean);
}

function buildSummary(entryScreens, tabBarPatterns, modalScreens, backLoops) {
  const parts = [];

  // Entry points
  if (entryScreens.length === 1) {
    parts.push(`Entry point: ${entryScreens[0].name}.`);
  } else if (entryScreens.length > 1) {
    const names = entryScreens.map(s => s.name).join(', ');
    parts.push(`Entry points: ${names}.`);
  }

  // Navigation style
  if (tabBarPatterns.length > 0) {
    for (const pattern of tabBarPatterns) {
      const tabNames = pattern.tabs.map(t => t.name).join(', ');
      parts.push(
        `${pattern.hubScreenName} acts as a tab bar hub with ${pattern.tabs.length} tabs (${tabNames}).`
      );
    }
  } else {
    parts.push('Main flow uses stack navigation.');
  }

  // Modals
  if (modalScreens.length === 1) {
    const m = modalScreens[0];
    parts.push(`${m.name} is presented as a modal from ${m.presentedFrom.name}.`);
  } else if (modalScreens.length > 1) {
    const descriptions = modalScreens
      .map(m => `${m.name} from ${m.presentedFrom.name}`)
      .join(', ');
    parts.push(`Modal screens: ${descriptions}.`);
  }

  // Back loops
  if (backLoops.length > 0) {
    const descriptions = backLoops
      .map(b => `${b.from.name} back to ${b.to.name}`)
      .join(', ');
    parts.push(`Back navigation: ${descriptions}.`);
  }

  return parts.join(' ');
}

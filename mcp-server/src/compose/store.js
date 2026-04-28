// Server-side fragment store for `inline: false` compose blocks.
//
// When a compose_* tool is called with `inline: false`, the HTML fragment is
// stored here under a unique id, and the tool returns a lightweight reference
// tag like `<x-block id="ref_abc123"/>`. The renderer expands these references
// at draw time by replacing each tag with the stored fragment.
//
// Singleton — both compose-tools and the renderer import the same instance.

let _counter = 0;

/** @type {Map<string, string>} */
const _fragments = new Map();

export function storeFragment(html) {
  const id = `ref_${Date.now().toString(36)}_${(++_counter).toString(36)}`;
  _fragments.set(id, html);
  return id;
}

export function getFragment(id) {
  return _fragments.get(id) ?? null;
}

export function hasFragments() {
  return _fragments.size > 0;
}

/** Clear all stored fragments. Mostly for tests. */
export function clearFragments() {
  _fragments.clear();
  _counter = 0;
}

/**
 * Expand all `<x-block id="..."/>` references in an HTML string.
 * Recursively expands in case a stored fragment itself contains references.
 * Throws if a referenced id is not found in the store.
 */
const REF_RE = /<x-\w+\s+id="([^"]+)"\s*\/?>/g;

export function expandFragments(html) {
  if (typeof html !== "string") return html;

  let result = html;
  let depth = 0;
  const MAX_DEPTH = 10;

  while (REF_RE.test(result)) {
    if (++depth > MAX_DEPTH) {
      throw new Error("Fragment expansion exceeded max depth — possible circular reference");
    }
    REF_RE.lastIndex = 0;
    result = result.replace(REF_RE, (_match, id) => {
      const fragment = _fragments.get(id);
      if (!fragment) {
        throw new Error(`Unknown fragment reference: "${id}". Was it created with inline:false?`);
      }
      return fragment;
    });
  }
  return result;
}

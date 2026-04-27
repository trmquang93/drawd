/**
 * Canonical predicate for "is this connection part of a conditional branch group?"
 *
 * A connection has historically carried two redundant indicators of "conditional":
 *   - `connectionPath` starting with "condition-" (used by the renderer for color)
 *   - `conditionGroupId` (used by the modal and double-click handler to gather siblings)
 *
 * `conditionGroupId` is canonical because only it identifies which other connections
 * belong to the same branch group. `importFlow.js` backfills both fields so the two
 * agree on every connection coming out of the loader; this helper centralizes the
 * predicate so call sites can't drift again.
 */
export const isConditionalConnection = (conn) => !!conn?.conditionGroupId;

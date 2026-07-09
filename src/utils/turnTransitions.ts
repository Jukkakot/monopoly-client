/**
 * True when the active player just changed TO me from someone else — i.e. my turn is
 * beginning. Used to fire the "your turn" screen glow.
 *
 * Returns false when `prevActive` is null (first snapshot / reconnect) so we don't glow
 * on load, and false when the active player was already me (mid-turn snapshot updates).
 */
export function didMyTurnStart(
  prevActive: string | null | undefined,
  nextActive: string | null | undefined,
  myId: string | null | undefined,
): boolean {
  if (!myId || !nextActive) return false
  if (!prevActive) return false
  return prevActive !== myId && nextActive === myId
}

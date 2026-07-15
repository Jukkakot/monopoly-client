/**
 * Allowed number of bot opponents by lobby mode. Playing (you take a seat) allows 0–5 bots
 * (≤6 players total); spectating (bots only) needs at least 2 and allows up to 6.
 */
export function botCountRange(isPlaying: boolean): { min: number; max: number } {
  return isPlaying ? { min: 0, max: 5 } : { min: 2, max: 6 }
}

/** Clamps a bot count into the range for the given mode. Used when switching modes so a count
 *  chosen for spectating (up to 6) can't survive into playing (max 5) and create an over-capacity
 *  game. Pure → unit tested. */
export function clampBotCount(isPlaying: boolean, count: number): number {
  const { min, max } = botCountRange(isPlaying)
  return Math.max(min, Math.min(max, count))
}

/** The single highest net-worth value any player reached during the game. */
export interface RichestMoment {
  playerId: string
  value: number
}

/**
 * Finds the peak net worth across every player's sampled history — the game's
 * "richest moment". Returns null when there is no history yet. Pure, so it is unit
 * tested directly.
 */
export function richestMoment(history: Map<string, number[]>): RichestMoment | null {
  let best: RichestMoment | null = null
  for (const [playerId, values] of history) {
    for (const value of values) {
      if (best === null || value > best.value) best = { playerId, value }
    }
  }
  return best
}

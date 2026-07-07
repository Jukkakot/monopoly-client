import type { PlayerSnapshot, SessionState } from '../types/api'

/**
 * The game's winner is whoever the backend declared in `winnerPlayerId` — never
 * re-derived on the client. It is null when the host aborted the game (an aborted game
 * has no winner), so callers must not crown the net-worth leader in that case. Returns
 * the winning player, or null when there is no declared winner.
 */
export function resolveDeclaredWinner(state: Pick<SessionState, 'winnerPlayerId' | 'players'>): PlayerSnapshot | null {
  if (!state.winnerPlayerId) return null
  return state.players.find(p => p.playerId === state.winnerPlayerId) ?? null
}

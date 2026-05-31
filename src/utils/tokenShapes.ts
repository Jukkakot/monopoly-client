export type TokenShape =
  | 'circle' | 'star' | 'square' | 'triangle'
  | 'diamond' | 'hexagon'

export const ALL_SHAPES: { key: TokenShape; label: string }[] = [
  { key: 'circle',   label: '●' },
  { key: 'square',   label: '■' },
  { key: 'diamond',  label: '◆' },
  { key: 'triangle', label: '▲' },
  { key: 'star',     label: '★' },
  { key: 'hexagon',  label: '⬡' },
]

// Keep for backward compat with any imports
export const GEOMETRIC_SHAPES = ALL_SHAPES
export const EMOJI_SHAPES: { key: TokenShape; label: string }[] = []
export const EMOJI_CHAR: Partial<Record<TokenShape, string>> = {}

const LS_KEY = (sessionId: string) => `token-shapes-${sessionId}`
const OVERRIDE_KEY = (sessionId: string, playerId: string) => `token-shape-${sessionId}-${playerId}`

export function saveTokenShapes(sessionId: string, shapes: TokenShape[]) {
  try { localStorage.setItem(LS_KEY(sessionId), JSON.stringify(shapes)) } catch { /* ignore */ }
}

/** Save a single player's chosen shape (used when joining an existing lobby). */
export function savePlayerTokenShape(sessionId: string, playerId: string, shape: TokenShape) {
  try { localStorage.setItem(OVERRIDE_KEY(sessionId, playerId), shape) } catch { /* ignore */ }
}

export function loadTokenShapes(sessionId: string, seats?: { playerId: string; seatIndex: number }[]): TokenShape[] {
  try {
    const raw = localStorage.getItem(LS_KEY(sessionId))
    const base: TokenShape[] = raw ? JSON.parse(raw) : []
    // Apply per-player overrides (from joinLobby)
    if (seats) {
      const result = [...base]
      for (const seat of seats) {
        const override = localStorage.getItem(OVERRIDE_KEY(sessionId, seat.playerId))
        if (override) result[seat.seatIndex] = override as TokenShape
      }
      return result
    }
    return base
  } catch { return [] }
}

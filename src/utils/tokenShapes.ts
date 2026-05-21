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

export function saveTokenShapes(sessionId: string, shapes: TokenShape[]) {
  try { localStorage.setItem(LS_KEY(sessionId), JSON.stringify(shapes)) } catch { /* ignore */ }
}

export function loadTokenShapes(sessionId: string): TokenShape[] {
  try {
    const raw = localStorage.getItem(LS_KEY(sessionId))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

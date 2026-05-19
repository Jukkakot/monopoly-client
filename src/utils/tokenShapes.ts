export type TokenShape =
  | 'circle' | 'star' | 'square' | 'triangle'
  | 'hat' | 'car' | 'dog' | 'anchor' | 'shoe' | 'guitar'

export const GEOMETRIC_SHAPES: { key: TokenShape; label: string }[] = [
  { key: 'circle',   label: '●' },
  { key: 'star',     label: '★' },
  { key: 'square',   label: '■' },
  { key: 'triangle', label: '▲' },
]

export const EMOJI_SHAPES: { key: TokenShape; label: string }[] = [
  { key: 'hat',    label: '🎩' },
  { key: 'car',    label: '🚗' },
  { key: 'dog',    label: '🐕' },
  { key: 'anchor', label: '⚓' },
  { key: 'shoe',   label: '👞' },
  { key: 'guitar', label: '🎸' },
]

export const EMOJI_CHAR: Partial<Record<TokenShape, string>> = {
  hat: '🎩', car: '🚗', dog: '🐕', anchor: '⚓', shoe: '👞', guitar: '🎸',
}

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

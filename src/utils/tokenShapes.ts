export type TokenShape =
  | 'hat' | 'car' | 'dog' | 'shoe' | 'guitar'
  | 'tram' | 'reindeer' | 'bear' | 'bicycle' | 'coffee'
  | 'crown' | 'rocket' | 'boat' | 'cat' | 'mushroom'

export const ALL_SHAPES: { key: TokenShape; label: string }[] = [
  { key: 'hat',      label: '🎩' },
  { key: 'car',      label: '🚗' },
  { key: 'dog',      label: '🐕' },
  { key: 'shoe',     label: '👟' },
  { key: 'guitar',   label: '🎸' },
  { key: 'tram',     label: '🚊' },
  { key: 'reindeer', label: '🦌' },
  { key: 'bear',     label: '🐻' },
  { key: 'bicycle',  label: '🚲' },
  { key: 'coffee',   label: '☕' },
  { key: 'crown',    label: '👑' },
  { key: 'rocket',   label: '🚀' },
  { key: 'boat',     label: '⛵' },
  { key: 'cat',      label: '🐱' },
  { key: 'mushroom', label: '🍄' },
]

export const EMOJI_CHAR: Record<TokenShape, string> = {
  hat: '🎩', car: '🚗', dog: '🐕', shoe: '👟', guitar: '🎸',
  tram: '🚊', reindeer: '🦌', bear: '🐻', bicycle: '🚲', coffee: '☕',
  crown: '👑', rocket: '🚀', boat: '⛵', cat: '🐱', mushroom: '🍄',
}

// Keep these for backward compat with LobbyScreen import
export const GEOMETRIC_SHAPES: { key: TokenShape; label: string }[] = []
export const EMOJI_SHAPES = ALL_SHAPES

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

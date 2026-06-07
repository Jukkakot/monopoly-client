import { useMemo } from 'react'
import type { SessionState } from '../types/api'

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

export function useTokenShapes(state: SessionState | null): Map<string, TokenShape> {
  return useMemo(() => {
    if (!state) return new Map()
    const map = new Map<string, TokenShape>()
    const saved = loadTokenShapes(state.sessionId, state.seats.map(s => ({ playerId: s.playerId, seatIndex: s.seatIndex })))
    const usedShapes = new Set<TokenShape>()
    // First pass: assign saved shapes (only if not already taken by an earlier seat)
    for (const seat of state.seats) {
      const shape = saved[seat.seatIndex]
      if (shape && !usedShapes.has(shape)) {
        map.set(seat.playerId, shape)
        usedShapes.add(shape)
      }
    }
    // Second pass: give any unassigned player a distinct shape from the pool
    const pool = ALL_SHAPES.map(s => s.key)
    let poolIdx = 0
    for (const seat of state.seats) {
      if (!map.has(seat.playerId)) {
        while (poolIdx < pool.length && usedShapes.has(pool[poolIdx])) poolIdx++
        const assigned = poolIdx < pool.length ? pool[poolIdx++] : pool[seat.seatIndex % pool.length]
        map.set(seat.playerId, assigned)
        usedShapes.add(assigned)
      }
    }
    return map
  }, [state?.sessionId, state?.seats]) // eslint-disable-line react-hooks/exhaustive-deps
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

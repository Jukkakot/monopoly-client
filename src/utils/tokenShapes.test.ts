import { describe, it, expect, beforeEach } from 'vitest'
import { resolveTokenShapes, saveTokenShapes, savePlayerTokenShape, ALL_SHAPES } from './tokenShapes'

// The unit project runs in node with no DOM — provide a minimal localStorage.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size },
  } as Storage
}

const seats = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ playerId: `p${i}`, seatIndex: i }))

beforeEach(() => {
  localStorage.clear()
})

describe('resolveTokenShapes', () => {
  it('assigns a distinct shape to every player when nothing is saved', () => {
    // The bug this guards: without saved shapes, players must NOT all collapse to
    // "circle" — every view (board, sidebar, log) reads from this resolver and
    // must agree, so each player needs a stable distinct shape.
    const map = resolveTokenShapes('sess', seats(4))
    const shapes = seats(4).map(s => map.get(s.playerId))
    expect(shapes).toHaveLength(4)
    expect(shapes.every(Boolean)).toBe(true)
    expect(new Set(shapes).size).toBe(4) // all distinct
    // Deterministic pool order for the unsaved case.
    expect(shapes).toEqual(['circle', 'square', 'diamond', 'triangle'])
  })

  it('is deterministic across repeated calls (board and sidebar must match)', () => {
    const a = resolveTokenShapes('sess', seats(4))
    const b = resolveTokenShapes('sess', seats(4))
    for (const s of seats(4)) expect(a.get(s.playerId)).toBe(b.get(s.playerId))
  })

  it('honours saved shapes and still fills the rest distinctly', () => {
    saveTokenShapes('sess', ['star', 'hexagon'])
    const map = resolveTokenShapes('sess', seats(4))
    expect(map.get('p0')).toBe('star')
    expect(map.get('p1')).toBe('hexagon')
    // Remaining two get distinct shapes not already used.
    const rest = [map.get('p2'), map.get('p3')]
    expect(new Set([...rest, 'star', 'hexagon']).size).toBe(4)
  })

  it('dedups when two saved shapes collide', () => {
    savePlayerTokenShape('sess', 'p0', 'circle')
    savePlayerTokenShape('sess', 'p1', 'circle')
    const map = resolveTokenShapes('sess', seats(2))
    expect(map.get('p0')).toBe('circle')
    expect(map.get('p1')).not.toBe('circle') // second circle reassigned
    expect(map.get('p1')).toBeTruthy()
  })

  it('never assigns a shape outside the known pool', () => {
    const keys = new Set(ALL_SHAPES.map(s => s.key))
    const map = resolveTokenShapes('sess', seats(6))
    for (const s of seats(6)) expect(keys.has(map.get(s.playerId)!)).toBe(true)
  })
})

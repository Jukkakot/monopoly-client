import { describe, it, expect } from 'vitest'
import { richestMoment } from './recapStats'

describe('richestMoment', () => {
  it('returns the highest single value and who reached it', () => {
    const h = new Map<string, number[]>([
      ['a', [100, 250, 200]],
      ['b', [150, 300, 120]],
    ])
    expect(richestMoment(h)).toEqual({ playerId: 'b', value: 300 })
  })

  it('handles a single player', () => {
    expect(richestMoment(new Map([['a', [10, 40, 30]]]))).toEqual({ playerId: 'a', value: 40 })
  })

  it('returns null for empty history', () => {
    expect(richestMoment(new Map())).toBeNull()
    expect(richestMoment(new Map([['a', []]]))).toBeNull()
  })

  it('keeps the first player on ties (does not overwrite on equal value)', () => {
    const h = new Map<string, number[]>([
      ['a', [500]],
      ['b', [500]],
    ])
    expect(richestMoment(h)).toEqual({ playerId: 'a', value: 500 })
  })
})

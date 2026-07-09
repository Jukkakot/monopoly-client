import { describe, it, expect } from 'vitest'
import { didMyTurnStart } from './turnTransitions'

describe('didMyTurnStart', () => {
  it('fires when active changes from another player to me', () => {
    expect(didMyTurnStart('p2', 'me', 'me')).toBe(true)
  })

  it('does not fire on the first snapshot (no previous active)', () => {
    expect(didMyTurnStart(null, 'me', 'me')).toBe(false)
    expect(didMyTurnStart(undefined, 'me', 'me')).toBe(false)
  })

  it('does not fire when it was already my turn', () => {
    expect(didMyTurnStart('me', 'me', 'me')).toBe(false)
  })

  it('does not fire when the turn passes to someone else', () => {
    expect(didMyTurnStart('me', 'p2', 'me')).toBe(false)
  })

  it('returns false for spectators (no myId)', () => {
    expect(didMyTurnStart('p1', 'p2', null)).toBe(false)
  })
})

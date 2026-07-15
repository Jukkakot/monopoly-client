import { describe, it, expect } from 'vitest'
import { botCountRange, clampBotCount } from './lobby'

describe('lobby bot-count range', () => {
  it('playing allows 0–5, spectating 2–6', () => {
    expect(botCountRange(true)).toEqual({ min: 0, max: 5 })
    expect(botCountRange(false)).toEqual({ min: 2, max: 6 })
  })

  it('clamps a spectating count (6) down when switching to playing (max 5)', () => {
    expect(clampBotCount(true, 6)).toBe(5)
  })

  it('raises a count below the spectating minimum up to 2', () => {
    expect(clampBotCount(false, 0)).toBe(2)
  })

  it('leaves an in-range count untouched', () => {
    expect(clampBotCount(true, 3)).toBe(3)
    expect(clampBotCount(false, 4)).toBe(4)
  })
})

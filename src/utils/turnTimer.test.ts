import { describe, it, expect } from 'vitest'
import { turnUrgency, formatTurnDuration } from './turnTimer'

describe('turnUrgency', () => {
  it('hides fast turns under 3 s', () => {
    expect(turnUrgency(0)).toBe('hidden')
    expect(turnUrgency(2.9)).toBe('hidden')
  })
  it('is normal from 3 s up to 20 s', () => {
    expect(turnUrgency(3)).toBe('normal')
    expect(turnUrgency(19)).toBe('normal')
  })
  it('is slow from 20 s up to 45 s', () => {
    expect(turnUrgency(20)).toBe('slow')
    expect(turnUrgency(44)).toBe('slow')
  })
  it('is idle from 45 s onward', () => {
    expect(turnUrgency(45)).toBe('idle')
    expect(turnUrgency(600)).toBe('idle')
  })
})

describe('formatTurnDuration', () => {
  it('formats seconds as M:SS with zero padding', () => {
    expect(formatTurnDuration(0)).toBe('0:00')
    expect(formatTurnDuration(5)).toBe('0:05')
    expect(formatTurnDuration(65)).toBe('1:05')
    expect(formatTurnDuration(600)).toBe('10:00')
  })
  it('floors fractional seconds and clamps negatives to 0:00', () => {
    expect(formatTurnDuration(9.9)).toBe('0:09')
    expect(formatTurnDuration(-3)).toBe('0:00')
  })
})

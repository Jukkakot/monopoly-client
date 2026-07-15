import { describe, it, expect } from 'vitest'
import { isValidBid } from './auction'

describe('isValidBid', () => {
  it('accepts a bid at or above the minimum and within cash', () => {
    expect(isValidBid(60, 60, 100)).toBe(true)
    expect(isValidBid(80, 60, 100)).toBe(true)
    expect(isValidBid(100, 60, 100)).toBe(true)
  })

  it('rejects a bid below the minimum next bid', () => {
    // The bug: a quick "+10" (currentBid 50 → 60) when the backend requires minBid 70.
    expect(isValidBid(60, 70, 500)).toBe(false)
  })

  it('rejects a bid above the bidder cash', () => {
    expect(isValidBid(150, 60, 100)).toBe(false)
  })

  it('rejects a non-numeric bid (empty custom input)', () => {
    expect(isValidBid(NaN, 60, 100)).toBe(false)
  })
})

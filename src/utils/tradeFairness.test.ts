import { describe, it, expect } from 'vitest'
import { tradeVerdict } from './tradeFairness'

describe('tradeVerdict', () => {
  it('treats an empty trade (both zero) as fair', () => {
    expect(tradeVerdict(0, 0)).toBe('fair')
  })

  it('treats an exactly even trade as fair', () => {
    expect(tradeVerdict(200, 200)).toBe('fair')
  })

  it('treats a small (<12%) imbalance as fair', () => {
    // 210 vs 200 → 10/210 ≈ 4.8% < 12%
    expect(tradeVerdict(200, 210)).toBe('fair')
    expect(tradeVerdict(210, 200)).toBe('fair')
  })

  it('flags a lopsided trade in your favour when you get more', () => {
    // give 100, get 200 → 100/200 = 50% > 12%
    expect(tradeVerdict(100, 200)).toBe('favorsYou')
  })

  it('flags a lopsided trade against you when you give more', () => {
    expect(tradeVerdict(200, 100)).toBe('favorsThem')
  })

  it('handles a one-sided gift (you give nothing)', () => {
    expect(tradeVerdict(0, 150)).toBe('favorsYou')
  })

  it('handles a one-sided gift (you get nothing)', () => {
    expect(tradeVerdict(150, 0)).toBe('favorsThem')
  })

  it('uses the larger side as the denominator (boundary just under 12%)', () => {
    // 100 vs 112 → 12/112 ≈ 10.7% < 12% → fair
    expect(tradeVerdict(100, 112)).toBe('fair')
    // 100 vs 114 → 14/114 ≈ 12.3% ≥ 12% → favorsYou
    expect(tradeVerdict(100, 114)).toBe('favorsYou')
  })
})

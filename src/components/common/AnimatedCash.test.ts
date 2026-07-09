import { describe, it, expect } from 'vitest'
import { formatCashDelta } from './AnimatedCash'

describe('formatCashDelta', () => {
  it('prefixes gains with + and euro sign', () => {
    expect(formatCashDelta(200)).toBe('+€200')
  })

  it('prefixes losses with a real minus sign and absolute value', () => {
    expect(formatCashDelta(-150)).toBe('−€150')
  })

  it('treats +1 and -1 symmetrically', () => {
    expect(formatCashDelta(1)).toBe('+€1')
    expect(formatCashDelta(-1)).toBe('−€1')
  })
})

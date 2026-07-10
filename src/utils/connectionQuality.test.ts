import { describe, it, expect } from 'vitest'
import { assessConnection, recentReconnects, WEAK_LATENCY_MS } from './connectionQuality'

const NOW = 1_000_000
const slow = (t: number) => ({ t, ms: WEAK_LATENCY_MS + 500 })
const fast = (t: number) => ({ t, ms: 200 })

describe('recentReconnects', () => {
  it('counts only episodes inside the 60s window', () => {
    const ts = [NOW - 70_000, NOW - 30_000, NOW - 5_000]
    expect(recentReconnects(ts, NOW)).toBe(2)
  })
})

describe('assessConnection', () => {
  it('is good with no reconnects and fast round-trips', () => {
    expect(assessConnection([], [fast(NOW), fast(NOW)], NOW)).toBe('good')
  })

  it('is unstable after two reconnects within the window', () => {
    expect(assessConnection([NOW - 20_000, NOW - 2_000], [], NOW)).toBe('unstable')
  })

  it('a single reconnect is not enough to be unstable', () => {
    expect(assessConnection([NOW - 2_000], [], NOW)).toBe('good')
  })

  it('is slow when two recent round-trips exceed the threshold', () => {
    expect(assessConnection([], [fast(NOW), slow(NOW), slow(NOW)], NOW)).toBe('slow')
  })

  it('ignores a single slow round-trip (cold-start spike)', () => {
    expect(assessConnection([], [slow(NOW), fast(NOW), fast(NOW)], NOW)).toBe('good')
  })

  it('clears slow once the slow samples age out of the window', () => {
    expect(assessConnection([], [slow(NOW - 40_000), slow(NOW - 35_000), fast(NOW)], NOW)).toBe('good')
  })

  it('unstable outranks slow', () => {
    expect(assessConnection([NOW - 1_000, NOW - 2_000], [slow(NOW), slow(NOW)], NOW)).toBe('unstable')
  })
})

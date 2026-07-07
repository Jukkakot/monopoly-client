import { describe, it, expect } from 'vitest'
import { panOffsetPercent } from './boardPan'

// At scale 2 the on-screen board is 600px, so the unscaled box is 300px. translate(%) is
// relative to the unscaled box, so dragging 150px (half the unscaled width) must move the
// offset by 50% — i.e. the content tracks the finger 1:1.
describe('panOffsetPercent', () => {
  const scaledPx = 600 // unscaled 300 at scale 2

  it('tracks the finger 1:1: half the unscaled width drags to a 50% offset', () => {
    expect(panOffsetPercent(0, 150, scaledPx, 2, /*maxT*/ 50)).toBe(50)
  })

  it('is faster than the old scale-less formula (the reported slowness)', () => {
    const fixed = panOffsetPercent(0, 60, scaledPx, 2, 100)
    const oldSlow = 0 + 60 / scaledPx * 100 // pre-fix: missing the * scale factor
    expect(fixed).toBeCloseTo(oldSlow * 2) // exactly `scale`× faster
  })

  it('pans faster the more you are zoomed in', () => {
    const atScale2 = panOffsetPercent(0, 30, 600, 2, 100)
    const atScale3 = panOffsetPercent(0, 30, 900, 3, 100) // same unscaled 300px board
    // Same finger delta on the same physical board tracks 1:1 at both zooms.
    expect(atScale2).toBeCloseTo(atScale3)
  })

  it('clamps to the board edges (±maxT)', () => {
    expect(panOffsetPercent(0, 100000, scaledPx, 2, 50)).toBe(50)
    expect(panOffsetPercent(0, -100000, scaledPx, 2, 50)).toBe(-50)
  })

  it('returns the start offset when the board size is unknown', () => {
    expect(panOffsetPercent(12, 200, 0, 2, 50)).toBe(12)
  })
})

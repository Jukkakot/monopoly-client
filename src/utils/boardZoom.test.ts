import { describe, it, expect } from 'vitest'
import { zoomTargetForSpot } from './boardZoom'

describe('zoomTargetForSpot', () => {
  it('keeps the requested scale', () => {
    expect(zoomTargetForSpot(5).scale).toBe(2.6)
    expect(zoomTargetForSpot(5, 3).scale).toBe(3)
  })

  it('pans toward the bottom-right corner for GO (idx 0)', () => {
    // idx 0 = bottom-right corner → board must shift up-left (negative tx/ty).
    const { tx, ty } = zoomTargetForSpot(0)
    expect(tx).toBeLessThan(0)
    expect(ty).toBeLessThan(0)
  })

  it('pans toward the top-left for the opposite corner (idx 20)', () => {
    // idx 20 = top-left corner → board shifts down-right (positive tx/ty).
    const { tx, ty } = zoomTargetForSpot(20)
    expect(tx).toBeGreaterThan(0)
    expect(ty).toBeGreaterThan(0)
  })

  it('never exceeds the pannable clamp (±50*(scale-1))', () => {
    const scale = 2.6
    const maxT = 50 * (scale - 1)
    for (let idx = 0; idx < 40; idx++) {
      const { tx, ty } = zoomTargetForSpot(idx, scale)
      expect(Math.abs(tx)).toBeLessThanOrEqual(maxT + 1e-9)
      expect(Math.abs(ty)).toBeLessThanOrEqual(maxT + 1e-9)
    }
  })
})

import { describe, it, expect } from 'vitest'
import { zoomTargetForSpot, zoomTargetForPoint } from './boardZoom'

describe('zoomTargetForPoint', () => {
  it('does not pan when centred (0.5, 0.5)', () => {
    const { scale, tx, ty } = zoomTargetForPoint(0.5, 0.5)
    expect(scale).toBe(2.6)
    expect(tx).toBeCloseTo(0)
    expect(ty).toBeCloseTo(0)
  })

  it('pans up-left toward a bottom-right tap', () => {
    const { tx, ty } = zoomTargetForPoint(0.9, 0.9)
    expect(tx).toBeLessThan(0)
    expect(ty).toBeLessThan(0)
  })

  it('clamps to the pannable range for extreme corners', () => {
    const scale = 2.6
    const maxT = 50 * (scale - 1)
    const { tx, ty } = zoomTargetForPoint(0, 0, scale)
    expect(tx).toBeCloseTo(maxT)
    expect(ty).toBeCloseTo(maxT)
  })
})

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

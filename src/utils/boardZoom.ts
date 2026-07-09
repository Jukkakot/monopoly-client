import { indexToGridPos } from '../types/spots'

export interface ZoomTarget {
  scale: number
  tx: number
  ty: number
}

/**
 * Computes the pinch transform ({scale, tx, ty} as translate-% + scale) that centres the
 * point at board fractions (fx, fy) — each 0..1 across the board — in the viewport at the
 * given zoom `scale`. tx/ty are clamped to the pannable range so the board edge never
 * detaches from the frame. Pure → unit tested.
 */
export function zoomTargetForPoint(fx: number, fy: number, scale = 2.6): ZoomTarget {
  const bx = fx - 0.5
  const by = fy - 0.5
  const maxT = 50 * (scale - 1)
  const clamp = (v: number) => Math.max(-maxT, Math.min(maxT, v))
  return {
    scale,
    tx: clamp(-100 * bx * (scale - 1)),
    ty: clamp(-100 * by * (scale - 1)),
  }
}

/** Zoom transform that centres the board spot at `idx` (its 11×11 cell centre). */
export function zoomTargetForSpot(idx: number, scale = 2.6): ZoomTarget {
  const { row, col } = indexToGridPos(idx)
  return zoomTargetForPoint((col - 0.5) / 11, (row - 0.5) / 11, scale)
}

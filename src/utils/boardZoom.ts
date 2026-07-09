import { indexToGridPos } from '../types/spots'

export interface ZoomTarget {
  scale: number
  tx: number
  ty: number
}

/**
 * Computes the pinch transform ({scale, tx, ty} as translate-% + scale) that centres the
 * board spot at `idx` in the viewport at the given zoom `scale`. tx/ty are clamped to the
 * pannable range so the board edge never detaches from the frame. Pure → unit tested.
 */
export function zoomTargetForSpot(idx: number, scale = 2.6): ZoomTarget {
  const { row, col } = indexToGridPos(idx)
  // Cell centre as a fraction of the 11×11 board, expressed as an offset from board centre.
  const bx = (col - 0.5) / 11 - 0.5
  const by = (row - 0.5) / 11 - 0.5
  const maxT = 50 * (scale - 1)
  const clamp = (v: number) => Math.max(-maxT, Math.min(maxT, v))
  return {
    scale,
    tx: clamp(-100 * bx * (scale - 1)),
    ty: clamp(-100 * by * (scale - 1)),
  }
}

/**
 * Computes the new pan offset (in percent of the board's UNSCALED width/height, which is
 * what CSS `translate(%)` resolves against) after dragging a finger by `deltaPx` screen
 * pixels while the board is zoomed to `scale`.
 *
 * `boardScaledPx` is the on-screen (scaled) board size from getBoundingClientRect, so the
 * unscaled size is `boardScaledPx / scale`. Dividing the pixel delta by the unscaled size
 * makes the content track the finger 1:1 (the point under the finger stays under it).
 * Without the `* scale` factor the pan lagged the finger by a factor of `scale` — the
 * board crawled when zoomed in.
 *
 * The result is clamped to ±maxT so the board can't be dragged past its edges.
 */
export function panOffsetPercent(
  startOffset: number,
  deltaPx: number,
  boardScaledPx: number,
  scale: number,
  maxT: number,
): number {
  if (boardScaledPx <= 0) return startOffset
  const raw = startOffset + (deltaPx * scale) / boardScaledPx * 100
  return Math.max(-maxT, Math.min(maxT, raw))
}

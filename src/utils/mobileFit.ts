/**
 * Computes the mobile-portrait board height that makes the action panel exactly hug its
 * content. The board and the action area share a fixed viewport, so shrinking the board by
 * the action overflow (or growing it by the slack) leaves the action area equal to its
 * content height — no clipping, no wasted space. Bounded only by the hard min/max; there is
 * deliberately no "preferred height" cap, since that is what previously left the panel the
 * wrong size and forced manual dragging. Pure → unit tested.
 *
 * @param currentBoard  current board height (px)
 * @param contentH      measured height of the action content (px)
 * @param availableH    height currently available to the action content (px)
 * @param min           hard minimum board height
 * @param max           hard maximum board height
 */
export function fitBoardHeight(
  currentBoard: number,
  contentH: number,
  availableH: number,
  min: number,
  max: number,
): number {
  const overflow = contentH - availableH
  return Math.max(min, Math.min(max, currentBoard - overflow))
}

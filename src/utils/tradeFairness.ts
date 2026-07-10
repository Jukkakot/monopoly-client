export type TradeVerdict = 'fair' | 'favorsYou' | 'favorsThem'

/**
 * Classifies a trade from the editing player's perspective by comparing the value they
 * give vs. get. Within ~12 % is "fair"; otherwise it favours whichever side is larger.
 * `get > give` favours you (you receive more value). Pure → unit tested.
 */
export function tradeVerdict(give: number, get: number): TradeVerdict {
  const max = Math.max(give, get)
  if (max === 0) return 'fair'
  const rel = Math.abs(get - give) / max
  if (rel < 0.12) return 'fair'
  return get > give ? 'favorsYou' : 'favorsThem'
}

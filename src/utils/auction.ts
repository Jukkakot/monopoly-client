/**
 * A bid is valid only when it is at least the minimum next bid and no more than the bidder's
 * cash (and a real number). Shared by the auction quick-bid buttons and the custom-bid input so
 * they can't disagree — the quick buttons used to gate on affordability alone, letting a "+10"
 * land below `minimumNextBid` (which the backend can set higher than currentBid + 10) and get
 * rejected. Pure → unit tested.
 */
export function isValidBid(amount: number, minBid: number, cash: number): boolean {
  return Number.isFinite(amount) && amount >= minBid && amount <= cash
}

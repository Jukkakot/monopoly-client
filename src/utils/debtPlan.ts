export interface MortgageOption {
  propertyId: string
  /** Cash raised by mortgaging this property (usually price / 2). */
  value: number
}

export interface DebtPlan {
  /** How much more cash is still needed after current cash (0 if already covered). */
  shortfall: number
  /** Greedy suggestion of property ids to mortgage, fewest-properties-first. */
  suggestion: string[]
  /** Whether cash + the suggested mortgages fully cover the debt. */
  covers: boolean
}

/**
 * Works out what a debtor still needs to raise and the smallest number of
 * mortgages that covers it. Greedy largest-value-first minimises how many
 * properties you have to give up — which is what a player scrambling to avoid
 * bankruptcy wants. Pure → unit tested. Building sales are handled separately;
 * this only reasons about mortgageable properties.
 */
export function planDebtCoverage(amountDue: number, cash: number, options: MortgageOption[]): DebtPlan {
  const shortfall = Math.max(0, amountDue - cash)
  if (shortfall === 0) return { shortfall: 0, suggestion: [], covers: true }

  const sorted = [...options].sort((a, b) => b.value - a.value)
  const suggestion: string[] = []
  let raised = 0
  for (const o of sorted) {
    if (raised >= shortfall) break
    suggestion.push(o.propertyId)
    raised += o.value
  }
  return { shortfall, suggestion, covers: raised >= shortfall }
}

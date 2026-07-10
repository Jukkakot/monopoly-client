import { describe, it, expect } from 'vitest'
import { planDebtCoverage } from './debtPlan'

const opts = [
  { propertyId: 'A', value: 100 },
  { propertyId: 'B', value: 60 },
  { propertyId: 'C', value: 30 },
]

describe('planDebtCoverage', () => {
  it('reports no shortfall when cash already covers the debt', () => {
    const p = planDebtCoverage(200, 250, opts)
    expect(p.shortfall).toBe(0)
    expect(p.suggestion).toEqual([])
    expect(p.covers).toBe(true)
  })

  it('computes the shortfall as debt minus cash', () => {
    expect(planDebtCoverage(200, 120, opts).shortfall).toBe(80)
  })

  it('suggests the fewest mortgages (largest first) that cover the shortfall', () => {
    // shortfall 80 → mortgage A (100) alone covers it
    const p = planDebtCoverage(200, 120, opts)
    expect(p.suggestion).toEqual(['A'])
    expect(p.covers).toBe(true)
  })

  it('adds more properties until the shortfall is covered', () => {
    // shortfall 150 → A(100) + B(60) = 160 ≥ 150
    const p = planDebtCoverage(200, 50, opts)
    expect(p.suggestion).toEqual(['A', 'B'])
    expect(p.covers).toBe(true)
  })

  it('flags when even mortgaging everything is not enough', () => {
    // total mortgage value 190, shortfall 300
    const p = planDebtCoverage(400, 100, opts)
    expect(p.suggestion).toEqual(['A', 'B', 'C'])
    expect(p.covers).toBe(false)
  })

  it('handles no mortgageable properties', () => {
    const p = planDebtCoverage(100, 40, [])
    expect(p.shortfall).toBe(60)
    expect(p.suggestion).toEqual([])
    expect(p.covers).toBe(false)
  })
})

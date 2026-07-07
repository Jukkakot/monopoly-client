import { describe, it, expect } from 'vitest'
import { isBlockedByGroupBuildings } from './mortgage'

// B1/B2 = BROWN group, LB1/LB2/LB3 = LIGHT_BLUE, RR1 = RAILROAD, U1 = UTILITY.
const p = (propertyId: string, houseCount = 0, hotelCount = 0) => ({ propertyId, houseCount, hotelCount })

describe('isBlockedByGroupBuildings', () => {
  it('does not block a street when the whole group is building-free', () => {
    const props = [p('B1'), p('B2')]
    expect(isBlockedByGroupBuildings('B1', props)).toBe(false)
  })

  it('blocks a property that itself has houses', () => {
    const props = [p('B1', 2), p('B2', 2)]
    expect(isBlockedByGroupBuildings('B1', props)).toBe(true)
  })

  it('blocks a 0-house property when a color-group sibling has a house (the reported bug)', () => {
    // Even-building can leave BROWN at (0,1): B1 has none, B2 has one. B1 must not be
    // offered for mortgage — the backend rejects it with BUILDINGS_PRESENT.
    const props = [p('B1', 0), p('B2', 1)]
    expect(isBlockedByGroupBuildings('B1', props)).toBe(true)
  })

  it('blocks when a group sibling has a hotel', () => {
    const props = [p('LB1', 0), p('LB2', 0), p('LB3', 0, 1)]
    expect(isBlockedByGroupBuildings('LB1', props)).toBe(true)
  })

  it('never blocks a railroad (railroads have no buildings)', () => {
    const props = [p('RR1'), p('B1', 3), p('B2', 3)]
    expect(isBlockedByGroupBuildings('RR1', props)).toBe(false)
  })

  it('never blocks a utility', () => {
    const props = [p('U1'), p('B1', 3), p('B2', 3)]
    expect(isBlockedByGroupBuildings('U1', props)).toBe(false)
  })

  it('does not let one group\'s buildings block a different group', () => {
    // BROWN is built; LIGHT_BLUE is not — LB1 stays mortgageable.
    const props = [p('B1', 3), p('B2', 3), p('LB1', 0), p('LB2', 0)]
    expect(isBlockedByGroupBuildings('LB1', props)).toBe(false)
  })

  it('does not block a building-free property regardless of mortgage (trade picker includes mortgaged)', () => {
    // A mortgaged deed in a building-free group must stay tradeable — the helper looks
    // only at buildings, never at mortgage state (mortgaged deeds carry 0 houses).
    const props = [p('B1', 0), p('B2', 0)]
    expect(isBlockedByGroupBuildings('B1', props)).toBe(false)
  })
})

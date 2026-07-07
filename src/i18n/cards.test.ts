import { describe, it, expect } from 'vitest'
import { getCardText } from './cards'

// getLang() falls back to 'fi' when localStorage is unavailable (unit env),
// so these assertions run against the Finnish card table.
describe('card texts use the euro currency, consistent with the rest of the UI', () => {
  const keys = [
    'chance:MONEY:0',
    'chance:ALL_PLAYERS_MONEY:0',
    'community:MONEY:0',
    'community:REPAIR_PROPERTIES:0',
  ]

  it('renders monetary amounts with € and never the legacy M-prefix', () => {
    for (const k of keys) {
      const text = getCardText(k, null)
      expect(text, k).toBeTruthy()
      // No "M<digit>" currency prefix should survive anywhere in a card text.
      expect(text!, k).not.toMatch(/M\d/)
      expect(text!, k).toMatch(/€\d/)
    }
  })

  it('falls back to the provided text for unknown keys', () => {
    expect(getCardText('bogus:key:9', 'fallback')).toBe('fallback')
    expect(getCardText(null, 'fallback')).toBe('fallback')
  })
})

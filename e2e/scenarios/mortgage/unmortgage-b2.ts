import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 0 owns B2 which is already mortgaged.
 * Unmortgaging costs mortgageValue × 1.1 (int truncation): 30 + floor(30×0.1) = 33.
 * Bot won't auto-unmortgage because seat 0 doesn't own the full BROWN group.
 */
export const unmortgageB2Scenario: TestScenario = {
  description: 'Seat 0 unmortgages B2 → cash −33, mortgaged=false',
  rules: ['unmortgageCost = mortgageValue + (int)(mortgageValue × 0.1)'],
  players: [
    { cash: 1500, boardIndex: 0 },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 0: ['B2'] },
  propertyOverrides: { B2: { mortgaged: true } },
  turn: { seat: 0, phase: 'WAITING_FOR_END_TURN' },
  expectedAfter: {
    playerCashDelta: { 0: -33 },
  },
}

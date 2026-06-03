import type { TestScenario } from '../../helpers/scenario'

/**
 * Official rule: mortgaging a property does NOT break the monopoly.
 * The unmortgaged properties in the same color group still charge double rent.
 *
 * Setup:
 *   Seat 1 owns both B1 and B2 (full BROWN monopoly).
 *   B1 is mortgaged → seat 1 collects NO rent when someone lands on B1.
 *   B2 is NOT mortgaged → seat 1 collects DOUBLE rent when someone lands on B2.
 *
 * Seat 0 at GO (position 0), dice [1,2]=3 → B2 (position 3).
 * B2 double rent (monopoly, no houses) = €8 (base rent €4 × 2).
 *
 * This confirms the backend correctly applies monopoly doubling even when
 * a sibling property is mortgaged.
 */
export const monopolyRentWithMortgageScenario: TestScenario = {
  description: 'Monopoly double rent still applies on unmortgaged property when sibling is mortgaged',
  rules: ['mortgaged property does not break monopoly — unmortgaged siblings still get 2× rent'],
  players: [
    { cash: 1500, boardIndex: 0  },  // seat 0: at GO
    { cash: 1500, boardIndex: 10 },  // seat 1: at jail/visiting, owns B1+B2
  ],
  ownedProperties: { 1: ['B1', 'B2'] },
  propertyOverrides: { B1: { mortgaged: true } },  // B1 mortgaged, B2 not
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],  // sum=3 (non-doubles) → 0+3=3 = B2 (unmortgaged, double rent)
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: { 0: -8, 1: +8 },  // B2 monopoly rent = €8 (base €4 × 2)
  },
}

import type { TestScenario } from '../../helpers/scenario'

/**
 * Seat 1 owns full BROWN monopoly (B1+B2), B2 has 1 house.
 * Seat 0 at 0 (GO), dice [1,2]=3 → B2 (position 3). No GO crossing.
 * B2 rent with 1 house = €20 (RENT_TABLE: B2=[4,20,60,180,320,450]).
 */
export const rent1HouseScenario: TestScenario = {
  description: 'Landing on property with 1 house charges house rent',
  rules: ['1 house rent = RENT_TABLE[1]'],
  players: [
    { cash: 1500, boardIndex: 0  },
    { cash: 1500, boardIndex: 10 },
  ],
  ownedProperties: { 1: ['B1', 'B2'] },
  propertyOverrides: { B2: { houseCount: 1 } },
  turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
  forcedDice: [1, 2],
  expectedAfter: {
    phase: 'WAITING_FOR_END_TURN',
    playerCashDelta: { 0: -20, 1: +20 },
  },
}

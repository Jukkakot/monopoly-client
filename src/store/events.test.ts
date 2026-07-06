/**
 * Pure logic tests for deriveMiscEvents (src/store/events.ts).
 *
 * The monopoly-gained announcement must fire on ANY ownership change that
 * completes a color set for the new owner — purchase from the bank, auction,
 * trade, or bankruptcy transfer — and only once per group per snapshot.
 */

import { describe, it, expect } from 'vitest'
import { deriveMiscEvents } from './events'
import type { SessionState, PlayerSnapshot, PropertyStateSnapshot } from '../types/api'

function player(playerId: string, name: string): PlayerSnapshot {
  return {
    playerId, seatId: `seat-${playerId}`, name,
    cash: 1500, boardIndex: 0, bankrupt: false, eliminated: false,
    inJail: false, jailRoundsRemaining: 0, getOutOfJailCards: 0,
    ownedPropertyIds: [],
  } as unknown as PlayerSnapshot
}

function prop(propertyId: string, ownerPlayerId: string | null): PropertyStateSnapshot {
  return { propertyId, ownerPlayerId, mortgaged: false, houseCount: 0, hotelCount: 0 } as unknown as PropertyStateSnapshot
}

function state(properties: PropertyStateSnapshot[], extra: Partial<SessionState> = {}): SessionState {
  return {
    sessionId: 's', version: 1, status: 'IN_PROGRESS',
    seats: [], players: [player('p1', 'Anna'), player('p2', 'Ben')],
    properties,
    turn: { activePlayerId: 'p1', phase: 'WAITING_FOR_ROLL', canRoll: true, canEndTurn: false },
    ...extra,
  } as unknown as SessionState
}

describe('deriveMiscEvents — monopoly gained', () => {
  it('announces a monopoly completed via a trade transfer', () => {
    const prev = state([prop('B1', 'p1'), prop('B2', 'p2')],
      { tradeState: { tradeId: 't1' } as never })
    const next = state([prop('B1', 'p1'), prop('B2', 'p1')])

    const events = deriveMiscEvents(prev, next)

    const monopoly = events.filter(e => e.icon === '🏆')
    expect(monopoly).toHaveLength(1)
    expect(monopoly[0].relatedPlayerIds).toEqual(['p1'])
  })

  it('announces a multi-property bankruptcy transfer monopoly only once', () => {
    const prev = state([prop('B1', 'p2'), prop('B2', 'p2')])
    const next = state([prop('B1', 'p1'), prop('B2', 'p1')])

    const events = deriveMiscEvents(prev, next)

    expect(events.filter(e => e.icon === '🏆')).toHaveLength(1)
  })

  it('still announces a monopoly completed by buying from the bank', () => {
    const prev = state([prop('B1', 'p1'), prop('B2', null)])
    const next = state([prop('B1', 'p1'), prop('B2', 'p1')])

    const events = deriveMiscEvents(prev, next)

    expect(events.filter(e => e.icon === '🏆')).toHaveLength(1)
  })

  it('does not announce when the transfer does not complete a set', () => {
    const prev = state([prop('B1', null), prop('B2', 'p2')])
    const next = state([prop('B1', 'p1'), prop('B2', 'p2')])

    const events = deriveMiscEvents(prev, next)

    expect(events.filter(e => e.icon === '🏆')).toHaveLength(0)
  })

  it('does not re-announce a monopoly the owner already had', () => {
    // Same owner on both sides — no ownership change, no announcement
    const prev = state([prop('B1', 'p1'), prop('B2', 'p1')])
    const next = state([prop('B1', 'p1'), prop('B2', 'p1')])

    const events = deriveMiscEvents(prev, next)

    expect(events.filter(e => e.icon === '🏆')).toHaveLength(0)
  })
})

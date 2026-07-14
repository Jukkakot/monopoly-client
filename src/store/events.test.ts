/**
 * Pure logic tests for deriveMiscEvents (src/store/events.ts).
 *
 * The monopoly-gained announcement must fire on ANY ownership change that
 * completes a color set for the new owner — purchase from the bank, auction,
 * trade, or bankruptcy transfer — and only once per group per snapshot.
 */

import { describe, it, expect } from 'vitest'
import { deriveMiscEvents, translateBackendEvents } from './events'
import type { SessionState, PlayerSnapshot, PropertyStateSnapshot, GameEventEntry } from '../types/api'

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

describe('translateBackendEvents — CHAT', () => {
  const players = [player('p1', 'Anna'), player('p2', 'Ben')]

  function chatEntry(id: number, playerId: string, data: Record<string, string>): GameEventEntry {
    return { id, timestamp: Date.now(), type: 'CHAT', playerIds: [playerId], data }
  }

  it('carries a message chat payload with a 💬 icon', () => {
    const [e] = translateBackendEvents(
      [chatEntry(1, 'p1', { kind: 'MESSAGE', content: 'hei kaikki', name: 'Anna' })], players)
    expect(e.chat).toEqual({ kind: 'MESSAGE', name: 'Anna', content: 'hei kaikki', playerId: 'p1' })
    expect(e.icon).toBe('💬')
  })

  it('uses the emoji itself as the icon for a reaction', () => {
    const [e] = translateBackendEvents(
      [chatEntry(2, 'p2', { kind: 'REACTION', content: '🎉', name: 'Ben' })], players)
    expect(e.chat).toEqual({ kind: 'REACTION', name: 'Ben', content: '🎉', playerId: 'p2' })
    expect(e.icon).toBe('🎉')
  })

  it('falls back to the resolved player name when the event omits one', () => {
    const [e] = translateBackendEvents(
      [chatEntry(3, 'p1', { kind: 'MESSAGE', content: 'moi' })], players)
    expect(e.chat?.name).toBe('Anna')
  })

  it('carries a bot message localization key through (client owns the text)', () => {
    const [e] = translateBackendEvents(
      [chatEntry(4, 'p2', { kind: 'MESSAGE', name: 'Botti', botMsgKey: 'tradeDone' })], players)
    expect(e.chat?.botMsgKey).toBe('tradeDone')
  })

  it('leaves human messages without a localization key', () => {
    const [e] = translateBackendEvents(
      [chatEntry(5, 'p1', { kind: 'MESSAGE', content: 'moi' })], players)
    expect(e.chat?.botMsgKey).toBeUndefined()
  })

  it('carries a directed @mention target through', () => {
    const [e] = translateBackendEvents(
      [chatEntry(6, 'p2', { kind: 'MESSAGE', name: 'Botti', botMsgKey: 'rentGloat', targetPlayerId: 'p1' })], players)
    expect(e.chat?.targetPlayerId).toBe('p1')
  })

  it('parses a reaction attached to a specific message (replyToId)', () => {
    const [e] = translateBackendEvents(
      [chatEntry(7, 'p1', { kind: 'REACTION', content: '😂', name: 'Anna', replyToId: '4' })], players)
    expect(e.chat?.kind).toBe('REACTION')
    expect(e.chat?.replyToId).toBe(4)
  })

  it('uses the backend timestamp for chat rows', () => {
    const entry: GameEventEntry = { id: 8, timestamp: 1_700_000_000_000, type: 'CHAT', playerIds: ['p1'], data: { kind: 'MESSAGE', content: 'moi' } }
    const [e] = translateBackendEvents([entry], players)
    expect(e.timestamp).toBe(1_700_000_000_000)
  })
})

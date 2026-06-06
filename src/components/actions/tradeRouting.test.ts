/**
 * Pure logic tests for TradeSection routing.
 *
 * The component decides which sub-view to render for each player based on
 * TradeState fields.  These tests verify the predicate logic without
 * mounting React — no DOM / jsdom required.
 *
 * Backend contract (TradeCommandHandler.handleSubmit):
 *   After any submit, editingPlayerId = decisionRequiredFromPlayerId = responderId
 *   (the OTHER party, never the submitter).
 *
 * Routing rules (from TradeSection):
 *   1. Show TradeEditor  when: status EDITING|COUNTERED AND editingPlayerId === me
 *   2. Show TradeReceiver when: status SUBMITTED AND decisionRequiredFromPlayerId === me
 *   3. Otherwise: show waiting / spectator view
 */

import { describe, it, expect } from 'vitest'
import type { TradeStatus } from '../../types/api'

interface MinimalTradeState {
  status: TradeStatus
  editingPlayerId: string | null
  decisionRequiredFromPlayerId: string | null
  initiatorPlayerId: string
  recipientPlayerId: string
}

/** Mirrors the condition used by TradeSection to pick TradeEditor */
function shouldShowEditor(trade: MinimalTradeState, myPlayerId: string): boolean {
  return (
    (trade.status === 'EDITING' || trade.status === 'COUNTERED') &&
    trade.editingPlayerId === myPlayerId
  )
}

/** Mirrors the condition used by TradeSection to pick TradeReceiver */
function shouldShowReceiver(trade: MinimalTradeState, myPlayerId: string): boolean {
  return (
    trade.status === 'SUBMITTED' &&
    trade.decisionRequiredFromPlayerId === myPlayerId
  )
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const A = 'player-A'
const B = 'player-B'

/** Initial offer: A opens trade and is editing */
const stateEditing: MinimalTradeState = {
  status: 'EDITING',
  editingPlayerId: A,
  decisionRequiredFromPlayerId: null,
  initiatorPlayerId: A,
  recipientPlayerId: B,
}

/**
 * A has submitted the offer.
 * Backend sets editingPlayerId = decisionRequiredFromPlayerId = B (the responder).
 */
const stateSubmittedByA: MinimalTradeState = {
  status: 'SUBMITTED',
  editingPlayerId: B,
  decisionRequiredFromPlayerId: B,
  initiatorPlayerId: A,
  recipientPlayerId: B,
}

/** B clicked "Counter" → status COUNTERED, B is now editing their counter-offer */
const stateCounteredByB: MinimalTradeState = {
  status: 'COUNTERED',
  editingPlayerId: B,
  decisionRequiredFromPlayerId: null,
  initiatorPlayerId: A,
  recipientPlayerId: B,
}

/**
 * B submitted their counter-offer.
 * Backend sets editingPlayerId = decisionRequiredFromPlayerId = A (the new responder).
 */
const stateSubmittedByB: MinimalTradeState = {
  status: 'SUBMITTED',
  editingPlayerId: A,
  decisionRequiredFromPlayerId: A,
  initiatorPlayerId: A,
  recipientPlayerId: B,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TradeSection routing — shouldShowEditor', () => {
  it('A sees TradeEditor when status is EDITING and A is editingPlayerId', () => {
    expect(shouldShowEditor(stateEditing, A)).toBe(true)
  })

  it('B does NOT see TradeEditor when A is editing', () => {
    expect(shouldShowEditor(stateEditing, B)).toBe(false)
  })

  it('B sees TradeEditor when status is COUNTERED and B is editingPlayerId', () => {
    expect(shouldShowEditor(stateCounteredByB, B)).toBe(true)
  })

  it('A does NOT see TradeEditor when B is countering', () => {
    expect(shouldShowEditor(stateCounteredByB, A)).toBe(false)
  })
})

describe('TradeSection routing — shouldShowReceiver', () => {
  it('B sees TradeReceiver when A submitted offer (decisionRequired = B)', () => {
    expect(shouldShowReceiver(stateSubmittedByA, B)).toBe(true)
  })

  it('A does NOT see TradeReceiver when A submitted — decisionRequired points to B', () => {
    expect(shouldShowReceiver(stateSubmittedByA, A)).toBe(false)
  })

  it('A sees TradeReceiver after B submits counter-offer (decisionRequired = A)', () => {
    expect(shouldShowReceiver(stateSubmittedByB, A)).toBe(true)
  })

  it('B does NOT see TradeReceiver after B submits counter-offer — decisionRequired points to A', () => {
    expect(shouldShowReceiver(stateSubmittedByB, B)).toBe(false)
  })

  it('Nobody sees TradeReceiver when status is COUNTERED (offer not yet submitted)', () => {
    expect(shouldShowReceiver(stateCounteredByB, A)).toBe(false)
    expect(shouldShowReceiver(stateCounteredByB, B)).toBe(false)
  })
})

describe('TradeSection routing — mutual exclusivity', () => {
  it('Editor and Receiver views are mutually exclusive for all states and players', () => {
    const states = [stateEditing, stateSubmittedByA, stateCounteredByB, stateSubmittedByB]
    const players = [A, B]
    for (const state of states) {
      for (const player of players) {
        const editor = shouldShowEditor(state, player)
        const receiver = shouldShowReceiver(state, player)
        expect(editor && receiver, `Both editor and receiver shown for player=${player} status=${state.status}`).toBe(false)
      }
    }
  })
})

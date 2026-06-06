/**
 * Pure logic tests for TradeSection routing.
 *
 * The component decides which sub-view to render for each player based on
 * TradeState fields.  These tests verify the predicate logic without
 * mounting React — no DOM / jsdom required.
 *
 * Routing rules (from TradeSection):
 *   1. Show TradeEditor  when: status EDITING|COUNTERED AND editingPlayerId === me
 *   2. Show TradeReceiver when: status SUBMITTED
 *                               AND decisionRequiredFromPlayerId === me
 *                               AND editingPlayerId !== me   ← bug-fix guard
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

/** Mirrors the condition used by TradeSection to pick TradeReceiver (post bug-fix) */
function shouldShowReceiver(trade: MinimalTradeState, myPlayerId: string): boolean {
  return (
    trade.status === 'SUBMITTED' &&
    trade.decisionRequiredFromPlayerId === myPlayerId &&
    trade.editingPlayerId !== myPlayerId   // guard: never show accept to the submitter
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

/** A has submitted the offer; B must respond */
const stateSubmittedByA: MinimalTradeState = {
  status: 'SUBMITTED',
  editingPlayerId: A,          // still set to A (the submitter)
  decisionRequiredFromPlayerId: B,
  initiatorPlayerId: A,
  recipientPlayerId: B,
}

/** B clicked "Counter" → status COUNTERED, B is now editing */
const stateCounteredByB: MinimalTradeState = {
  status: 'COUNTERED',
  editingPlayerId: B,
  decisionRequiredFromPlayerId: null,
  initiatorPlayerId: A,
  recipientPlayerId: B,
}

/**
 * B submitted their counter-offer.
 * editingPlayerId remains B (the submitter); A must now respond.
 *
 * The pre-fix bug: if backend also set decisionRequiredFromPlayerId = B,
 * the old condition (without editingPlayerId guard) would show TradeReceiver to B.
 * We model the worst-case backend behaviour here to confirm the guard works.
 */
const stateSubmittedByB_bugged: MinimalTradeState = {
  status: 'SUBMITTED',
  editingPlayerId: B,               // B just submitted
  decisionRequiredFromPlayerId: B,  // worst-case: backend points back to B
  initiatorPlayerId: A,
  recipientPlayerId: B,
}

/** B submitted counter correctly; A is the decision-maker */
const stateSubmittedByB_correct: MinimalTradeState = {
  status: 'SUBMITTED',
  editingPlayerId: B,
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

  it('A does NOT see TradeReceiver when A just submitted (A is editingPlayerId)', () => {
    expect(shouldShowReceiver(stateSubmittedByA, A)).toBe(false)
  })

  it('A sees TradeReceiver after B submits counter-offer (correct backend state)', () => {
    expect(shouldShowReceiver(stateSubmittedByB_correct, A)).toBe(true)
  })

  it('B does NOT see TradeReceiver after B submits counter-offer — guard prevents accept-own-counter (correct backend state)', () => {
    expect(shouldShowReceiver(stateSubmittedByB_correct, B)).toBe(false)
  })

  it('B does NOT see TradeReceiver even when backend incorrectly points decisionRequired back to B', () => {
    // This is the exact bug scenario: editingPlayerId guard must block B from seeing accept
    expect(shouldShowReceiver(stateSubmittedByB_bugged, B)).toBe(false)
  })

  it('Nobody sees TradeReceiver when status is COUNTERED (no offer submitted yet)', () => {
    expect(shouldShowReceiver(stateCounteredByB, A)).toBe(false)
    expect(shouldShowReceiver(stateCounteredByB, B)).toBe(false)
  })
})

describe('TradeSection routing — mutual exclusivity', () => {
  it('Editor and Receiver views are mutually exclusive for all states and players', () => {
    const states = [stateEditing, stateSubmittedByA, stateCounteredByB, stateSubmittedByB_correct, stateSubmittedByB_bugged]
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

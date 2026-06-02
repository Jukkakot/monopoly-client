import type { ClientSessionSnapshot } from '../../src/types/api'
import { getSnapshot } from './api'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

/**
 * Primary assertion strategy: poll until cash values match expected.
 * Cash changes are permanent — no race condition with fast bots.
 * Use for rent, GO, tax tests.
 */
export async function waitForCashValues(
  sid: string,
  expected: Record<number, number>,
  timeoutMs = 8000
): Promise<ClientSessionSnapshot> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snap = await getSnapshot(sid)
    const players = snap.state?.players ?? []
    const match = Object.entries(expected).every(
      ([seat, cash]) => players[+seat]?.cash === cash
    )
    if (match) return snap
    await sleep(150)
  }
  const last = await getSnapshot(sid)
  const players = last.state?.players ?? []
  const actual = Object.keys(expected).map(s => `seat${s}=${players[+s]?.cash}`).join(', ')
  const exp = Object.entries(expected).map(([s, c]) => `seat${s}=${c}`).join(', ')
  throw new Error(`waitForCashValues timeout.\n  Expected: ${exp}\n  Actual:   ${actual}`)
}

/**
 * Wait until a specific seat becomes the active player.
 * Use after bot (seat 0) completes its turn to safely assert before seat 1 acts.
 * Immediately delete session after asserting to prevent further bot actions.
 */
export async function waitForActivePlayer(
  sid: string,
  seatIndex: number,
  snap0: ClientSessionSnapshot,
  timeoutMs = 8000
): Promise<ClientSessionSnapshot> {
  const targetId = snap0.state?.players[seatIndex]?.playerId
  if (!targetId) throw new Error(`No player at seat ${seatIndex}`)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snap = await getSnapshot(sid)
    if (snap.state?.turn?.activePlayerId === targetId) return snap
    if (snap.status === 'GAME_OVER') return snap
    await sleep(150)
  }
  throw new Error(`Timeout: seat ${seatIndex} never became active player`)
}

/**
 * Wait for game over. Use for bankruptcy/win tests.
 */
export async function waitForGameOver(sid: string, timeoutMs = 10000): Promise<ClientSessionSnapshot> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snap = await getSnapshot(sid)
    if (snap.status === 'GAME_OVER') return snap
    await sleep(150)
  }
  throw new Error('Timeout: game never reached GAME_OVER')
}

/**
 * Wait for a specific phase. Only use for STABLE phases (RESOLVING_DEBT, WAITING_FOR_DECISION).
 * DO NOT use for WAITING_FOR_END_TURN with fast bots — too transient.
 */
export async function waitForPhase(
  sid: string,
  phase: string,
  timeoutMs = 8000
): Promise<ClientSessionSnapshot> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const snap = await getSnapshot(sid)
    if (snap.state?.turn?.phase === phase) return snap
    await sleep(150)
  }
  const last = await getSnapshot(sid)
  throw new Error(
    `Timeout waiting for phase "${phase}". Last: phase=${last.state?.turn?.phase}, status=${last.status}`
  )
}

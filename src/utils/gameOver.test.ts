import { describe, it, expect } from 'vitest'
import { resolveDeclaredWinner } from './gameOver'
import type { PlayerSnapshot, SessionState } from '../types/api'

const player = (playerId: string, cash: number, bankrupt = false): PlayerSnapshot => ({
  playerId, seatId: playerId, name: playerId, cash, boardIndex: 0,
  bankrupt, eliminated: bankrupt, inJail: false, jailRoundsRemaining: 0,
  getOutOfJailCards: 0, ownedPropertyIds: [],
})

const state = (winnerPlayerId: string | null, players: PlayerSnapshot[]) =>
  ({ winnerPlayerId, players }) as Pick<SessionState, 'winnerPlayerId' | 'players'>

describe('resolveDeclaredWinner', () => {
  it('returns the backend-declared winner', () => {
    const players = [player('a', 0, true), player('b', 1500)]
    expect(resolveDeclaredWinner(state('b', players))?.playerId).toBe('b')
  })

  it('returns null when the game was aborted (no declared winner) even if someone leads', () => {
    // Both players still solvent — the host aborted. The client must NOT crown the
    // net-worth leader; an aborted game has no winner.
    const players = [player('a', 5000), player('b', 1000)]
    expect(resolveDeclaredWinner(state(null, players))).toBeNull()
  })

  it('returns null when winnerPlayerId points at an unknown player', () => {
    const players = [player('a', 1500)]
    expect(resolveDeclaredWinner(state('ghost', players))).toBeNull()
  })
})

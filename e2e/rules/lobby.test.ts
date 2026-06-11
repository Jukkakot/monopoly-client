import { describe, test, expect } from 'vitest'
import {
  createHumanBotSession,
  createTwoHumanSession,
  getSnapshot,
  sendCmdRaw,
  deleteSession,
} from '../helpers/api'

describe('Lobby flow', () => {
  test('3.1 lobby session starts IN_PROGRESS with WAITING_FOR_ROLL phase', async () => {
    const { sid } = await createHumanBotSession()
    try {
      const snap = await getSnapshot(sid)
      expect(snap.state?.status).toBe('IN_PROGRESS')
      expect(snap.state?.turn?.phase).toBe('WAITING_FOR_ROLL')
    } finally {
      await deleteSession(sid)
    }
  })

  test('3.2 human can roll dice with valid playerToken', async () => {
    const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
    try {
      const snap = await getSnapshot(sid)
      // Only attempt if the human player is currently active; otherwise skip the roll
      // but still verify the token itself does not cause an auth rejection.
      const activeId = snap.state?.turn?.activePlayerId
      if (activeId !== humanPlayerId) {
        // Human is not first — verify at least that the command is not rejected for auth reasons
        const result = await sendCmdRaw(sid, {
          type: 'RollDice',
          actorPlayerId: humanPlayerId,
          playerToken: humanPlayerToken,
        })
        // If rejected, it must be a game-rule rejection (wrong turn), not an auth rejection
        if (!result.accepted) {
          const codes = result.rejections.map(r => r.code)
          expect(codes).not.toContain('INVALID_TOKEN')
          expect(codes).not.toContain('UNAUTHORIZED')
        }
      } else {
        // Human is first — roll should be accepted
        const result = await sendCmdRaw(sid, {
          type: 'RollDice',
          actorPlayerId: humanPlayerId,
          playerToken: humanPlayerToken,
        })
        expect(result.accepted).toBe(true)
      }
    } finally {
      await deleteSession(sid)
    }
  })

  test('3.3 two-player lobby: both players present with cash > 0, game IN_PROGRESS', async () => {
    const { sid, p1, p2 } = await createTwoHumanSession()
    try {
      const snap = await getSnapshot(sid)
      expect(snap.state?.status).toBe('IN_PROGRESS')
      const players = snap.state?.players ?? []
      expect(players).toHaveLength(2)
      for (const p of players) {
        expect(p.cash).toBeGreaterThan(0)
      }
      const playerIds = players.map(p => p.id)
      expect(playerIds).toContain(p1.playerId)
      expect(playerIds).toContain(p2.playerId)
    } finally {
      await deleteSession(sid)
    }
  })

  test('3.4 active player at session start matches one of the known playerIds', async () => {
    const { sid, p1, p2 } = await createTwoHumanSession()
    try {
      const snap = await getSnapshot(sid)
      const activeId = snap.state?.turn?.activePlayerId
      expect([p1.playerId, p2.playerId]).toContain(activeId)
    } finally {
      await deleteSession(sid)
    }
  })
})

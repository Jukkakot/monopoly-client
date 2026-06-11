import { describe, test, expect } from 'vitest'
import {
  createHumanBotSession,
  createBotSession,
  getSnapshot,
  sendCmdRaw,
  deleteSession,
} from '../helpers/api'

const BASE = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'
const jsonHeaders = { 'Content-Type': 'application/json' }

describe('Token / auth validation', () => {
  test('4.1 command with correct playerToken → not rejected for auth reasons', async () => {
    const { sid, humanPlayerId, humanPlayerToken } = await createHumanBotSession()
    try {
      const result = await sendCmdRaw(sid, {
        type: 'RollDice',
        actorPlayerId: humanPlayerId,
        playerToken: humanPlayerToken,
      })
      // Either the command is accepted (human happens to be first), or rejected for
      // a game-rule reason (not the active player) — but never for auth.
      if (!result.accepted) {
        const codes = result.rejections.map(r => r.code)
        expect(codes).not.toContain('INVALID_TOKEN')
        expect(codes).not.toContain('UNAUTHORIZED')
        expect(codes).not.toContain('FORBIDDEN')
      }
      // If we got here without throwing, token auth passed.
    } finally {
      await deleteSession(sid)
    }
  })

  test('4.2 command with wrong playerToken → 403 or accepted:false with auth rejection', async () => {
    const { sid, humanPlayerId } = await createHumanBotSession()
    try {
      // Use raw fetch so we can inspect the HTTP status before parsing JSON
      const r = await fetch(`${BASE}/sessions/${sid}/command`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          type: 'RollDice',
          actorPlayerId: humanPlayerId,
          playerToken: 'wrong-token-xyz',
        }),
      })

      if (r.status === 403) {
        // Backend enforces auth at the HTTP level — this is the preferred outcome
        expect(r.status).toBe(403)
      } else if (r.status === 200 || r.status === 422) {
        // Backend returned a command result — check that the command was rejected
        const result = await r.json()
        expect(result.accepted).toBe(false)
        // The rejection should be auth-related
        const codes: string[] = result.rejections?.map((rj: { code: string }) => rj.code) ?? []
        const authRelated = codes.some(c =>
          c.includes('TOKEN') || c.includes('AUTH') || c.includes('FORBIDDEN') || c.includes('UNAUTHORIZED'),
        )
        expect(authRelated).toBe(true)
      } else {
        // Any other non-2xx status is also acceptable as a rejection signal
        expect(r.ok).toBe(false)
      }
    } finally {
      await deleteSession(sid)
    }
  })

  test('4.3 bot session: RollDice without playerToken → accepted (no token enforcement)', async () => {
    const sid = await createBotSession(2)
    try {
      const snap = await getSnapshot(sid)
      const activePlayerId = snap.state?.turn?.activePlayerId
      expect(activePlayerId).toBeTruthy()

      const result = await sendCmdRaw(sid, {
        type: 'RollDice',
        actorPlayerId: activePlayerId,
        // intentionally no playerToken field
      })

      // Bot sessions have no token enforcement — should be accepted (or rejected only for
      // game-rule reasons such as the bot engine having already rolled this turn).
      if (!result.accepted) {
        const codes = result.rejections.map(r => r.code)
        expect(codes).not.toContain('INVALID_TOKEN')
        expect(codes).not.toContain('UNAUTHORIZED')
        expect(codes).not.toContain('FORBIDDEN')
      }
    } finally {
      await deleteSession(sid)
    }
  })
})

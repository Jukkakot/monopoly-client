import { describe, test, expect } from 'vitest'
import { createBotSession, getSnapshot, injectState, sendCmd, deleteSession } from '../helpers/api'
import { buildPatch } from '../helpers/scenario'

describe('Game over', () => {
  test('9.1 last player after 1 bankruptcy → GAME_OVER with winner', async () => {
    // 2-player game: seat0 can't pay, goes bankrupt → seat1 wins
    const sid = await createBotSession(2)
    const snap0 = await getSnapshot(sid)
    try {
      const patch = buildPatch({
        description: '', rules: [],
        players: [
          { cash: 1, boardIndex: 0  },
          { cash: 1500, boardIndex: 10 },
        ],
        ownedProperties: { 1: ['B1', 'B2'] },
        propertyOverrides: { B2: { hotelCount: 1 } },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [1, 2],  // → B2 → debt €450, can't pay with €1
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch)
      const ids = snap0.state!.players.map(p => p.playerId)
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: ids[0] })
      let snap = await getSnapshot(sid)
      expect(snap.state?.turn?.phase).toBe('RESOLVING_DEBT')
      await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: ids[0], debtId: snap.state!.activeDebt!.debtId })
      snap = await getSnapshot(sid)
      expect(snap.status).toBe('GAME_OVER')
      expect(snap.state?.winnerPlayerId).toBe(ids[1])
    } finally {
      await deleteSession(sid)
    }
  })

  test('9.2 last player standing in 3-player game → GAME_OVER with correct winner', async () => {
    // 3-player game: seat0 and seat1 both go bankrupt → seat2 wins
    const sid = await createBotSession(3)
    const snap0 = await getSnapshot(sid)
    try {
      const [id0, id1, id2] = snap0.state!.players.map(p => p.playerId)
      // First: seat0 goes bankrupt
      const patch1 = buildPatch({
        description: '', rules: [],
        players: [
          { cash: 1, boardIndex: 0  },
          { cash: 1500, boardIndex: 10 },
          { cash: 1500, boardIndex: 20 },
        ],
        ownedProperties: { 1: ['B1', 'B2'] },
        propertyOverrides: { B2: { hotelCount: 1 } },
        turn: { seat: 0, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [1, 2],
        expectedAfter: {},
      }, snap0)
      await injectState(sid, patch1)
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: id0 })
      let snap = await getSnapshot(sid)
      await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: id0, debtId: snap.state!.activeDebt!.debtId })
      snap = await getSnapshot(sid)
      expect(snap.status).toBe('IN_PROGRESS')  // still going, seat1+seat2 remain

      // Now seat1 goes bankrupt — inject new state with seat1 broke owing seat2
      // Use dice that land on DB2 from seat1's position:
      // seat1 at 36 (CHANCE3), dice [2,1]=3 → 39 = DB2
      const patch2b = buildPatch({
        description: '', rules: [],
        players: [
          { cash: 0,    boardIndex: 10 },
          { cash: 1,    boardIndex: 36 },
          { cash: 1500, boardIndex: 20 },
        ],
        ownedProperties: { 2: ['DB1', 'DB2'] },
        propertyOverrides: { DB2: { hotelCount: 1 } },
        turn: { seat: 1, phase: 'WAITING_FOR_ROLL' },
        forcedDice: [2, 1],  // 36+3=39 = DB2, hotel rent = €2000
        expectedAfter: {},
      }, snap)
      await injectState(sid, patch2b)
      await sendCmd(sid, { type: 'RollDice', actorPlayerId: id1 })
      snap = await getSnapshot(sid)
      await sendCmd(sid, { type: 'DeclareBankruptcy', actorPlayerId: id1, debtId: snap.state!.activeDebt!.debtId })
      snap = await getSnapshot(sid)
      expect(snap.status).toBe('GAME_OVER')
      expect(snap.state?.winnerPlayerId).toBe(id2)
    } finally {
      await deleteSession(sid)
    }
  })
})

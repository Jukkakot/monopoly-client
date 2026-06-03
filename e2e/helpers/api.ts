import type { ClientSessionSnapshot } from '../../src/types/api'

const BASE = process.env.VITE_API_BASE ?? 'https://monopoly-backend-bv41.onrender.com'
const jsonHeaders = { 'Content-Type': 'application/json' }

export async function createBotSession(count: 2 | 3 | 4 = 2): Promise<string> {
  const r = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      names: ['A', 'B', 'C', 'D'].slice(0, count),
      seatKinds: Array(count).fill('BOT'),
      difficulties: Array(count).fill('STRONG'),
      colors: ['#e53935', '#1e88e5', '#43a047', '#f9a825'].slice(0, count),
    }),
  })
  if (!r.ok) throw new Error(`createSession failed: ${r.status}`)
  return (await r.json()).sessionId
}

export async function getSnapshot(sid: string): Promise<ClientSessionSnapshot> {
  const r = await fetch(`${BASE}/sessions/${sid}/snapshot`)
  if (!r.ok) throw new Error(`getSnapshot failed: ${r.status}`)
  return r.json()
}

export async function injectState(sid: string, patch: object): Promise<void> {
  const r = await fetch(`${BASE}/sessions/${sid}/debug/state`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify(patch),
  })
  if (!r.ok) throw new Error(`injectState failed: ${r.status}`)
  const data = await r.json()
  if (!data.applied) throw new Error('injectState: backend did not apply patch')
}

export interface CommandResult {
  accepted: boolean
  rejections: { code: string; message: string }[]
}

export async function sendCmdRaw(sid: string, cmd: object): Promise<CommandResult> {
  const r = await fetch(`${BASE}/sessions/${sid}/command`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(cmd),
  })
  // Backend returns 200 for accepted commands and 422 for rejected ones.
  // Both have a valid CommandResult body — only other status codes are hard errors.
  if (!r.ok && r.status !== 422) {
    const data = await r.json().catch(() => ({}))
    throw new Error(`sendCmd HTTP error: ${r.status} ${JSON.stringify(data)}`)
  }
  return r.json()
}

export async function sendCmd(sid: string, cmd: object): Promise<void> {
  const result = await sendCmdRaw(sid, cmd)
  if (!result.accepted) throw new Error(`Command not accepted: ${JSON.stringify(result)}`)
}

export async function setBotSpeed(sid: string, speed: 'fast' | 'normal' | 'slow'): Promise<void> {
  await fetch(`${BASE}/sessions/${sid}/settings`, {
    method: 'PUT',
    headers: jsonHeaders,
    body: JSON.stringify({ botSpeed: speed }),
  })
}

export async function retrigger(sid: string): Promise<void> {
  // hostToken '' works for bot-only sessions (validation skips when hostToken is null)
  await fetch(`${BASE}/sessions/${sid}/bot/retrigger`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ hostToken: '' }),
  })
}

export async function deleteSession(sid: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sid}`, { method: 'DELETE' })
}

export interface HumanSession {
  sid: string
  humanPlayerId: string
  humanPlayerToken: string
  hostToken: string
}

/**
 * Creates a 2-player session (1 human + 1 bot) via the lobby flow:
 *   POST /sessions (lobbyMode) → POST /sessions/{id}/lobby/bots → POST /sessions/{id}/lobby/ready
 *
 * The human player is at seat index 0.  Marking the human ready auto-starts the game
 * (backend starts when all humans are ready and total >= 2).
 * The returned playerToken must be stored in sessionStorage (`monopoly_token_${sid}`)
 * before navigating so that GameContext can send authorized commands on behalf of the human player.
 */
export async function createHumanBotSession(): Promise<HumanSession> {
  const r1 = await fetch(`${BASE}/sessions`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ lobbyMode: true, seatCount: 2 }),
  })
  if (!r1.ok) throw new Error(`createHumanBotSession: POST /sessions failed ${r1.status}`)
  const { sessionId: sid, hostToken, playerId: humanPlayerId, playerToken: humanPlayerToken } = await r1.json()

  // Add a bot (seat 1)
  const r2 = await fetch(`${BASE}/sessions/${sid}/lobby/bots`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ hostToken }),
  })
  if (!r2.ok) throw new Error(`createHumanBotSession: addBot failed ${r2.status}`)

  // Mark human as ready → backend auto-starts when all humans are ready
  const r3 = await fetch(`${BASE}/sessions/${sid}/lobby/ready`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ playerId: humanPlayerId, playerToken: humanPlayerToken, ready: true }),
  })
  if (!r3.ok) throw new Error(`createHumanBotSession: lobbyReady failed ${r3.status}`)

  return { sid, humanPlayerId, humanPlayerToken, hostToken }
}

export interface TwoHumanSession {
  sid: string
  p1: { playerId: string; playerToken: string }
  p2: { playerId: string; playerToken: string }
}

/**
 * Creates a 2-human session via the lobby flow (no bots):
 *   POST /sessions (lobbyMode) → POST /sessions/{id}/join → both mark ready → auto-start
 *
 * Seat indices are NOT guaranteed (p1 may be seat 0 or 1 — check snapshot).
 * Commands require playerToken in the body: { type, actorPlayerId, playerToken, ...rest }
 */
export async function createTwoHumanSession(): Promise<TwoHumanSession> {
  const r1 = await fetch(`${BASE}/sessions`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ lobbyMode: true, seatCount: 2 }),
  })
  if (!r1.ok) throw new Error(`createTwoHumanSession: POST /sessions failed ${r1.status}`)
  const { sessionId: sid, playerId: p1Id, playerToken: p1Token } = await r1.json()

  const r2 = await fetch(`${BASE}/sessions/${sid}/join`, {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({ name: 'Player2', color: '#1e88e5' }),
  })
  if (!r2.ok) throw new Error(`createTwoHumanSession: join failed ${r2.status}`)
  const { playerId: p2Id, playerToken: p2Token } = await r2.json()

  // Both mark ready — auto-starts when all humans are ready
  await Promise.all([
    fetch(`${BASE}/sessions/${sid}/lobby/ready`, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({ playerId: p1Id, playerToken: p1Token, ready: true }),
    }),
    fetch(`${BASE}/sessions/${sid}/lobby/ready`, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({ playerId: p2Id, playerToken: p2Token, ready: true }),
    }),
  ])

  return { sid, p1: { playerId: p1Id, playerToken: p1Token }, p2: { playerId: p2Id, playerToken: p2Token } }
}

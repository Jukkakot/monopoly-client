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

export async function sendCmd(sid: string, cmd: object): Promise<void> {
  const r = await fetch(`${BASE}/sessions/${sid}/command`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(cmd),
  })
  if (!r.ok) {
    const data = await r.json().catch(() => ({}))
    throw new Error(`sendCmd failed: ${r.status} ${JSON.stringify(data)}`)
  }
  const data = await r.json()
  if (!data.accepted) throw new Error(`Command not accepted: ${JSON.stringify(data)}`)
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

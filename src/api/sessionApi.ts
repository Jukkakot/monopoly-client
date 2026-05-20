import type { CreateSessionRequest, CommandResult, SessionSummary } from '../types/api'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

export async function createSession(req: CreateSessionRequest): Promise<string> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  const data = await res.json()
  return data.sessionId as string
}

export async function listSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${BASE}/sessions`)
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
}

export async function sendCommand(sessionId: string, command: object): Promise<CommandResult> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}`, { method: 'DELETE' })
}

export async function sessionExists(sessionId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/snapshot`)
  return res.ok
}

export async function joinLobby(sessionId: string, name: string, color?: string): Promise<{ playerId: string; seatId: string; tokenColorHex: string }> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
}

export async function startLobby(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/start`, { method: 'POST' })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
}

export function sseUrl(sessionId: string): string {
  return `${BASE}/sessions/${sessionId}/events`
}

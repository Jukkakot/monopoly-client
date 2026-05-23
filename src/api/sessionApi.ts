import type { CreateSessionRequest, CommandResult, SessionSummary } from '../types/api'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'

export async function createSession(req: CreateSessionRequest): Promise<{ sessionId: string; hostToken: string }> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
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

export async function createLobby(hostName: string, hostColor?: string): Promise<{
  sessionId: string
  hostToken: string
  playerId: string
  playerToken: string
}> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lobbyMode: true, hostName, hostColor }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
}

export async function joinLobby(sessionId: string, name: string, color?: string): Promise<{
  playerId: string
  seatId: string
  tokenColorHex: string
  playerToken: string
}> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
}

export async function addLobbyBot(sessionId: string, hostToken: string): Promise<{ seatId: string; name: string }> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/lobby/bots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostToken }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
}

export async function removeLobbyBot(sessionId: string, seatId: string, hostToken: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/lobby/bots/${seatId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostToken }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
}

export async function setLobbyReady(
  sessionId: string,
  playerId: string,
  playerToken: string,
  ready: boolean,
): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/lobby/ready`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, playerToken, ready }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
}

export function sseUrl(sessionId: string): string {
  return `${BASE}/sessions/${sessionId}/events`
}

export async function createBotsOnlySession(botCount: number): Promise<{ sessionId: string }> {
  const names = Array.from({ length: botCount }, (_, i) => `Botti ${i + 1}`)
  const seatKinds = Array(botCount).fill('BOT')
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names, seatKinds }),
  })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
  return res.json()
}

export async function startLobby(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/start`, { method: 'POST' })
  if (!res.ok) throw new Error(`Backend returned ${res.status}`)
}

export async function setBotSpeed(sessionId: string, speed: 'fast' | 'normal' | 'slow'): Promise<void> {
  await fetch(`${BASE}/sessions/${sessionId}/bot-speed`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed }),
  })
}

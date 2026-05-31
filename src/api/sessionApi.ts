import type { CreateSessionRequest, CommandResult, SessionSummary } from '../types/api'
import { logger } from '../utils/logger'
import { randomBotName } from '../utils/playerNames'
import { ALL_SHAPES, saveTokenShapes, type TokenShape } from '../utils/tokenShapes'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']

function pickDistinct<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const result: T[] = []
  for (let i = 0; i < count; i++) result.push(shuffled[i % shuffled.length])
  return result
}

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    logger.error('API request failed', { url, status: res.status, method: init?.method ?? 'GET' })
    throw new Error(`Backend returned ${res.status}`)
  }
  return res.json()
}

export async function createSession(req: CreateSessionRequest): Promise<{ sessionId: string; hostToken: string }> {
  return fetchJson(`${BASE}/sessions`, { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(req) })
}

export async function listSessions(): Promise<SessionSummary[]> {
  return fetchJson(`${BASE}/sessions`)
}

export async function sendCommand(sessionId: string, command: object): Promise<CommandResult> {
  return fetchJson(`${BASE}/sessions/${sessionId}/command`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(command),
  })
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
  return fetchJson(`${BASE}/sessions`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ lobbyMode: true, hostName, hostColor }),
  })
}

export class LobbyJoinError extends Error {
  readonly code: string
  constructor(code: string, message: string) { super(message); this.code = code }
}

export async function joinLobby(sessionId: string, name: string, color?: string): Promise<{
  playerId: string
  seatId: string
  tokenColorHex: string
  playerToken: string
}> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/join`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ name, color }),
  })
  if (!res.ok) {
    const body: { error?: string; message?: string } = await res.json().catch(() => ({}))
    logger.error('API request failed', { url: `/sessions/${sessionId}/join`, status: res.status, method: 'POST' })
    throw new LobbyJoinError(body.error ?? 'unknown', body.message ?? `Backend returned ${res.status}`)
  }
  return res.json()
}

export async function addLobbyBot(sessionId: string, hostToken: string): Promise<{ seatId: string; name: string }> {
  return fetchJson(`${BASE}/sessions/${sessionId}/lobby/bots`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ hostToken }),
  })
}

export async function removeLobbyBot(sessionId: string, seatId: string, hostToken: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/lobby/bots/${seatId}`, {
    method: 'DELETE', headers: JSON_HEADERS, body: JSON.stringify({ hostToken }),
  })
  if (!res.ok) {
    logger.error('API request failed', { url: `/lobby/bots/${seatId}`, status: res.status, method: 'DELETE' })
    throw new Error(`Backend returned ${res.status}`)
  }
}

export async function setLobbyReady(
  sessionId: string,
  playerId: string,
  playerToken: string,
  ready: boolean,
): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/lobby/ready`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ playerId, playerToken, ready }),
  })
  if (!res.ok) {
    logger.error('API request failed', { url: '/lobby/ready', status: res.status, method: 'POST' })
    throw new Error(`Backend returned ${res.status}`)
  }
}

export function sseUrl(sessionId: string): string {
  return `${BASE}/sessions/${sessionId}/events`
}

export async function createBotsOnlySession(botCount: number): Promise<{ sessionId: string }> {
  const usedNames: string[] = []
  const names = Array.from({ length: botCount }, () => {
    const name = randomBotName(usedNames)
    usedNames.push(name)
    return name
  })
  const colors = pickDistinct(PRESET_COLORS, botCount)
  const shapes = pickDistinct(ALL_SHAPES.map(s => s.key) as TokenShape[], botCount)
  const seatKinds = Array(botCount).fill('BOT')
  const difficulties = Array(botCount).fill('STRONG')
  const result = await fetchJson<{ sessionId: string }>(`${BASE}/sessions`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ names, colors, seatKinds, difficulties }),
  })
  saveTokenShapes(result.sessionId, shapes)
  return result
}

export async function startLobby(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/start`, { method: 'POST' })
  if (!res.ok) {
    logger.error('API request failed', { url: `/sessions/${sessionId}/start`, status: res.status, method: 'POST' })
    throw new Error(`Backend returned ${res.status}`)
  }
}

export interface SessionSettings {
  botSpeed?: 'fast' | 'normal' | 'slow'
}

export async function retriggerBot(sessionId: string): Promise<void> {
  const hostToken = (() => { try { return localStorage.getItem(`monopoly_host_${sessionId}`) ?? '' } catch { return '' } })()
  await fetch(`${BASE}/sessions/${sessionId}/bot/retrigger`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ hostToken }),
  })
}

export async function applySessionSettings(sessionId: string, settings: SessionSettings): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/settings`, {
    method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(settings),
  })
  if (!res.ok && res.status !== 404) {
    logger.error('API request failed', { url: `/sessions/${sessionId}/settings`, status: res.status, method: 'PUT' })
  }
}

import type { CreateSessionRequest, CommandResult, SessionSummary, SessionState, ClientSessionSnapshot } from '../types/api'
import { logger } from '../utils/logger'
import { randomBotName } from '../utils/playerNames'
import { ALL_SHAPES, saveTokenShapes, type TokenShape } from '../utils/tokenShapes'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']

function pickDistinct<T>(pool: T[], count: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

export class ApiError extends Error {
  readonly status: number
  readonly code: string | null
  constructor(status: number, code: string | null, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

/** The backend this client is currently pointed at (for display). */
export const BACKEND_BASE = BASE

export interface BackendVersion {
  version: string
  /** ISO-8601 UTC timestamp of when the backend jar was built. */
  buildTime: string
}

/** Fetches the connected backend's build info (version + build time). */
export async function getBackendVersion(): Promise<BackendVersion> {
  return fetchJson<BackendVersion>(`${BASE}/version`)
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    let code: string | null = null
    try { code = (await res.json()).error ?? null } catch {}
    logger.error('API request failed', { url, status: res.status, code, method: init?.method ?? 'GET' })
    throw new ApiError(res.status, code, `Backend returned ${res.status}`)
  }
  return res.json()
}

export async function createSession(req: CreateSessionRequest): Promise<{ sessionId: string; hostToken: string; playerId?: string; playerToken?: string }> {
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

export async function createLobby(hostName: string, hostColor?: string, initialBots = 0): Promise<{
  sessionId: string
  hostToken: string
  playerId: string
  playerToken: string
}> {
  // initialBots seats the bot opponents atomically in the create call, so the waiting
  // room is fully populated the moment it opens (no per-bot round-trips that trickle in).
  return fetchJson(`${BASE}/sessions`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ lobbyMode: true, hostName, hostColor, initialBots }),
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
  const result = await fetchJson<{ sessionId: string }>(`${BASE}/sessions`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ names, colors, seatKinds }),
  })
  saveTokenShapes(result.sessionId, shapes)
  return result
}

export interface SessionSettings {
  botSpeed?: 'fast' | 'normal' | 'slow'
}

// Throttle state for sendAck — at most one HTTP request per 50 ms, always reporting the latest version.
let _ackPendingVersion = -1
let _ackSessionId = ''
let _ackTimer: ReturnType<typeof setTimeout> | null = null

/** Fire-and-forget: tell the backend which snapshot version the client has processed.
 *  The backend uses this to pace bot games so it doesn't run too far ahead.
 *  Throttled to one request per 50 ms to avoid spamming the server during fast bot games. */
export function sendAck(sessionId: string, version: number): void {
  if (sessionId !== _ackSessionId) {
    if (_ackTimer !== null) { clearTimeout(_ackTimer); _ackTimer = null }
    _ackPendingVersion = -1
    _ackSessionId = sessionId
  }
  if (version <= _ackPendingVersion) return
  _ackPendingVersion = version
  if (_ackTimer !== null) return
  _ackTimer = setTimeout(() => {
    _ackTimer = null
    const v = _ackPendingVersion
    fetch(`${BASE}/sessions/${_ackSessionId}/ack`, {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ version: v }),
    }).catch(() => {})
  }, 50)
}

export async function retriggerBot(sessionId: string): Promise<void> {
  // The backend accepts either a host token or any seated player's token —
  // send whatever this browser has so non-host players can also unstick a bot.
  const hostToken = (() => { try { return localStorage.getItem(`monopoly_host_${sessionId}`) ?? '' } catch { return '' } })()
  const playerId = (() => { try { return sessionStorage.getItem(`monopoly_player_${sessionId}`) ?? undefined } catch { return undefined } })()
  const playerToken = (() => { try { return sessionStorage.getItem(`monopoly_token_${sessionId}`) ?? undefined } catch { return undefined } })()
  await fetch(`${BASE}/sessions/${sessionId}/bot/retrigger`, {
    method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ hostToken, playerId, playerToken }),
  })
}

/** Fetches the current snapshot for a session. Returns null if session not found. */
export async function fetchSnapshot(sessionId: string): Promise<SessionState | null> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/snapshot`)
  if (!res.ok) return null
  const snap: ClientSessionSnapshot = await res.json()
  return snap.state ?? null
}

export interface DebugStateImport {
  players?: Array<{
    playerId: string
    cash?: number
    boardIndex?: number
    inJail?: boolean
    bankrupt?: boolean
    getOutOfJailCards?: number
    ownedPropertyIds?: string[]
  }>
  properties?: Array<{
    propertyId: string
    ownerPlayerId?: string    // empty string = clear owner
    mortgaged?: boolean
    houseCount?: number
    hotelCount?: number
  }>
  turn?: {
    activePlayerId?: string
    phase?: string
    consecutiveDoubles?: number
    lastDice?: [number, number] | null
  }
  clearDebt?: boolean
  clearDecision?: boolean
  clearAuction?: boolean
  clearTrade?: boolean
  nextDice?: [number, number]
  nextChanceCard?: string   // card key without bundle prefix, e.g. "GO_JAIL:0"
  nextCommunityCard?: string
}

export async function importDebugState(sessionId: string, patch: DebugStateImport): Promise<{ applied: boolean }> {
  return fetchJson(`${BASE}/sessions/${sessionId}/debug/state`, {
    method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(patch),
  })
}

/** The curated emoji set the backend accepts as reactions (mirrors SessionRegistry.ALLOWED_REACTIONS). */
export const REACTION_EMOJIS = ['👍', '😂', '😮', '😢', '😡', '🎉', '🔥', '💰', '🎲', '🤝', '😎', '🍀', '👏', '🤔', '😅', '💀'] as const

/** Maximum chat message length the backend accepts (mirrors SessionRegistry.MAX_CHAT_LEN). */
export const MAX_CHAT_LEN = 200

/** Posts a chat message or emoji reaction. Fire-and-forget: it lands back via the SSE event log.
 *  `replyToId` attaches a reaction to a specific earlier CHAT event (rendered under that message
 *  instead of floating). Returns true if the backend accepted it. */
export async function postChat(
  sessionId: string,
  playerId: string,
  playerToken: string,
  kind: 'MESSAGE' | 'REACTION',
  content: string,
  replyToId?: number,
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/sessions/${sessionId}/chat`, {
      method: 'POST', headers: JSON_HEADERS,
      body: JSON.stringify({ playerId, playerToken, kind, content, replyToId }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function applySessionSettings(sessionId: string, settings: SessionSettings): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}/settings`, {
    method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(settings),
  })
  if (!res.ok && res.status !== 404) {
    logger.error('API request failed', { url: `/sessions/${sessionId}/settings`, status: res.status, method: 'PUT' })
  }
}

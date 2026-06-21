import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import type { SessionState, ClientSessionSnapshot, PlayerSnapshot, PropertyStateSnapshot } from '../types/api'
import { logger } from '../utils/logger'
import { sendCommand, sseUrl, applySessionSettings, sendAck } from '../api/sessionApi'
import { loadBotSpeed } from '../utils/animationSettings'
import { useEffect, useRef } from 'react'
import { translateBackendEvents, deriveMiscEvents, type GameEvent } from './events'
import {
  playTokenMove, playBuyProperty, playBuildHouse, playBuildHotel,
  playGoToJail, playReleaseJail, playDrawCard, playBankruptcy,
  playGameOver, playTradeAccepted, playMortgage, playPassGo, playPayRent, playAuctionWin, playDiceRoll,
} from '../utils/sounds'
import { calcNetWorth } from '../utils/netWorth'
import { getLang } from '../i18n/lang'
import { translations } from '../i18n/translations'
import { isAnyPlayerAnimating, onAnimationIdle } from '../hooks/useTokenAnimation'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

// Structural sharing: reuse object references for unchanged snapshot sub-objects so that
// React.memo'd children can bail out of re-rendering when their data didn't change.
function mergePlayer(old: PlayerSnapshot, next: PlayerSnapshot): PlayerSnapshot {
  if (
    old.name === next.name &&
    old.seatId === next.seatId &&
    old.cash === next.cash &&
    old.boardIndex === next.boardIndex &&
    old.bankrupt === next.bankrupt &&
    old.eliminated === next.eliminated &&
    old.inJail === next.inJail &&
    old.jailRoundsRemaining === next.jailRoundsRemaining &&
    old.getOutOfJailCards === next.getOutOfJailCards &&
    old.ownedPropertyIds.length === next.ownedPropertyIds.length &&
    old.ownedPropertyIds.every((id, i) => id === next.ownedPropertyIds[i])
  ) return old
  return next
}

function mergeProperty(old: PropertyStateSnapshot, next: PropertyStateSnapshot): PropertyStateSnapshot {
  if (
    old.ownerPlayerId === next.ownerPlayerId &&
    old.mortgaged === next.mortgaged &&
    old.houseCount === next.houseCount &&
    old.hotelCount === next.hotelCount
  ) return old
  return next
}

function mergeSnapshot(prev: SessionState | null, next: SessionState): SessionState {
  if (!prev) return next
  let playersChanged = prev.players.length !== next.players.length
  const prevPlayerMap = new Map(prev.players.map(p => [p.playerId, p]))
  const players = next.players.map(p => {
    const old = prevPlayerMap.get(p.playerId)
    if (!old) { playersChanged = true; return p }
    const merged = mergePlayer(old, p)
    if (merged !== old) playersChanged = true
    return merged
  })

  let propsChanged = prev.properties.length !== next.properties.length
  const prevPropMap = new Map(prev.properties.map(p => [p.propertyId, p]))
  const properties = next.properties.map(p => {
    const old = prevPropMap.get(p.propertyId)
    if (!old) { propsChanged = true; return p }
    const merged = mergeProperty(old, p)
    if (merged !== old) propsChanged = true
    return merged
  })

  return {
    ...next,
    players: playersChanged ? players : prev.players,
    properties: propsChanged ? properties : prev.properties,
  }
}

interface GameState {
  sessionId: string | null
  snapshot: SessionState | null
  prevSnapshot: SessionState | null
  version: number
  connectionStatus: ConnectionStatus
  reconnectAttempts: number  // how many consecutive SSE reconnect attempts since last success
  events: GameEvent[]
  myPlayerId: string | null
  lastDice: [number, number] | null
  diceHistory: [number, number][]
  commandError: string | null
  turnCount: number
  netWorthHistory: Map<string, number[]>
  lastSeenEventId: number
  sseFrozen: boolean
  lastDiceEventId: number  // backend event id of the most recent DICE_ROLLED event; drives animation
  firstSnapshotAt: number | null  // timestamp of initial snapshot; events within 2s are marked historical
  duplicateClient: boolean  // true when another tab is controlling the same player
}

type Action =
  | { type: 'SET_SESSION'; sessionId: string }
  | { type: 'LEAVE_SESSION' }
  | { type: 'SET_SNAPSHOT'; snapshot: ClientSessionSnapshot }
  | { type: 'SET_CONNECTION'; status: ConnectionStatus }
  | { type: 'SET_RECONNECT_ATTEMPTS'; count: number }
  | { type: 'SET_COMMAND_ERROR'; message: string | null }
  | { type: 'SET_SSE_FROZEN'; frozen: boolean }
  | { type: 'INJECT_DEBUG_SNAPSHOT'; snapshot: SessionState }
  | { type: 'SET_DUPLICATE_CLIENT'; duplicate: boolean }

function resolveMyPlayerId(snapshot: SessionState, sessionId: string | null, existing: string | null = null): string | null {
  if (sessionId) {
    try {
      const stored = sessionStorage.getItem(`monopoly_player_${sessionId}`)
      if (stored) return stored
    } catch { }
    // sessionStorage empty (tab was closed) — try to find a token in localStorage
    try {
      const humanSeats = snapshot.seats.filter(s => s.seatKind === 'HUMAN')
      for (const seat of humanSeats) {
        const token = localStorage.getItem(`monopoly_token_${sessionId}_${seat.playerId}`)
        if (token) {
          // Restore sessionStorage so subsequent calls are fast
          sessionStorage.setItem(`monopoly_player_${sessionId}`, seat.playerId)
          sessionStorage.setItem(`monopoly_token_${sessionId}`, token)
          return seat.playerId
        }
      }
    } catch { }
  }
  // No localStorage entry → dynamic mode: follow whoever needs to act right now.
  // This lets solo testers control all players when starting via "Aloita peli".
  // During an active auction, follow the auction's current actor (not the main-turn player).
  if (snapshot.auctionState?.status === 'ACTIVE') {
    const auctionActorId = snapshot.auctionState.currentActorPlayerId
    if (auctionActorId) {
      const seat = snapshot.seats.find(s => s.playerId === auctionActorId && s.seatKind === 'HUMAN')
      if (seat) return auctionActorId
    }
  }
  const activeId = snapshot.turn?.activePlayerId
  if (activeId) {
    const activeSeat = snapshot.seats.find(s => s.playerId === activeId && s.seatKind === 'HUMAN')
    if (activeSeat) return activeId
  }
  return existing ?? (snapshot.seats.find(s => s.seatKind === 'HUMAN')?.playerId ?? null)
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_SESSION':
      if (state.sessionId === action.sessionId) return state  // already joined, don't reset
      return {
        ...state,
        sessionId: action.sessionId,
        snapshot: null,
        prevSnapshot: null,
        version: 0,
        connectionStatus: 'CONNECTING',
        reconnectAttempts: 0,
        events: [],
        myPlayerId: null,
        lastDice: null,
        diceHistory: [],
        commandError: null,
        turnCount: 0,
        netWorthHistory: new Map(),
        lastSeenEventId: -1,
        sseFrozen: false,
        lastDiceEventId: -1,
        firstSnapshotAt: null,
        duplicateClient: false,
      }
    case 'SET_SNAPSHOT': {
      const newSnapshot = action.snapshot.state

      // Translate backend-persisted events (new entries only) + derive misc events from state diff
      let newEvents: GameEvent[] = []
      let lastSeenEventId = state.lastSeenEventId
      let firstSnapshotAt = state.firstSnapshotAt
      const INITIAL_SYNC_GRACE_MS = 2000
      if (newSnapshot) {
        const backendLog = newSnapshot.eventLog ?? []
        if (state.snapshot === null) {
          // First snapshot after connect/refresh: mark all existing log entries as historical
          // so they appear in the event log without triggering sounds or notifications.
          firstSnapshotAt = Date.now()
          if (backendLog.length > 0) {
            lastSeenEventId = Math.max(...backendLog.map(e => e.id))
            newEvents.push(...translateBackendEvents(backendLog, newSnapshot.players)
              .map(e => ({ ...e, historical: true, releaseAt: undefined })))
          }
        } else {
          // Mark events as historical during the initial sync grace window to avoid
          // notification spam when bots play several turns while the client reconnects.
          const inGracePeriod = firstSnapshotAt !== null && (Date.now() - firstSnapshotAt) < INITIAL_SYNC_GRACE_MS
          const newEntries = backendLog.filter(e => e.id > lastSeenEventId)
          if (newEntries.length > 0) {
            lastSeenEventId = Math.max(...newEntries.map(e => e.id))
            const translated = translateBackendEvents(newEntries, newSnapshot.players)
            newEvents.push(...inGracePeriod
              ? translated.map(e => ({ ...e, historical: true, releaseAt: undefined }))
              : translated)
          }
          const miscEvents = deriveMiscEvents(state.snapshot, newSnapshot)
          newEvents.push(...inGracePeriod
            ? miscEvents.map(e => ({ ...e, historical: true }))
            : miscEvents)
        }
      }

      const mergedSnapshot = newSnapshot ? mergeSnapshot(state.snapshot, newSnapshot) : null

      const myPlayerId = mergedSnapshot ? resolveMyPlayerId(mergedSnapshot, state.sessionId, state.myPlayerId) : state.myPlayerId

      // Read dice directly from backend TurnState
      const lastDice = mergedSnapshot?.turn?.lastDice ?? state.lastDice

      const diceHistory = lastDice && lastDice !== state.lastDice
        ? [...state.diceHistory, lastDice].slice(-10)
        : state.diceHistory

      // Track the backend event id of the latest DICE_ROLLED event (non-historical only).
      // Board.tsx uses this — not dice VALUES — to trigger the roll animation so that the
      // same dice combination in different turns still fires a fresh animation.
      let lastDiceEventId = state.lastDiceEventId
      if (newSnapshot && state.snapshot !== null) {
        const backendLog = newSnapshot.eventLog ?? []
        const newEntries = backendLog.filter(e => e.id > state.lastSeenEventId)
        const diceEntries = newEntries.filter(e => e.type === 'DICE_ROLLED')
        if (diceEntries.length > 0) {
          lastDiceEventId = Math.max(...diceEntries.map(e => e.id))
        }
      }

      // Count turns: a turn completes when consecutiveDoubles resets to 0 and the active player changes
      let turnCount = state.turnCount
      if (mergedSnapshot && state.snapshot) {
        const prevActiveId = state.snapshot.turn?.activePlayerId
        const nextActiveId = mergedSnapshot.turn?.activePlayerId
        if (prevActiveId && nextActiveId && prevActiveId !== nextActiveId) {
          turnCount++
        }
      }

      // Track net worth history per player (sample every turn change)
      let netWorthHistory = state.netWorthHistory
      if (mergedSnapshot && state.snapshot && turnCount !== state.turnCount) {
        const newHistory = new Map(netWorthHistory)
        for (const player of mergedSnapshot.players) {
          if (player.bankrupt || player.eliminated) continue
          const worth = calcNetWorth(player, mergedSnapshot)
          const prev = newHistory.get(player.playerId) ?? []
          newHistory.set(player.playerId, [...prev, worth].slice(-30))
        }
        netWorthHistory = newHistory
      }

      return {
        ...state,
        prevSnapshot: state.snapshot,
        snapshot: mergedSnapshot,
        version: action.snapshot.version,
        connectionStatus: 'LIVE',
        reconnectAttempts: 0,
        events: mergedSnapshot
          ? (newEvents.length > 0 ? [...state.events, ...newEvents].slice(-500) : state.events)
          : state.events,
        myPlayerId,
        lastDice,
        diceHistory,
        turnCount,
        netWorthHistory,
        lastSeenEventId,
        lastDiceEventId,
        firstSnapshotAt,
      }
    }
    case 'LEAVE_SESSION':
      return {
        ...state,
        sessionId: null,
        snapshot: null,
        version: 0,
        reconnectAttempts: 0,
        events: [],
        myPlayerId: null,
        lastDice: null,
        diceHistory: [],
        turnCount: 0,
        netWorthHistory: new Map(),
        lastSeenEventId: -1,
        lastDiceEventId: -1,
        firstSnapshotAt: null,
        duplicateClient: false,
      }
    case 'SET_CONNECTION':
      return { ...state, connectionStatus: action.status }
    case 'SET_RECONNECT_ATTEMPTS':
      return { ...state, reconnectAttempts: action.count }
    case 'SET_COMMAND_ERROR':
      return { ...state, commandError: action.message }
    case 'SET_SSE_FROZEN':
      return { ...state, sseFrozen: action.frozen }
    case 'INJECT_DEBUG_SNAPSHOT':
      return { ...state, snapshot: action.snapshot, prevSnapshot: state.snapshot }
    case 'SET_DUPLICATE_CLIENT':
      return { ...state, duplicateClient: action.duplicate }
    default:
      return state
  }
}

interface GameContextValue {
  state: GameState
  joinSession: (sessionId: string) => void
  leaveSession: () => void
  sendCmd: (command: object) => Promise<void>
  freezeSSE: () => void
  unfreezeSSE: () => void
  retryConnection: () => void
  injectDebugSnapshot: (snapshot: SessionState) => void
  reactivateTab: () => void
}

// Commands that are safe to fire rapidly (idempotent replace operations or continuous adjustments)
const FAST_DEDUP_CMDS = new Set(['EditTradeOffer', 'BuyBuildingRound', 'SellBuildingRound'])

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sessionId: null,
    snapshot: null,
    prevSnapshot: null,
    version: 0,
    connectionStatus: 'CONNECTING',
    reconnectAttempts: 0,
    events: [],
    myPlayerId: null,
    lastDice: null,
    diceHistory: [],
    commandError: null,
    turnCount: 0,
    netWorthHistory: new Map(),
    lastSeenEventId: -1,
    sseFrozen: false,
    lastDiceEventId: -1,
    firstSnapshotAt: null,
    duplicateClient: false,
  })

  const retryCount = useRef(0)
  const esRef = useRef<EventSource | null>(null)
  const versionRef = useRef(0)
  const lastSoundedId = useRef(-1)
  const sseTimings = useRef<Array<{ timestamp: number; version: number; delayMs?: number }>>([])
  const lastEventTimestamp = useRef<number | null>(null)
  const pendingSnapshots = useRef<ClientSessionSnapshot[]>([])
  const prevPhaseRef = useRef<string | undefined>(undefined)
  // Briefly true after any direct dispatch — blocks incoming SSE snaps from bypassing the queue
  // before the animation useEffect has had a chance to set isAnyPlayerAnimating().
  const settlingRef = useRef(false)
  // Always points to latest closure — updated each render so refs and dispatch are fresh
  const drainPendingRef = useRef<() => void>(null!)
  drainPendingRef.current = () => {
    if (isAnyPlayerAnimating()) return
    const next = pendingSnapshots.current.shift()
    if (!next) return
    // Discard stale snapshots belonging to a previous session
    if (next.state?.sessionId && next.state.sessionId !== state.sessionId) {
      pendingSnapshots.current = []
      return
    }
    settlingRef.current = true
    dispatch({ type: 'SET_SNAPSHOT', snapshot: next })
    if (state.sessionId) sendAck(state.sessionId, next.version)
    // After a yield, check if this snapshot started an animation.
    // If not, immediately drain the next one.
    setTimeout(() => {
      settlingRef.current = false
      if (!isAnyPlayerAnimating()) drainPendingRef.current()
    }, 60)
  }

  // Drain snapshot queue when all movement animations finish
  useEffect(() => {
    return onAnimationIdle(() => drainPendingRef.current())
  }, [])

  // Safety net: if pendingSnapshots accumulates and neither the 60ms settling timer nor
  // onAnimationIdle drains it (e.g. a brief animation ends before items were queued),
  // force-drain every 500ms. This handles edge cases that would otherwise leave the
  // trade / auction UI stuck until the next animation or page refresh.
  useEffect(() => {
    const id = setInterval(() => {
      if (pendingSnapshots.current.length > 0 && !isAnyPlayerAnimating() && !settlingRef.current) {
        drainPendingRef.current()
      }
    }, 500)
    return () => clearInterval(id)
  }, [])

  // Clear pending queue on session change or disconnect
  useEffect(() => {
    pendingSnapshots.current = []
  }, [state.sessionId])

  // Play sounds in sync with event log visibility (respects releaseAt animation delay)
  useEffect(() => {
    const newEvents = state.events.filter(e => e.id > lastSoundedId.current && !e.historical)
    const allNew = state.events.filter(e => e.id > lastSoundedId.current)
    if (allNew.length > 0) lastSoundedId.current = Math.max(...allNew.map(e => e.id))
    if (newEvents.length === 0) return
    const now = Date.now()
    const timers: ReturnType<typeof setTimeout>[] = []
    for (const e of newEvents) {
      const delay = e.releaseAt ? Math.max(0, e.releaseAt - now) : 0
      timers.push(setTimeout(() => {
        switch (e.soundKey) {
          case 'DICE_ROLLED': playDiceRoll(); break
          case 'PLAYER_MOVED': playTokenMove(); break
          case 'BOUGHT_PROPERTY': playBuyProperty(); break
          case 'BUILT_HOUSE': playBuildHouse(); break
          case 'BUILT_HOTEL': playBuildHotel(); break
          case 'WENT_TO_JAIL': playGoToJail(); break
          case 'RELEASED_FROM_JAIL': playReleaseJail(); break
          case 'DREW_CARD': playDrawCard(); break
          case 'WENT_BANKRUPT': playBankruptcy(); break
          case 'GAME_OVER': playGameOver(); break
          case 'TRADE_ACCEPTED': playTradeAccepted(); break
          case 'MORTGAGED': playMortgage(); break
          case 'REDEEMED': playMortgage(); break
          case 'PASSED_GO': playPassGo(); break
          case 'PAID_RENT': playPayRent(); break
          case 'AUCTION_WON': playAuctionWin(); break
        }
      }, delay))
    }
    return () => timers.forEach(clearTimeout)
  }, [state.events])

  const joinSession = useCallback((sessionId: string) => {
    // Clear queue and stale refs synchronously before the new session starts —
    // prevents 60ms drain timers from dispatching old snapshots into the new session.
    pendingSnapshots.current = []
    settlingRef.current = false
    lastSoundedId.current = -1
    prevPhaseRef.current = undefined
    lastEventTimestamp.current = null
    dispatch({ type: 'SET_SESSION', sessionId })
    retryCount.current = 0
    versionRef.current = 0
    try { localStorage.setItem('monopoly_last_session', sessionId) } catch { /* ignore */ }
    const botSpeed = loadBotSpeed()
    applySessionSettings(sessionId, { botSpeed })
      .then(() => console.debug('[settings] botSpeed sent:', botSpeed))
      .catch(e => console.warn('[settings] failed to send botSpeed:', e))
  }, [])
  const leaveSession = useCallback(() => {
    pendingSnapshots.current = []
    settlingRef.current = false
    dispatch({ type: 'LEAVE_SESSION' })
    retryCount.current = 0
    versionRef.current = 0
  }, [])
  useEffect(() => {
    window.exportSSETimings = () => {
      const data = sseTimings.current.map(t => ({
        delay: t.delayMs?.toFixed(0) ?? 'initial',
        version: t.version,
      }))
      const json = JSON.stringify(data, null, 2)
      console.log('📊 SSE Timings:', json)
      return json
    }
  }, [])

  const freezeSSE = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    dispatch({ type: 'SET_SSE_FROZEN', frozen: true })
  }, [])

  const unfreezeSSE = useCallback(() => {
    dispatch({ type: 'SET_SSE_FROZEN', frozen: false })
  }, [])

  const retryConnection = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    retryCount.current = 0
    dispatch({ type: 'SET_RECONNECT_ATTEMPTS', count: 0 })
    // Reset connection state — the SSE useEffect will re-run because connectionStatus changed,
    // but we need sseFrozen to toggle to actually re-trigger the effect dependency list.
    // Use freeze/unfreeze cycle: freeze dispatches synchronously, then unfreeze triggers reconnect.
    dispatch({ type: 'SET_SSE_FROZEN', frozen: true })
    // Unfreeze after a tick — the SSE effect cleanup will run then reconnect.
    setTimeout(() => dispatch({ type: 'SET_SSE_FROZEN', frozen: false }), 0)
  }, [])

  const injectDebugSnapshot = useCallback((snapshot: SessionState) => {
    dispatch({ type: 'INJECT_DEBUG_SNAPSHOT', snapshot })
  }, [])

  // ── Duplicate-tab detection via BroadcastChannel ─────────────────────────────
  // Each tab has a unique tabId. When a tab becomes active for a (sessionId, playerId)
  // pair, it announces itself. Any other tab that sees the announcement and has the same
  // credentials marks itself as a duplicate and stops sending commands.
  const tabIdRef = useRef<string>(null!)
  if (!tabIdRef.current) {
    let id: string
    try { id = sessionStorage.getItem('monopoly_tab_id') ?? crypto.randomUUID() } catch { id = Math.random().toString(36).slice(2) }
    tabIdRef.current = id
    try { sessionStorage.setItem('monopoly_tab_id', id) } catch { /* ignore */ }
  }
  const bcRef = useRef<BroadcastChannel | null>(null)

  const reactivateTab = useCallback(() => {
    dispatch({ type: 'SET_DUPLICATE_CLIENT', duplicate: false })
    // Re-announce so the other tab becomes the duplicate
    if (bcRef.current && state.sessionId && state.myPlayerId) {
      bcRef.current.postMessage({ type: 'TAB_ACTIVE', tabId: tabIdRef.current, sessionId: state.sessionId, playerId: state.myPlayerId })
    }
  }, [state.sessionId, state.myPlayerId])

  useEffect(() => {
    if (!state.sessionId || !state.myPlayerId) return
    if (typeof BroadcastChannel === 'undefined') return
    const channelName = `monopoly-tab-${state.sessionId}-${state.myPlayerId}`
    const bc = new BroadcastChannel(channelName)
    bcRef.current = bc
    // Announce this tab as active
    bc.postMessage({ type: 'TAB_ACTIVE', tabId: tabIdRef.current, sessionId: state.sessionId, playerId: state.myPlayerId })
    bc.onmessage = (e) => {
      if (e.data?.type === 'TAB_ACTIVE' && e.data.tabId !== tabIdRef.current) {
        // Another tab announced itself for the same player — we are now the duplicate
        dispatch({ type: 'SET_DUPLICATE_CLIENT', duplicate: true })
      }
    }
    return () => {
      bc.close()
      bcRef.current = null
    }
  }, [state.sessionId, state.myPlayerId])

  const lastCmdTimeRef = useRef(new Map<string, number>())

  const sendCmd = useCallback(async (command: object) => {
    if (!state.sessionId) return
    if (state.duplicateClient) return  // blocked: another tab is controlling this player
    const cmdType = (command as { type?: string }).type ?? 'unknown'
    const now = Date.now()
    const dedupeMs = FAST_DEDUP_CMDS.has(cmdType) ? 100 : 600
    if (now - (lastCmdTimeRef.current.get(cmdType) ?? 0) < dedupeMs) return
    // Record timestamp to block duplicate clicks while the request is in-flight.
    // Cleared on rejection or error so the user can retry immediately.
    lastCmdTimeRef.current.set(cmdType, now)
    try {
      const sid = state.sessionId
      const playerToken = sessionStorage.getItem(`monopoly_token_${sid}`) ?? undefined
      const hostToken = cmdType === 'AbortGame'
        ? (localStorage.getItem(`monopoly_host_${sid}`) ?? undefined)
        : undefined
      const enriched = { ...command, ...(playerToken ? { playerToken } : {}), ...(hostToken ? { hostToken } : {}) }
      const result = await sendCommand(sid, enriched)
      if (result.accepted) {
        logger.info('cmd', { type: cmdType, sessionId: sid })
      } else if (result.rejections.length > 0) {
        // Rejection: allow immediate retry
        lastCmdTimeRef.current.delete(cmdType)
        // Log rejection for debugging — these should not happen during normal play
        // (the UI should prevent sending invalid commands in the first place)
        const codes = result.rejections.map(r => r.code).join(', ')
        const msgs = result.rejections.map(r => r.message).join(' · ')
        logger.warn('Command rejected by backend', { codes, command: (command as { type?: string }).type })
        window.__monopolyErrorLog?.push(`REJECTED [${codes}]: ${msgs}`)
        // Only show user-visible error for explicit user-facing rejection messages,
        // not for race-condition rejections that the UI should have prevented.
        const userFacing = ['INSUFFICIENT_FUNDS', 'BUILDINGS_PRESENT', 'MORTGAGE_TOGGLE_FAILED', 'BANK_SUPPLY_EXHAUSTED']
        const userFacingRejection = result.rejections.find(r => userFacing.includes(r.code))
        if (userFacingRejection) {
          const t = translations[getLang()]
          const translatedMsg: Record<string, string> = {
            INSUFFICIENT_FUNDS: t.insufficientFunds,
            BANK_SUPPLY_EXHAUSTED: t.bankSupplyExhausted,
          }
          const msg = translatedMsg[userFacingRejection.code] ?? msgs
          dispatch({ type: 'SET_COMMAND_ERROR', message: msg })
          setTimeout(() => dispatch({ type: 'SET_COMMAND_ERROR', message: null }), 4000)
        }
      }
    } catch (err) {
      // Network error: allow immediate retry
      lastCmdTimeRef.current.delete(cmdType)
      dispatch({ type: 'SET_COMMAND_ERROR', message: translations[getLang()].commandErrorMsg })
      setTimeout(() => dispatch({ type: 'SET_COMMAND_ERROR', message: null }), 4000)
      window.__monopolyErrorLog?.push(`NETWORK_ERROR: ${String(err)}`)
    }
  }, [state.sessionId, state.duplicateClient])

  useEffect(() => {
    if (!state.sessionId || state.sseFrozen) return
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    // Counts how many times the connection closed within 400ms of opening (indicates 404 / session gone)
    let quickFailCount = 0

    function connect() {
      if (cancelled) return
      dispatch({ type: 'SET_CONNECTION', status: retryCount.current === 0 ? 'CONNECTING' : 'RECONNECTING' })

      const url = sseUrl(state.sessionId!)
      const es = new EventSource(versionRef.current > 0 ? `${url}?lastEventId=${versionRef.current}` : url)
      esRef.current = es
      const connectTime = Date.now()

      // Guard: if no SSE message arrives within 8s the initial snapshot was silently
      // dropped by the backend (race between keepAlive setup and first sendEvent).
      // Reset version and reconnect so the backend sends a fresh initial snapshot.
      let firstMessageReceived = false
      const noDataTimer = setTimeout(() => {
        if (!firstMessageReceived && !cancelled) {
          logger.warn('SSE no data within 8s — reconnecting', { sessionId: state.sessionId, version: versionRef.current })
          es.close()
          esRef.current = null
          versionRef.current = 0
          retryCount.current = 0
          connect()
        }
      }, 8000)

      es.onmessage = (e) => {
        if (!firstMessageReceived) {
          firstMessageReceived = true
          quickFailCount = 0
          clearTimeout(noDataTimer)
          if (retryCount.current === 0) {
            logger.info('SSE connected', { sessionId: state.sessionId })
          } else {
            logger.info('SSE reconnected', { sessionId: state.sessionId, attempt: retryCount.current })
          }
        }
        try {
          const snap: ClientSessionSnapshot = JSON.parse(e.data)
          const clientReceivedMs = Date.now()

          // Log inter-event delay (time between successive SSE events)
          const delayMs = lastEventTimestamp.current ? clientReceivedMs - lastEventTimestamp.current : undefined
          lastEventTimestamp.current = clientReceivedMs
          sseTimings.current.push({ timestamp: clientReceivedMs, version: snap.version, delayMs })

          // Detect skipped snapshot versions (client fell behind or backend skipped one)
          if (versionRef.current > 0 && snap.version > versionRef.current + 1) {
            logger.warn('SSE version gap', { expected: versionRef.current + 1, got: snap.version, sessionId: state.sessionId })
          }

          // Log phase transitions — useful for tracing game flow in production
          const newPhase = snap.state?.turn?.phase
          if (newPhase && newPhase !== prevPhaseRef.current) {
            logger.info('phase', { phase: newPhase, sessionId: state.sessionId, v: snap.version })
            prevPhaseRef.current = newPhase
          }

          versionRef.current = snap.version  // always update for reconnection
          retryCount.current = 0
          // GAME_OVER bypasses the animation queue so "lopeta peli" takes effect immediately
          // regardless of how many queued snapshots are waiting.
          if (snap.status === 'GAME_OVER') {
            pendingSnapshots.current = []
            settlingRef.current = false
            dispatch({ type: 'SET_SNAPSHOT', snapshot: snap })
            return
          }
          // Queue snapshot if animation is running, queue has pending items, or we're still
          // in the settling window after a direct dispatch (animation useEffect not yet fired).
          if (isAnyPlayerAnimating() || pendingSnapshots.current.length > 0 || settlingRef.current) {
            pendingSnapshots.current.push(snap)
            // Ack on receipt (not only on drain) so the backend lag-gate stays open while
            // animations play — decouples bot liveness from the animation queue.
            sendAck(state.sessionId!, snap.version)
          } else {
            settlingRef.current = true
            dispatch({ type: 'SET_SNAPSHOT', snapshot: snap })
            sendAck(state.sessionId!, snap.version)
            setTimeout(() => {
              settlingRef.current = false
              if (!isAnyPlayerAnimating()) drainPendingRef.current()
            }, 60)
          }
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        clearTimeout(noDataTimer)
        es.close()
        esRef.current = null
        if (cancelled) return
        // If the connection closes within 400ms of opening and no message arrived,
        // it almost certainly means the session doesn't exist (404). After 2 such
        // quick failures, stop retrying and go straight to FAILED.
        if (!firstMessageReceived && Date.now() - connectTime < 400) {
          quickFailCount++
          if (quickFailCount >= 2) {
            logger.warn('SSE failed: session not found', { sessionId: state.sessionId })
            dispatch({ type: 'SET_CONNECTION', status: 'FAILED' })
            return
          }
        }
        if (retryCount.current >= 5) {
          logger.warn('SSE failed after retries', { sessionId: state.sessionId, attempts: retryCount.current })
          dispatch({ type: 'SET_CONNECTION', status: 'FAILED' })
          dispatch({ type: 'SET_RECONNECT_ATTEMPTS', count: retryCount.current })
          return
        }
        const delay = Math.min(1000 * 2 ** retryCount.current, 30000)
        retryCount.current++
        dispatch({ type: 'SET_RECONNECT_ATTEMPTS', count: retryCount.current })
        dispatch({ type: 'SET_CONNECTION', status: 'RECONNECTING' })
        timeoutId = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      esRef.current?.close()
      esRef.current = null
    }
  }, [state.sessionId, state.sseFrozen])

  return (
    <GameContext.Provider value={{ state, joinSession, leaveSession, sendCmd, freezeSSE, unfreezeSSE, retryConnection, injectDebugSnapshot, reactivateTab }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

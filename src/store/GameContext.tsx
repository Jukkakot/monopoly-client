import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import type { SessionState, ClientSessionSnapshot } from '../types/api'
import { sendCommand, sseUrl, applySessionSettings } from '../api/sessionApi'
import { loadBotSpeed } from '../utils/animationSettings'
import { useEffect, useRef } from 'react'
import { translateBackendEvents, deriveMiscEvents, type GameEvent } from './events'
import {
  playTokenMove, playBuyProperty, playBuildHouse, playBuildHotel,
  playGoToJail, playReleaseJail, playDrawCard, playBankruptcy,
  playGameOver, playTradeAccepted, playMortgage, playPassGo, playPayRent, playAuctionWin,
} from '../utils/sounds'
import { calcNetWorth } from '../utils/netWorth'
import { getLang } from '../i18n/lang'
import { translations } from '../i18n/translations'
import { isAnyPlayerAnimating, onAnimationIdle } from '../hooks/useTokenAnimation'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface GameState {
  sessionId: string | null
  snapshot: SessionState | null
  prevSnapshot: SessionState | null
  version: number
  connectionStatus: ConnectionStatus
  events: GameEvent[]
  myPlayerId: string | null
  lastDice: [number, number] | null
  diceHistory: [number, number][]
  commandError: string | null
  turnCount: number
  netWorthHistory: Map<string, number[]>
  lastSeenEventId: number
}

type Action =
  | { type: 'SET_SESSION'; sessionId: string }
  | { type: 'LEAVE_SESSION' }
  | { type: 'SET_SNAPSHOT'; snapshot: ClientSessionSnapshot }
  | { type: 'SET_CONNECTION'; status: ConnectionStatus }
  | { type: 'SET_COMMAND_ERROR'; message: string | null }

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
        events: [],
        myPlayerId: null,
        lastDice: null,
        diceHistory: [],
        commandError: null,
        turnCount: 0,
        netWorthHistory: new Map(),
        lastSeenEventId: -1,
      }
    case 'SET_SNAPSHOT': {
      const newSnapshot = action.snapshot.state

      // Translate backend-persisted events (new entries only) + derive misc events from state diff
      let newEvents: GameEvent[] = []
      let lastSeenEventId = state.lastSeenEventId
      if (newSnapshot) {
        const backendLog = newSnapshot.eventLog ?? []
        if (state.snapshot === null) {
          // First snapshot after connect/refresh: mark all existing log entries as historical
          // so they appear in the event log without triggering sounds or notifications.
          if (backendLog.length > 0) {
            lastSeenEventId = Math.max(...backendLog.map(e => e.id))
            newEvents.push(...translateBackendEvents(backendLog, newSnapshot.players)
              .map(e => ({ ...e, historical: true })))
          }
        } else {
          const newEntries = backendLog.filter(e => e.id > lastSeenEventId)
          if (newEntries.length > 0) {
            lastSeenEventId = Math.max(...newEntries.map(e => e.id))
            newEvents.push(...translateBackendEvents(newEntries, newSnapshot.players))
          }
          newEvents.push(...deriveMiscEvents(state.snapshot, newSnapshot))
        }
      }

      const myPlayerId = newSnapshot ? resolveMyPlayerId(newSnapshot, state.sessionId, state.myPlayerId) : state.myPlayerId

      // Read dice directly from backend TurnState
      const lastDice = newSnapshot?.turn?.lastDice ?? state.lastDice

      const diceHistory = lastDice && lastDice !== state.lastDice
        ? [...state.diceHistory, lastDice].slice(-10)
        : state.diceHistory

      // Count turns: a turn completes when consecutiveDoubles resets to 0 and the active player changes
      let turnCount = state.turnCount
      if (newSnapshot && state.snapshot) {
        const prevActiveId = state.snapshot.turn?.activePlayerId
        const nextActiveId = newSnapshot.turn?.activePlayerId
        if (prevActiveId && nextActiveId && prevActiveId !== nextActiveId) {
          turnCount++
        }
      }

      // Track net worth history per player (sample every turn change)
      let netWorthHistory = state.netWorthHistory
      if (newSnapshot && state.snapshot && turnCount !== state.turnCount) {
        const newHistory = new Map(netWorthHistory)
        for (const player of newSnapshot.players) {
          if (player.bankrupt || player.eliminated) continue
          const worth = calcNetWorth(player, newSnapshot)
          const prev = newHistory.get(player.playerId) ?? []
          newHistory.set(player.playerId, [...prev, worth].slice(-30))
        }
        netWorthHistory = newHistory
      }

      return {
        ...state,
        prevSnapshot: state.snapshot,
        snapshot: newSnapshot,
        version: action.snapshot.version,
        connectionStatus: 'LIVE',
        events: newSnapshot ? [...state.events, ...newEvents].slice(-200) : state.events,
        myPlayerId,
        lastDice,
        diceHistory,
        turnCount,
        netWorthHistory,
        lastSeenEventId,
      }
    }
    case 'LEAVE_SESSION':
      return {
        ...state,
        sessionId: null,
        snapshot: null,
        version: 0,
        events: [],
        myPlayerId: null,
        lastDice: null,
        diceHistory: [],
        turnCount: 0,
        netWorthHistory: new Map(),
        lastSeenEventId: -1,
      }
    case 'SET_CONNECTION':
      return { ...state, connectionStatus: action.status }
    case 'SET_COMMAND_ERROR':
      return { ...state, commandError: action.message }
    default:
      return state
  }
}

interface GameContextValue {
  state: GameState
  joinSession: (sessionId: string) => void
  leaveSession: () => void
  sendCmd: (command: object) => Promise<void>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sessionId: null,
    snapshot: null,
    prevSnapshot: null,
    version: 0,
    connectionStatus: 'CONNECTING',
    events: [],
    myPlayerId: null,
    lastDice: null,
    diceHistory: [],
    commandError: null,
    turnCount: 0,
    netWorthHistory: new Map(),
    lastSeenEventId: -1,
  })

  const retryCount = useRef(0)
  const esRef = useRef<EventSource | null>(null)
  const versionRef = useRef(0)
  const lastSoundedId = useRef(-1)
  const sseTimings = useRef<Array<{ timestamp: number; version: number; delayMs?: number; networkLatencyMs?: number }>>([])
  const lastEventTimestamp = useRef<number | null>(null)
  const pendingSnapshots = useRef<ClientSessionSnapshot[]>([])
  // Briefly true after any direct dispatch — blocks incoming SSE snaps from bypassing the queue
  // before the animation useEffect has had a chance to set isAnyPlayerAnimating().
  const settlingRef = useRef(false)
  // Always points to latest closure — updated each render so refs and dispatch are fresh
  const drainPendingRef = useRef<() => void>(null!)
  drainPendingRef.current = () => {
    if (isAnyPlayerAnimating()) return
    const next = pendingSnapshots.current.shift()
    if (!next) return
    settlingRef.current = true
    dispatch({ type: 'SET_SNAPSHOT', snapshot: next })
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
        switch (e.icon) {
          case '🏃': playTokenMove(); break
          case '🏠': playBuyProperty(); break
          case '🏗': e.kind === 'hotel' ? playBuildHotel() : playBuildHouse(); break
          case '⛓': playGoToJail(); break
          case '🔓': playReleaseJail(); break
          case '🃏': playDrawCard(); break
          case '💀': playBankruptcy(); break
          case '🎊': playGameOver(); break
          case '🤝': if (e.kind === 'accepted') playTradeAccepted(); break
          case '🏦': playMortgage(); break
          case '💳': playMortgage(); break
          case '💰': playPassGo(); break
          case '💸': playPayRent(); break
          case '🏆': playAuctionWin(); break
        }
      }, delay))
    }
    return () => timers.forEach(clearTimeout)
  }, [state.events])

  const joinSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_SESSION', sessionId })
    retryCount.current = 0
    try { localStorage.setItem('monopoly_last_session', sessionId) } catch { /* ignore */ }
    const botSpeed = loadBotSpeed()
    applySessionSettings(sessionId, { botSpeed })
      .then(() => console.debug('[settings] botSpeed sent:', botSpeed))
      .catch(e => console.warn('[settings] failed to send botSpeed:', e))
  }, [])
 const leaveSession = useCallback(() => {
    dispatch({ type: 'LEAVE_SESSION' })
    retryCount.current = 0
    versionRef.current = 0
  }, [])
  useEffect(() => {
    // Expose SSE timings function globally for debugging
    ; (window as any).exportSSETimings = () => {
      const data = sseTimings.current.map(t => ({
        delay: t.delayMs?.toFixed(0) ?? 'initial',
        networkLatency: t.networkLatencyMs?.toFixed(0),
        version: t.version,
      }))
      const json = JSON.stringify(data, null, 2)
      console.log('📊 SSE Timings:', json)
      return json
    }
  }, [])

  const sendCmd = useCallback(async (command: object) => {
    if (!state.sessionId) return
    try {
      const sid = state.sessionId
      const playerToken = sessionStorage.getItem(`monopoly_token_${sid}`) ?? undefined
      const cmdType = (command as { type?: string }).type
      const hostToken = cmdType === 'AbortGame'
        ? (localStorage.getItem(`monopoly_host_${sid}`) ?? undefined)
        : undefined
      const enriched = { ...command, ...(playerToken ? { playerToken } : {}), ...(hostToken ? { hostToken } : {}) }
      const result = await sendCommand(sid, enriched)
      if (!result.accepted && result.rejections.length > 0) {
        dispatch({ type: 'SET_COMMAND_ERROR', message: result.rejections.join(' · ') })
        setTimeout(() => dispatch({ type: 'SET_COMMAND_ERROR', message: null }), 4000)
      }
    } catch (err) {
      dispatch({ type: 'SET_COMMAND_ERROR', message: translations[getLang()].commandErrorMsg })
      setTimeout(() => dispatch({ type: 'SET_COMMAND_ERROR', message: null }), 4000)
    }
  }, [state.sessionId])

  useEffect(() => {
    if (!state.sessionId) return
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    function connect() {
      if (cancelled) return
      dispatch({ type: 'SET_CONNECTION', status: retryCount.current === 0 ? 'CONNECTING' : 'RECONNECTING' })

      const url = sseUrl(state.sessionId!)
      const es = new EventSource(versionRef.current > 0 ? `${url}?lastEventId=${versionRef.current}` : url)
      esRef.current = es

      es.onmessage = (e) => {
        try {
          const clientReceivedMs = performance.now()
          const snap: ClientSessionSnapshot = JSON.parse(e.data)

          // Calculate network latency using server timestamp
          const networkLatencyMs = clientReceivedMs - snap.serverTimestampMs

          // Log SSE timing
          const delayMs = lastEventTimestamp.current ? clientReceivedMs - lastEventTimestamp.current : undefined
          lastEventTimestamp.current = clientReceivedMs
          sseTimings.current.push({ timestamp: clientReceivedMs, version: snap.version, delayMs, networkLatencyMs })

          // Log to console with network latency
          if (delayMs !== undefined) {
            console.log(`📡 SSE v${snap.version} received after ${delayMs.toFixed(0)}ms (network: ${networkLatencyMs.toFixed(0)}ms)`)
          } else {
            console.log(`📡 SSE v${snap.version} (first event, network: ${networkLatencyMs.toFixed(0)}ms)`)
          }
        

          versionRef.current = snap.version  // always update for reconnection
        retryCount.current = 0
        // Queue snapshot if animation is running, queue has pending items, or we're still
        // in the settling window after a direct dispatch (animation useEffect not yet fired).
        if (isAnyPlayerAnimating() || pendingSnapshots.current.length > 0 || settlingRef.current) {
          pendingSnapshots.current.push(snap)
        } else {
          settlingRef.current = true
          dispatch({ type: 'SET_SNAPSHOT', snapshot: snap })
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
      es.close()
      esRef.current = null
      if (cancelled) return
      if (retryCount.current >= 5) {
        dispatch({ type: 'SET_CONNECTION', status: 'FAILED' })
        return
      }
      const delay = Math.min(1000 * 2 ** retryCount.current, 30000)
      retryCount.current++
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
}, [state.sessionId])

return (
  <GameContext.Provider value={{ state, joinSession, leaveSession, sendCmd }}>
    {children}
  </GameContext.Provider>
)
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

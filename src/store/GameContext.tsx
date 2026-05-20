import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import type { SessionState, ClientSessionSnapshot } from '../types/api'
import { sendCommand, sseUrl } from '../api/sessionApi'
import { useEffect, useRef } from 'react'
import { deriveEvents, type GameEvent } from './events'
import {
  playTokenMove, playBuyProperty, playBuildHouse, playBuildHotel,
  playGoToJail, playReleaseJail, playDrawCard, playBankruptcy,
  playGameOver, playTradeAccepted, playMortgage, playPassGo, playPayRent, playAuctionWin,
} from '../utils/sounds'
import { calcNetWorth } from '../utils/netWorth'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface GameState {
  sessionId: string | null
  snapshot: SessionState | null
  version: number
  connectionStatus: ConnectionStatus
  events: GameEvent[]
  myPlayerId: string | null
  lastDice: [number, number] | null
  diceHistory: [number, number][]
  commandError: string | null
  turnCount: number
  netWorthHistory: Map<string, number[]>
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
      const stored = localStorage.getItem(`monopoly_player_${sessionId}`)
      if (stored) return stored  // Stable identity: always honour an explicit localStorage entry
    } catch {}
  }
  // No localStorage entry → dynamic mode: follow whoever is the active human player.
  // This lets solo testers control all players when starting via "Aloita peli".
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
      return {
        ...state,
        sessionId: action.sessionId,
        snapshot: null,
        version: 0,
        connectionStatus: 'CONNECTING',
        events: [],
        myPlayerId: null,
        lastDice: null,
        diceHistory: [],
        commandError: null,
        turnCount: 0,
        netWorthHistory: new Map(),
      }
    case 'SET_SNAPSHOT': {
      const newSnapshot = action.snapshot.state
      const newEvents = newSnapshot ? deriveEvents(state.snapshot, newSnapshot) : []
      const myPlayerId = newSnapshot ? resolveMyPlayerId(newSnapshot, state.sessionId, state.myPlayerId) : state.myPlayerId

      // Derive dice from active player movement
      let lastDice = state.lastDice
      if (newSnapshot && state.snapshot) {
        const prevTurn = state.snapshot.turn
        const nextTurn = newSnapshot.turn
        const activeId = prevTurn?.activePlayerId
        if (activeId) {
          const prevPlayer = state.snapshot.players.find(p => p.playerId === activeId)
          const nextPlayer = newSnapshot.players.find(p => p.playerId === activeId)
          if (prevPlayer && nextPlayer &&
              prevPlayer.boardIndex !== nextPlayer.boardIndex &&
              !(nextPlayer.inJail && !prevPlayer.inJail)) {
            const steps = (nextPlayer.boardIndex - prevPlayer.boardIndex + 40) % 40
            if (steps >= 2 && steps <= 12) {
              const isDoubles = (nextTurn?.consecutiveDoubles ?? 0) === (prevTurn?.consecutiveDoubles ?? 0) + 1
              if (isDoubles && steps % 2 === 0 && steps / 2 <= 6) {
                lastDice = [steps / 2, steps / 2]
              } else {
                const d1 = Math.min(6, steps - 1)
                const d2 = steps - d1
                if (d2 >= 1 && d2 <= 6) lastDice = [d1, d2]
              }
            }
          }
        }
      }

      // Play sounds for derived events
      for (const e of newEvents) {
        switch (e.icon) {
          case '🏃': playTokenMove(); break
          case '🏠': playBuyProperty(); break
          case '🏗': e.message.includes('hotelli') ? playBuildHotel() : playBuildHouse(); break
          case '⛓': playGoToJail(); break
          case '🔓': playReleaseJail(); break
          case '🃏': playDrawCard(); break
          case '💀': playBankruptcy(); break
          case '🎊': playGameOver(); break
          case '🤝': if (e.message.includes('hyväksytty')) playTradeAccepted(); break
          case '🏦': playMortgage(); break
          case '💳': playMortgage(); break
          case '💰': playPassGo(); break
          case '💸': playPayRent(); break
          case '🏆': playAuctionWin(); break
        }
      }
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
        snapshot: newSnapshot,
        version: action.snapshot.version,
        connectionStatus: 'LIVE',
        events: newSnapshot ? [...state.events, ...newEvents].slice(-200) : state.events,
        myPlayerId,
        lastDice,
        diceHistory,
        turnCount,
        netWorthHistory,
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
    version: 0,
    connectionStatus: 'CONNECTING',
    events: [],
    myPlayerId: null,
    lastDice: null,
    diceHistory: [],
    commandError: null,
    turnCount: 0,
    netWorthHistory: new Map(),
  })

  const retryCount = useRef(0)
  const esRef = useRef<EventSource | null>(null)
  const versionRef = useRef(0)

  const joinSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_SESSION', sessionId })
    retryCount.current = 0
    try { localStorage.setItem('monopoly_last_session', sessionId) } catch { /* ignore */ }
  }, [])

  const leaveSession = useCallback(() => {
    dispatch({ type: 'LEAVE_SESSION' })
    retryCount.current = 0
    versionRef.current = 0
  }, [])

  const sendCmd = useCallback(async (command: object) => {
    if (!state.sessionId) return
    try {
      const result = await sendCommand(state.sessionId, command)
      if (!result.accepted && result.rejections.length > 0) {
        dispatch({ type: 'SET_COMMAND_ERROR', message: result.rejections.join(' · ') })
        setTimeout(() => dispatch({ type: 'SET_COMMAND_ERROR', message: null }), 4000)
      }
    } catch (err) {
      dispatch({ type: 'SET_COMMAND_ERROR', message: 'Komento epäonnistui — tarkista yhteys' })
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
          const snap: ClientSessionSnapshot = JSON.parse(e.data)
          versionRef.current = snap.version
          retryCount.current = 0
          dispatch({ type: 'SET_SNAPSHOT', snapshot: snap })
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        if (cancelled) return
        if (retryCount.current >= 10) {
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

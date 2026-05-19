import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import type { SessionState, ClientSessionSnapshot } from '../types/api'
import { sendCommand, sseUrl } from '../api/sessionApi'
import { useEffect, useRef } from 'react'
import { deriveEvents, type GameEvent } from './events'
import {
  playTokenMove, playBuyProperty, playBuildHouse, playBuildHotel,
  playGoToJail, playReleaseJail, playDrawCard, playBankruptcy,
  playGameOver, playTradeAccepted, playMortgage, playPassGo,
} from '../utils/sounds'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface GameState {
  sessionId: string | null
  snapshot: SessionState | null
  version: number
  connectionStatus: ConnectionStatus
  events: GameEvent[]
  myPlayerId: string | null
}

type Action =
  | { type: 'SET_SESSION'; sessionId: string }
  | { type: 'SET_SNAPSHOT'; snapshot: ClientSessionSnapshot }
  | { type: 'SET_CONNECTION'; status: ConnectionStatus }

function resolveMyPlayerId(snapshot: SessionState): string | null {
  const activeId = snapshot.turn?.activePlayerId
  if (activeId) {
    const activeSeat = snapshot.seats.find(s => s.playerId === activeId && s.seatKind === 'HUMAN')
    if (activeSeat) return activeId
  }
  const humanSeat = snapshot.seats.find(s => s.seatKind === 'HUMAN')
  return humanSeat?.playerId ?? null
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
      }
    case 'SET_SNAPSHOT': {
      const newSnapshot = action.snapshot.state
      const newEvents = newSnapshot ? deriveEvents(state.snapshot, newSnapshot) : []
      const myPlayerId = state.myPlayerId ?? (newSnapshot ? resolveMyPlayerId(newSnapshot) : null)
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
          case '🤝': if (e.message.includes('päättyi')) playTradeAccepted(); break
          case '🏦': playMortgage(); break
          case '💳': playMortgage(); break
        }
        // Pass GO bonus
        if (e.icon === '🏃' && e.message.includes('GO')) playPassGo()
      }
      return {
        ...state,
        snapshot: newSnapshot,
        version: action.snapshot.version,
        connectionStatus: 'LIVE',
        events: newSnapshot ? [...state.events, ...newEvents].slice(-200) : state.events,
        myPlayerId,
      }
    }
    case 'SET_CONNECTION':
      return { ...state, connectionStatus: action.status }
    default:
      return state
  }
}

interface GameContextValue {
  state: GameState
  joinSession: (sessionId: string) => void
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
  })

  const retryCount = useRef(0)
  const esRef = useRef<EventSource | null>(null)
  const versionRef = useRef(0)

  const joinSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SET_SESSION', sessionId })
    retryCount.current = 0
  }, [])

  const sendCmd = useCallback(async (command: object) => {
    if (!state.sessionId) return
    await sendCommand(state.sessionId, command)
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
    <GameContext.Provider value={{ state, joinSession, sendCmd }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}

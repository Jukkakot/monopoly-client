import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import type { SessionState, ClientSessionSnapshot } from '../types/api'
import { sendCommand, sseUrl } from '../api/sessionApi'
import { useEffect, useRef } from 'react'

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'FAILED'

interface GameState {
  sessionId: string | null
  snapshot: SessionState | null
  version: number
  connectionStatus: ConnectionStatus
}

type Action =
  | { type: 'SET_SESSION'; sessionId: string }
  | { type: 'SET_SNAPSHOT'; snapshot: ClientSessionSnapshot }
  | { type: 'SET_CONNECTION'; status: ConnectionStatus }

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_SESSION':
      return { ...state, sessionId: action.sessionId, snapshot: null, connectionStatus: 'CONNECTING' }
    case 'SET_SNAPSHOT':
      return {
        ...state,
        snapshot: action.snapshot.state,
        version: action.snapshot.version,
        connectionStatus: 'LIVE',
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

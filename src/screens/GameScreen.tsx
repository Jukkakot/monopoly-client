import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { playDiceRoll, playButtonClick } from '../utils/sounds'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import Board, { markCardAcknowledged } from '../components/board/Board'
import PlayerList from '../components/players/PlayerList'
import ActionPanel from '../components/actions/ActionPanel'
import EventLog from '../components/log/EventLog'
import FlashBanner from '../components/notification/FlashBanner'
import PropertyDetail from '../components/property/PropertyDetail'
import KeyboardHelp from '../components/menu/KeyboardHelp'
import Confetti from '../components/effects/Confetti'
import GameOverOverlay from '../components/effects/GameOverOverlay'
import DiceSpinner from '../components/common/DiceSpinner'
import styles from './GameScreen.module.css'
import { useT } from '../i18n/LanguageContext'

const DebugPanel = import.meta.env.DEV
  ? lazy(() => import('../debug/DebugPanel'))
  : null
import { useDebugMode } from '../debug/useDebugMode'

export default function GameScreen() {
  const t = useT()
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { state, joinSession, leaveSession } = useGame()

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    joinSession(sessionId)
  }, [sessionId])

  useEffect(() => {
    return () => { leaveSession() }
  }, [])

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const [highlightGroupType, setHighlightGroupType] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [debugPlayerId, setDebugPlayerId] = useState<string | null>(null)
  const { sendCmd } = useGame()
  const [isDebugMode] = useDebugMode()

  // Auto-clear debug player selection when the active player changes
  const activePlayerId = state.snapshot?.turn?.activePlayerId
  useEffect(() => {
    if (isDebugMode) setDebugPlayerId(null)
  }, [activePlayerId, isDebugMode])

  function handleSpotClick(spotId: string) {
    setSelectedSpotId(spotId)
    setHighlightGroupType(null)
  }

  function handleGroupHighlight(groupType: string | null) {
    setHighlightGroupType(groupType)
    setSelectedSpotId(null)
  }

  // Update browser tab title to indicate whose turn it is
  useEffect(() => {
    if (!state.snapshot) {
      document.title = 'Monopoly Helsinki'
      return
    }
    const snap = state.snapshot
    const turn = snap.turn
    if (!turn || snap.status === 'GAME_OVER') {
      document.title = 'Monopoly Helsinki'
      return
    }
    const isMyTurn = turn.activePlayerId === state.myPlayerId
    const activeName = snap.players.find(p => p.playerId === turn.activePlayerId)?.name ?? '?'
    document.title = isMyTurn ? `🎲 ${t.yourTurnMsg}` : `${activeName}… — Monopoly Helsinki`
    return () => { document.title = 'Monopoly Helsinki' }
  }, [state.snapshot?.turn?.activePlayerId, state.myPlayerId, state.snapshot?.status])

  // Tracks whether a space-triggered command is in-flight.
  // Cleared when the snapshot phase/actor changes (backend confirmed the action).
  const spacePendingRef = useRef(false)
  const lastSpacePhaseRef = useRef('')

  // Clear the pending flag whenever the relevant part of state changes
  useEffect(() => {
    const snap = state.snapshot
    const key = `${snap?.turn?.activePlayerId}:${snap?.turn?.phase}`
    if (key !== lastSpacePhaseRef.current) {
      lastSpacePhaseRef.current = key
      spacePendingRef.current = false
    }
  }, [state.snapshot?.turn?.phase, state.snapshot?.turn?.activePlayerId])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.snapshot || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const snap = state.snapshot
    const myId = state.myPlayerId
    if (!myId) return
    const turn = snap.turn
    const isMyTurn = turn?.activePlayerId === myId

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      // Block until the previous space command is confirmed by a state change
      if (spacePendingRef.current) return

      if (isMyTurn && turn?.phase === 'WAITING_FOR_DECISION' && snap.pendingDecision) {
        spacePendingRef.current = true
        playButtonClick()
        const dec = snap.pendingDecision
        sendCmd({ type: 'BuyProperty', sessionId: snap.sessionId, actorPlayerId: myId, decisionId: dec.decisionId, propertyId: dec.payload.propertyId })
      } else if (isMyTurn && turn?.phase === 'WAITING_FOR_ROLL') {
        spacePendingRef.current = true
        playDiceRoll()
        sendCmd({ type: 'RollDice', sessionId: snap.sessionId, actorPlayerId: myId })
      } else if (isMyTurn && turn?.phase === 'WAITING_FOR_END_TURN' && (turn?.consecutiveDoubles ?? 0) === 0) {
        spacePendingRef.current = true
        playButtonClick()
        sendCmd({ type: 'EndTurn', sessionId: snap.sessionId, actorPlayerId: myId })
      } else if (isMyTurn && turn?.phase === 'WAITING_FOR_CARD_ACK') {
        spacePendingRef.current = true
        playButtonClick()
        markCardAcknowledged()
        sendCmd({ type: 'AcknowledgeCard', sessionId: snap.sessionId, actorPlayerId: myId })
      }
    }
  }, [state.snapshot, state.myPlayerId, sendCmd])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const sessionNeverLoaded = state.connectionStatus === 'FAILED' && !state.snapshot

  // Auto-redirect to lobby when the session never loaded — it was deleted or never existed.
  // Skip the auto-redirect when it's a mid-game connection loss (snapshot was received before).
  useEffect(() => {
    if (!sessionNeverLoaded) return
    const timer = setTimeout(() => navigate('/'), 3000)
    return () => clearTimeout(timer)
  }, [sessionNeverLoaded, navigate])

  if (state.connectionStatus === 'FAILED') {
    return (
      <div className={styles.center}>
        <div className={styles.error}>
          <h2>{sessionNeverLoaded ? t.sessionNotFoundTitle : t.connectionLostTitle}</h2>
          <p>{sessionNeverLoaded ? t.sessionNotFoundMsg : t.checkNetworkMsg}</p>
          {sessionId && !sessionNeverLoaded && (
            <p className={styles.sessionIdHint}>{t.gamePinLabel} <code>{sessionId}</code></p>
          )}
          {!sessionNeverLoaded && (
            <button onClick={() => window.location.reload()} className={styles.btn}>{t.retryBtn}</button>
          )}
          <button onClick={() => navigate('/')} className={`${styles.btn} ${styles.btnSecondary}`}>{t.backBtn}</button>
        </div>
      </div>
    )
  }

  if (!state.snapshot) {
    return <DiceSpinner message={t.loadingGame} overlay />
  }

  const effectivePlayerId = isDebugMode
    ? (debugPlayerId ?? state.snapshot.turn?.activePlayerId ?? state.myPlayerId ?? '')
    : (state.myPlayerId ?? '')
  const myPlayerId = effectivePlayerId
  const isGameOver = state.snapshot.status === 'GAME_OVER'

  return (
    <>
      <span data-testid="game-status" data-status={state.snapshot.status} style={{ display: 'none' }} />
      {isGameOver && <Confetti />}
      {isGameOver && <GameOverOverlay state={state.prevSnapshot ?? state.snapshot} />}
      <FlashBanner />
      {selectedSpotId && (
        <PropertyDetail
          spotId={selectedSpotId}
          state={state.snapshot}
          onClose={() => setSelectedSpotId(null)}
        />
      )}
      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
      {import.meta.env.DEV && isDebugMode && DebugPanel && sessionId && (
        <Suspense fallback={null}>
          <DebugPanel sessionId={sessionId} />
        </Suspense>
      )}
      <AppLayout
        header={
          <Header
            isSpectator={!state.myPlayerId}
          />
        }
        board={<Board state={state.snapshot} onSpotClick={handleSpotClick} selectedSpotId={selectedSpotId ?? undefined} highlightGroupType={highlightGroupType ?? undefined} onGroupHighlight={handleGroupHighlight} />}
        players={<PlayerList state={state.snapshot} onSpotClick={setSelectedSpotId} onTradeWith={(targetId) => {
          if (state.myPlayerId && state.snapshot) {
            sendCmd({ type: 'OpenTrade', sessionId: state.snapshot.sessionId, actorPlayerId: state.myPlayerId, recipientPlayerId: targetId })
          }
        }} />}
        log={<EventLog events={state.events} myPlayerId={state.myPlayerId} />}
        actions={
          <>
            {isDebugMode && (
              <div className={styles.debugBar}>
                <span className={styles.debugLabel}>🔧 debug</span>
                {state.snapshot.players.filter(p => !p.bankrupt && !p.eliminated).map(p => {
                  const seat = state.snapshot!.seats.find(s => s.playerId === p.playerId)
                  const isActive = p.playerId === state.snapshot!.turn?.activePlayerId
                  const isSelected = myPlayerId === p.playerId
                  return (
                    <button
                      key={p.playerId}
                      data-testid={`debug-player-${seat?.seatIndex ?? 0}`}
                      className={`${styles.debugPlayer} ${isSelected ? styles.debugPlayerSelected : ''} ${isActive ? styles.debugPlayerActive : ''}`}
                      onClick={() => setDebugPlayerId(p.playerId)}
                      style={{ borderColor: seat?.tokenColorHex ?? '#888' }}
                    >
                      {p.name.split(' ')[0]}
                    </button>
                  )
                })}
              </div>
            )}
            <ActionPanel state={state.snapshot} myPlayerId={myPlayerId} />
          </>
        }
      />
    </>
  )
}

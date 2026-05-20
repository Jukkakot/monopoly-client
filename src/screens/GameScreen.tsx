import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { sessionExists } from '../api/sessionApi'
import { playDiceRoll, playButtonClick } from '../utils/sounds'
import { loadSoundConfig, saveSoundConfig } from '../components/menu/SoundSettings'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import Board from '../components/board/Board'
import PlayerList from '../components/players/PlayerList'
import ActionPanel from '../components/actions/ActionPanel'
import EventLog from '../components/log/EventLog'
import FlashBanner from '../components/notification/FlashBanner'
import PropertyDetail from '../components/property/PropertyDetail'
import KeyboardHelp from '../components/menu/KeyboardHelp'
import Confetti from '../components/effects/Confetti'
import GameOverOverlay from '../components/effects/GameOverOverlay'
import styles from './GameScreen.module.css'
import { useT } from '../i18n/LanguageContext'

export default function GameScreen() {
  const t = useT()
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { state, joinSession, leaveSession } = useGame()

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    let cancelled = false
    sessionExists(sessionId).then(exists => {
      if (cancelled) return
      if (!exists) { navigate('/'); return }
      joinSession(sessionId)
    }).catch(() => { if (!cancelled) navigate('/') })
    return () => { cancelled = true }
  }, [sessionId])

  useEffect(() => {
    return () => { leaveSession() }
  }, [])

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const [highlightGroupType, setHighlightGroupType] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const { sendCmd } = useGame()

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
    document.title = isMyTurn ? `⭐ ${t.yourTurnMsg} — Monopoly Helsinki` : `${activeName}… — Monopoly Helsinki`
    return () => { document.title = 'Monopoly Helsinki' }
  }, [state.snapshot?.turn?.activePlayerId, state.myPlayerId, state.snapshot?.status])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.snapshot || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    const snap = state.snapshot
    const myId = state.myPlayerId
    if (!myId) return
    const turn = snap.turn
    const isMyTurn = turn?.activePlayerId === myId

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      if (isMyTurn && turn?.phase === 'WAITING_FOR_ROLL') {
        playDiceRoll()
        sendCmd({ type: 'RollDice', sessionId: snap.sessionId, actorPlayerId: myId })
      } else if (isMyTurn && turn?.phase === 'WAITING_FOR_END_TURN') {
        playButtonClick()
        sendCmd({ type: 'EndTurn', sessionId: snap.sessionId, actorPlayerId: myId })
      }
    }
    if (e.key === 'b' || e.key === 'B') {
      if (isMyTurn && turn?.phase === 'WAITING_FOR_DECISION' && snap.pendingDecision) {
        playButtonClick()
        const dec = snap.pendingDecision
        sendCmd({ type: 'BuyProperty', sessionId: snap.sessionId, actorPlayerId: myId, decisionId: dec.decisionId, propertyId: dec.payload.propertyId })
      }
    }
    if (e.key === 'd' || e.key === 'D') {
      if (isMyTurn && turn?.phase === 'WAITING_FOR_DECISION' && snap.pendingDecision) {
        playButtonClick()
        const dec = snap.pendingDecision
        sendCmd({ type: 'DeclineProperty', sessionId: snap.sessionId, actorPlayerId: myId, decisionId: dec.decisionId, propertyId: dec.payload.propertyId })
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      if (turn?.phase === 'WAITING_FOR_AUCTION' && snap.auctionState) {
        const auction = snap.auctionState
        const eligible = auction.eligiblePlayerIds.includes(myId) && !auction.passedPlayerIds.includes(myId)
        if (eligible) {
          playButtonClick()
          sendCmd({ type: 'PassAuction', sessionId: snap.sessionId, actorPlayerId: myId, auctionId: auction.auctionId })
        }
      }
    }
    if ((e.key === '+' || e.key === 'ArrowUp') && !e.shiftKey) {
      if (turn?.phase === 'WAITING_FOR_AUCTION' && snap.auctionState) {
        const auction = snap.auctionState
        const eligible = auction.eligiblePlayerIds.includes(myId) && !auction.passedPlayerIds.includes(myId)
        if (eligible) {
          e.preventDefault()
          playButtonClick()
          sendCmd({ type: 'PlaceAuctionBid', sessionId: snap.sessionId, actorPlayerId: myId, auctionId: auction.auctionId, amount: auction.currentBid + 10 })
        }
      }
    }
    if (e.key === 'Escape') {
      setSelectedSpotId(null)
      setHighlightGroupType(null)
      setShowHelp(false)
    }
    if (e.key === '?') {
      setShowHelp(v => !v)
    }
    if (e.key === 'm' || e.key === 'M') {
      const cfg = loadSoundConfig()
      const newVol = cfg.volume > 0 ? 0 : 80
      saveSoundConfig({ ...cfg, volume: newVol })
    }
  }, [state.snapshot, state.myPlayerId, selectedSpotId, highlightGroupType, sendCmd])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (state.connectionStatus === 'FAILED') {
    return (
      <div className={styles.center}>
        <div className={styles.error}>
          <h2>{t.connectionLostTitle}</h2>
          <p>{t.checkNetworkMsg}</p>
          {sessionId && (
            <p className={styles.sessionIdHint}>{t.gamePinLabel} <code>{sessionId}</code></p>
          )}
          <button onClick={() => window.location.reload()} className={styles.btn}>{t.retryBtn}</button>
          <button onClick={() => navigate('/')} className={`${styles.btn} ${styles.btnSecondary}`}>{t.backBtn}</button>
        </div>
      </div>
    )
  }

  if (!state.snapshot) {
    return (
      <div className={styles.center}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonLabel}>{t.loadingGame}</div>
          <div className={styles.skeletonBoard} />
          <div className={styles.skeletonBar} />
          <div className={styles.skeletonBar} />
        </div>
      </div>
    )
  }

  const myPlayerId = state.myPlayerId ?? ''
  const isGameOver = state.snapshot.status === 'GAME_OVER'

  return (
    <>
      {isGameOver && <Confetti />}
      {isGameOver && <GameOverOverlay state={state.snapshot} />}
      <FlashBanner />
      {selectedSpotId && (
        <PropertyDetail
          spotId={selectedSpotId}
          state={state.snapshot}
          onClose={() => setSelectedSpotId(null)}
        />
      )}
      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
      <AppLayout
        header={
          <Header
            snapshot={state.snapshot}
            connectionStatus={state.connectionStatus}
            isSpectator={!state.myPlayerId}
          />
        }
        board={<Board state={state.snapshot} onSpotClick={handleSpotClick} selectedSpotId={selectedSpotId ?? undefined} highlightGroupType={highlightGroupType ?? undefined} onGroupHighlight={handleGroupHighlight} />}
        players={<PlayerList state={state.snapshot} onSpotClick={setSelectedSpotId} onTradeWith={(targetId) => {
          if (state.myPlayerId && state.snapshot) {
            sendCmd({ type: 'OpenTrade', sessionId: state.snapshot.sessionId, actorPlayerId: state.myPlayerId, recipientPlayerId: targetId })
          }
        }} />}
        log={<EventLog />}
        actions={<ActionPanel state={state.snapshot} myPlayerId={myPlayerId} />}
      />
    </>
  )
}

import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import AppLayout from '../components/layout/AppLayout'
import Header from '../components/layout/Header'
import Board from '../components/board/Board'
import PlayerList from '../components/players/PlayerList'
import ActionPanel from '../components/actions/ActionPanel'
import EventLog from '../components/log/EventLog'
import FlashBanner from '../components/notification/FlashBanner'
import styles from './GameScreen.module.css'

export default function GameScreen() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { state, joinSession } = useGame()

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    if (state.sessionId !== sessionId) {
      joinSession(sessionId)
    }
  }, [sessionId])

  if (state.connectionStatus === 'FAILED') {
    return (
      <div className={styles.center}>
        <div className={styles.error}>
          <h2>Yhteys katkesi</h2>
          <p>Tarkista verkko tai lataa sivu uudelleen.</p>
          <button onClick={() => navigate('/')} className={styles.btn}>Takaisin</button>
        </div>
      </div>
    )
  }

  if (!state.snapshot) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <p>Yhdistetään peliin…</p>
      </div>
    )
  }

  const myPlayerId = state.myPlayerId ?? ''

  return (
    <>
    <FlashBanner />
    <AppLayout
      header={
        <Header
          snapshot={state.snapshot}
          connectionStatus={state.connectionStatus}
        />
      }
      board={<Board state={state.snapshot} />}
      players={<PlayerList state={state.snapshot} />}
      log={<EventLog />}
      actions={<ActionPanel state={state.snapshot} myPlayerId={myPlayerId} />}
    />
    </>
  )
}

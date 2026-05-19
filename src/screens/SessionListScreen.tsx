import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { listSessions } from '../api/sessionApi'
import type { SessionSummary } from '../types/api'
import styles from './SessionListScreen.module.css'

export default function SessionListScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const list = await listSessions()
      setSessions(list)
    } catch {
      setError('Sessioiden lataus epäonnistui.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleJoin(s: SessionSummary) {
    joinSession(s.sessionId)
    navigate(`/game/${s.sessionId}`)
  }

  const active = sessions.filter(s => s.status === 'IN_PROGRESS')
  const finished = sessions.filter(s => s.status === 'GAME_OVER')

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoBox}>
          <div className={styles.logo}>Monopoly</div>
          <div className={styles.sub}>Helsinki Edition</div>
        </div>

        <button className={styles.newBtn} onClick={() => navigate('/lobby')}>
          + Uusi peli
        </button>

        <div className={styles.listSection}>
          <div className={styles.sectionTitle}>Käynnissä olevat pelit</div>
          {loading && <div className={styles.hint}>Ladataan…</div>}
          {error && <div className={styles.errorMsg}>{error}</div>}
          {!loading && !error && active.length === 0 && (
            <div className={styles.hint}>Ei aktiivisia pelejä.</div>
          )}
          {active.map(s => (
            <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} />
          ))}
        </div>

        {finished.length > 0 && (
          <div className={styles.listSection}>
            <div className={styles.sectionTitle}>Päättyneet pelit</div>
            {finished.map(s => (
              <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} label="Katso" />
            ))}
          </div>
        )}

        <button className={styles.refreshBtn} onClick={load}>
          Päivitä lista
        </button>
      </div>
    </div>
  )
}

function SessionRow({ session, onJoin, label = 'Liity' }: {
  session: SessionSummary
  onJoin: () => void
  label?: string
}) {
  const ts = session.createdAt ? new Date(session.createdAt) : null
  const date = ts && !isNaN(ts.getTime())
    ? ts.toLocaleString('fi-FI', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '–'
  return (
    <div className={styles.sessionRow}>
      <div className={styles.sessionInfo}>
        <div className={styles.sessionId}>{session.sessionId.slice(0, 8)}…</div>
        <div className={styles.sessionMeta}>{session.playerCount} pelaajaa · {date}</div>
      </div>
      <button className={styles.joinBtn} onClick={onJoin}>{label}</button>
    </div>
  )
}

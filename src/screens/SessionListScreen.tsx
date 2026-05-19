import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { listSessions, sessionExists, deleteSession, createSession } from '../api/sessionApi'
import type { SessionSummary } from '../types/api'
import { saveTokenShapes } from '../utils/tokenShapes'
import { randomHumanName, randomBotName } from '../utils/playerNames'
import styles from './SessionListScreen.module.css'

export default function SessionListScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinChecking, setJoinChecking] = useState(false)

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

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  function handleJoin(s: SessionSummary) {
    joinSession(s.sessionId)
    navigate(`/game/${s.sessionId}`)
  }

  async function handleJoinByCode() {
    const code = joinCode.trim()
    if (!code) return
    setJoinError(null)
    setJoinChecking(true)
    try {
      const exists = await sessionExists(code)
      if (!exists) {
        setJoinError('Peliä ei löydy. Tarkista koodi.')
        return
      }
      joinSession(code)
      navigate(`/game/${code}`)
    } catch {
      setJoinError('Yhteysongelma. Yritä uudelleen.')
    } finally {
      setJoinChecking(false)
    }
  }

  async function handleDelete(sessionId: string) {
    if (!confirm(`Poistetaanko peli ${sessionId}?`)) return
    await deleteSession(sessionId)
    await load()
  }

  async function handleQuickStart(bots: number) {
    setLoading(true)
    setError(null)
    try {
      const humanName = randomHumanName([])
      const names: string[] = [humanName]
      for (let i = 0; i < bots; i++) names.push(randomBotName(names))
      const colors = ['#e53935', '#1e88e5', '#43a047', '#f9a825'].slice(0, 1 + bots)
      const seatKinds = ['HUMAN', ...Array(bots).fill('BOT')] as ('HUMAN' | 'BOT')[]
      const difficulties = ['NORMAL', ...Array(bots).fill('NORMAL')] as ('EASY' | 'NORMAL')[]
      const sessionId = await createSession({ names, colors, seatKinds, difficulties })
      const shapes = (['circle', 'star', 'square', 'triangle'] as const).slice(0, 1 + bots)
      saveTokenShapes(sessionId, [...shapes])
      joinSession(sessionId)
      navigate(`/game/${sessionId}`)
    } catch {
      setError('Pikapelin luonti epäonnistui.')
      setLoading(false)
    }
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

        <div className={styles.quickSection}>
          <button className={styles.newBtn} onClick={() => navigate('/lobby')}>
            + Uusi peli
          </button>
          <div className={styles.quickRow}>
            <button className={styles.quickBtn} onClick={() => handleQuickStart(1)} disabled={loading}>
              ⚡ 1 vs Botti
            </button>
            <button className={styles.quickBtn} onClick={() => handleQuickStart(2)} disabled={loading}>
              ⚡ 1 vs 2 Botti
            </button>
            <button className={styles.quickBtn} onClick={() => handleQuickStart(3)} disabled={loading}>
              ⚡ 1 vs 3 Botti
            </button>
          </div>
        </div>

        <div className={styles.joinCodeSection}>
          <div className={styles.sectionTitle}>Liity koodilla</div>
          <div className={styles.joinCodeRow}>
            <input
              className={styles.joinCodeInput}
              type="text"
              placeholder="esim. rohkea-karhu-47"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setJoinError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
              disabled={joinChecking}
            />
            <button className={styles.joinCodeBtn} onClick={handleJoinByCode} disabled={joinChecking}>
              {joinChecking ? '…' : 'Liity'}
            </button>
          </div>
          {joinError && <div className={styles.joinError}>{joinError}</div>}
        </div>

        <div className={styles.listSection}>
          <div className={styles.sectionTitle}>Käynnissä olevat pelit</div>
          {loading && <div className={styles.hint}>Ladataan…</div>}
          {error && <div className={styles.errorMsg}>{error}</div>}
          {!loading && !error && active.length === 0 && (
            <div className={styles.hint}>Ei aktiivisia pelejä.</div>
          )}
          {active.map(s => (
            <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} onDelete={() => handleDelete(s.sessionId)} />
          ))}
        </div>

        {finished.length > 0 && (
          <div className={styles.listSection}>
            <div className={styles.sectionTitle}>Päättyneet pelit</div>
            {finished.map(s => (
              <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} onDelete={() => handleDelete(s.sessionId)} label="Katso" />
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

function sessionAge(createdAt: string): string {
  const ts = new Date(createdAt)
  if (isNaN(ts.getTime())) return '–'
  const diffMs = Date.now() - ts.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'juuri nyt'
  if (diffMin < 60) return `${diffMin}min sitten`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h sitten`
  return `${Math.floor(diffH / 24)}pv sitten`
}

function SessionRow({ session, onJoin, onDelete, label = 'Liity' }: {
  session: SessionSummary
  onJoin: () => void
  onDelete: () => void
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const age = session.createdAt ? sessionAge(session.createdAt) : '–'

  function copyId() {
    navigator.clipboard.writeText(session.sessionId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className={styles.sessionRow}>
      <div className={styles.sessionInfo}>
        <div className={styles.sessionIdRow}>
          <span className={styles.sessionId}>{session.sessionId}</span>
          <button className={styles.copyBtn} onClick={copyId} title="Kopioi koodi">
            {copied ? '✓' : '⎘'}
          </button>
        </div>
        <div className={styles.sessionMeta}>{session.playerCount} pelaajaa · {age}</div>
      </div>
      <button className={styles.joinBtn} onClick={onJoin}>{label}</button>
      <button className={styles.deleteBtn} onClick={onDelete} title="Poista peli">✕</button>
    </div>
  )
}

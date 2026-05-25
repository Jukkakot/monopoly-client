import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { listSessions, sessionExists, deleteSession, createSession } from '../api/sessionApi'
import type { SessionSummary } from '../types/api'
import { saveTokenShapes } from '../utils/tokenShapes'
import { randomHumanName, randomBotName } from '../utils/playerNames'
import styles from './SessionListScreen.module.css'
import { useT } from '../i18n/LanguageContext'
import Header from '../components/layout/Header'

export default function SessionListScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const t = useT()
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadStartRef] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinChecking, setJoinChecking] = useState(false)
  const [lastSession, setLastSession] = useState<string | null>(() => {
    try { return localStorage.getItem('monopoly_last_session') } catch { return null }
  })
  const [lastSessionExists, setLastSessionExists] = useState<boolean | null>(null)

  useEffect(() => {
    if (!lastSession) return
    sessionExists(lastSession).then(exists => setLastSessionExists(exists)).catch(() => setLastSessionExists(false))
  }, [lastSession])

  useEffect(() => {
    if (!initialLoading) return
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - loadStartRef) / 1000)), 500)
    return () => clearInterval(timer)
  }, [initialLoading, loadStartRef])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const list = await listSessions()
      setSessions(list)
      setInitialLoading(false)
    } catch {
      setError(t.sessionsLoadFailed)
      setInitialLoading(false)
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
      const res = await fetch(`${import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'}/sessions/${code}/snapshot`)
      if (!res.ok) {
        setJoinError(t.gameNotFoundErr)
        return
      }
      const snap = await res.json() as { status: string }
      if (snap.status === 'LOBBY') {
        navigate(`/lobby-wait/${code}`)
      } else {
        joinSession(code)
        navigate(`/game/${code}`)
      }
    } catch {
      setJoinError(t.connectionErr)
    } finally {
      setJoinChecking(false)
    }
  }

  async function handleDelete(sessionId: string) {
    if (!confirm(t.deleteGameConfirm(sessionId))) return
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
      const { sessionId, hostToken } = await createSession({ names, colors, seatKinds, difficulties })
      try { localStorage.setItem(`monopoly_host_${sessionId}`, hostToken) } catch {}
      const shapes = (['circle', 'star', 'square', 'diamond'] as const).slice(0, 1 + bots)
      saveTokenShapes(sessionId, [...shapes])
      joinSession(sessionId)
      navigate(`/game/${sessionId}`)
    } catch {
      setError(t.quickStartFailed)
      setLoading(false)
    }
  }

  function sessionAge(createdAt: string): string {
    const ts = new Date(createdAt)
    if (isNaN(ts.getTime())) return '–'
    const diffMs = Date.now() - ts.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return t.timeJustNow
    if (diffMin < 60) return t.timeMinAgo(diffMin)
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return t.timeHourAgo(diffH)
    return t.timeDayAgo(diffH / 24)
  }

  const lobby = sessions.filter(s => s.status === 'LOBBY')
  const active = sessions.filter(s => s.status === 'IN_PROGRESS')
  const finished = sessions.filter(s => s.status === 'GAME_OVER')

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.card}>
        <div className={styles.logoBox}>
          <div className={styles.logo}>Monopoly</div>
          <div className={styles.sub}>Helsinki Edition</div>
        </div>

        {initialLoading && (
          <div className={styles.wakingOverlay}>
            <div className={styles.diceSpinner}>🎲</div>
            <div className={styles.wakingTitle}>{t.backendWaking}</div>
            <div className={styles.wakingHint}>{t.backendWakingHint}</div>
            <div className={styles.wakingTimer}>{t.backendWakingSeconds(elapsed)}</div>
          </div>
        )}

        {lastSession && lastSessionExists === true && (
          <div className={styles.rejoinBanner}>
            <div className={styles.rejoinInfo}>
              <span>{t.rejoinBanner}</span>
              <span className={styles.rejoinCode}>{lastSession}</span>
            </div>
            <button
              className={styles.rejoinBtn}
              onClick={() => { joinSession(lastSession); navigate(`/game/${lastSession}`) }}
            >
              {t.joinLabel}
            </button>
            <button
              className={styles.rejoinDismiss}
              onClick={() => { setLastSession(null); try { localStorage.removeItem('monopoly_last_session') } catch {} }}
              title="Poista"
            >✕</button>
          </div>
        )}

        <div className={styles.quickSection}>
          <button className={styles.newBtn} onClick={() => navigate('/lobby')}>
            {t.newGameBtn}
          </button>
          <div className={styles.quickDivider}>{t.quickStartLabel}</div>
          <div className={styles.quickRow}>
            <button className={styles.quickBtn} onClick={() => handleQuickStart(1)} disabled={loading} title={t.quickStartHint}>
              ⚡ 1 vs 1
            </button>
            <button className={styles.quickBtn} onClick={() => handleQuickStart(2)} disabled={loading} title={t.quickStartHint}>
              ⚡ 1 vs 2
            </button>
            <button className={styles.quickBtn} onClick={() => handleQuickStart(3)} disabled={loading} title={t.quickStartHint}>
              ⚡ 1 vs 3
            </button>
          </div>
          <div className={styles.quickHint}>{t.quickStartHint}</div>
        </div>

        <div className={styles.joinCodeSection}>
          <div className={styles.sectionTitle}>{t.joinByCodeTitle}</div>
          <div className={styles.joinCodeRow}>
            <input
              className={styles.joinCodeInput}
              type="text"
              placeholder={t.joinCodePlaceholder}
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value); setJoinError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleJoinByCode()}
              disabled={joinChecking}
            />
            <button className={styles.joinCodeBtn} onClick={handleJoinByCode} disabled={joinChecking}>
              {joinChecking ? t.joiningLabel : t.joinBtnLabel}
            </button>
          </div>
          {joinError && <div className={styles.joinError}>{joinError}</div>}
        </div>

        {lobby.length > 0 && (
          <div className={styles.listSection}>
            <div className={styles.sectionTitle}>{t.waitingRoomsTitle}</div>
            {lobby.map(s => (
              <SessionRow key={s.sessionId} session={s}
                onJoin={() => navigate(`/lobby-wait/${s.sessionId}`)}
                onDelete={() => handleDelete(s.sessionId)}
                label={t.joinLobbyLabel}
                playerCountMeta={t.playerCountMeta}
                sessionAge={sessionAge} />
            ))}
          </div>
        )}

        <div className={styles.listSection}>
          <div className={styles.sectionTitle}>{t.activeGamesTitle}</div>
          {loading && <div className={styles.hint}>{t.loading}</div>}
          {error && <div className={styles.errorMsg}>{error}</div>}
          {!loading && !error && active.length === 0 && (
            <div className={styles.hint}>{t.noActiveGames}</div>
          )}
          {active.map(s => (
            <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} onDelete={() => handleDelete(s.sessionId)}
              label={t.joinLabel} playerCountMeta={t.playerCountMeta} sessionAge={sessionAge} />
          ))}
        </div>

        {finished.length > 0 && (
          <div className={styles.listSection}>
            <div className={styles.sectionTitle}>{t.finishedGamesTitle}</div>
            {finished.map(s => (
              <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} onDelete={() => handleDelete(s.sessionId)}
                label={t.watchLabel} playerCountMeta={t.playerCountMeta} sessionAge={sessionAge} />
            ))}
          </div>
        )}

        <button className={styles.refreshBtn} onClick={load}>
          {t.refreshBtn}
        </button>
      </div>
    </div>
  )
}

function SessionRow({ session, onJoin, onDelete, label, playerCountMeta, sessionAge }: {
  session: SessionSummary
  onJoin: () => void
  onDelete: () => void
  label: string
  playerCountMeta: (n: number) => string
  sessionAge: (createdAt: string) => string
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
        <div className={styles.sessionMeta}>
          {playerCountMeta(session.playerNames?.length ?? 0)}
          {session.playerNames?.length > 0 && ` · ${session.playerNames.join(', ')}`}
          {session.createdAt && ` · ${age}`}
        </div>
      </div>
      <button className={styles.joinBtn} onClick={onJoin}>{label}</button>
      <button className={styles.deleteBtn} onClick={onDelete} title="Poista peli">✕</button>
    </div>
  )
}

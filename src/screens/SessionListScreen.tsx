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
import DiceSpinner from '../components/common/DiceSpinner'

function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={styles.listSection}>
      <button className={styles.sectionToggle} onClick={() => setOpen(v => !v)}>
        <span className={styles.sectionTitle}>{title}</span>
        <span className={styles.sectionChevron}>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  )
}

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
      const allColors = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#f4511e']
      const allShapes = ['circle', 'star', 'square', 'diamond'] as const
      const shuffledColors = [...allColors].sort(() => Math.random() - 0.5).slice(0, 1 + bots)
      const shuffledShapes = [...allShapes].sort(() => Math.random() - 0.5).slice(0, 1 + bots)
      const seatKinds = ['HUMAN', ...Array(bots).fill('BOT')] as ('HUMAN' | 'BOT')[]
      const { sessionId, hostToken } = await createSession({ names, colors: shuffledColors, seatKinds })
      try { localStorage.setItem(`monopoly_host_${sessionId}`, hostToken) } catch {}
      const shapes = shuffledShapes
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
      <main className={styles.card}>

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
              title={t.deleteGameTitle}
            >✕</button>
          </div>
        )}

        <div className={styles.cols}>

          <div className={styles.leftCol}>
            <div className={styles.logoBox}>
              <div className={styles.logo}>Monopoly</div>
              <div className={styles.sub}>Helsinki Edition</div>
              <div className={styles.version}>v{__APP_VERSION__} · {__BUILD_TIME__}</div>
            </div>
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
          </div>

          <div className={styles.rightCol}>
            {initialLoading && (
              <DiceSpinner
                message={t.backendWaking}
                hint={t.backendWakingHint}
                elapsed={elapsed}
              />
            )}

            {lobby.length > 0 && (
              <CollapsibleSection title={t.waitingRoomsTitle} defaultOpen>
                {lobby.map(s => (
                  <SessionRow key={s.sessionId} session={s}
                    onJoin={() => navigate(`/lobby-wait/${s.sessionId}`)}
                    onDelete={() => handleDelete(s.sessionId)}
                    label={t.joinLobbyLabel}
                    playerCountMeta={t.playerCountMeta}
                    sessionAge={sessionAge} />
                ))}
              </CollapsibleSection>
            )}

            <CollapsibleSection title={t.activeGamesTitle} defaultOpen>
              {loading && <div className={styles.hint}>{t.loading}</div>}
              {error && <div className={styles.errorMsg}>{error}</div>}
              {!loading && !error && active.length === 0 && (
                <div className={styles.hint}>{t.noActiveGames}</div>
              )}
              {active.map(s => (
                <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} onDelete={() => handleDelete(s.sessionId)}
                  label={t.joinLabel} playerCountMeta={t.playerCountMeta} sessionAge={sessionAge} />
              ))}
            </CollapsibleSection>

            {finished.length > 0 && (
              <CollapsibleSection title={t.finishedGamesTitle} defaultOpen={false}>
                {finished.map(s => (
                  <SessionRow key={s.sessionId} session={s} onJoin={() => handleJoin(s)} onDelete={() => handleDelete(s.sessionId)}
                    label={t.watchLabel} playerCountMeta={t.playerCountMeta} sessionAge={sessionAge} />
                ))}
              </CollapsibleSection>
            )}

            <button className={styles.refreshBtn} onClick={load}>
              {t.refreshBtn}
            </button>
          </div>

        </div>
      </main>
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
  const t = useT()
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
          <button className={styles.copyBtn} onClick={copyId} title={t.copyCodeTitle}>
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
      <button className={styles.deleteBtn} onClick={onDelete} title={t.deleteGameTitle}>✕</button>
    </div>
  )
}

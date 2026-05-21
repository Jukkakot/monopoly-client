import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { joinLobby, startLobby, sseUrl } from '../api/sessionApi'
import type { ClientSessionSnapshot, SeatState } from '../types/api'
import styles from './LobbyWaitingScreen.module.css'
import { useT } from '../i18n/LanguageContext'

export default function LobbyWaitingScreen() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const t = useT()

  const [seats, setSeats] = useState<SeatState[]>([])
  const [status, setStatus] = useState<string>('LOBBY')
  const [name, setName] = useState(() => {
    try { return localStorage.getItem('monopoly_last_name') ?? '' } catch { return '' }
  })
  const [myPlayerId, setMyPlayerId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(`monopoly_player_${sessionId}`) } catch { return null }
  })
  const [joining, setJoining] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const navigatedRef = useRef(false)

  useEffect(() => {
    if (!sessionId) return
    const es = new EventSource(sseUrl(sessionId))
    es.onmessage = (e) => {
      try {
        const snap: ClientSessionSnapshot = JSON.parse(e.data)
        if (snap.state) {
          setSeats(snap.state.seats)
          setStatus(snap.state.status)
          if (snap.state.status === 'IN_PROGRESS' && !navigatedRef.current) {
            navigatedRef.current = true
            es.close()
            joinSession(sessionId)
            navigate(`/game/${sessionId}`)
          }
        }
      } catch {}
    }
    return () => { if (!navigatedRef.current) es.close() }
  }, [sessionId, navigate, joinSession])

  async function handleJoin() {
    if (!sessionId || !name.trim()) return
    setError(null)
    setJoining(true)
    try {
      const res = await joinLobby(sessionId, name.trim())
      try { sessionStorage.setItem(`monopoly_player_${sessionId}`, res.playerId) } catch {}
      try { sessionStorage.setItem(`monopoly_token_${sessionId}`, res.playerToken) } catch {}
      try { localStorage.setItem(`monopoly_token_${sessionId}_${res.playerId}`, res.playerToken) } catch {}
      try { localStorage.setItem('monopoly_last_name', name.trim()) } catch {}
      setMyPlayerId(res.playerId)
    } catch {
      setError(t.joinFailedErr)
    } finally {
      setJoining(false)
    }
  }

  async function handleStart() {
    if (!sessionId) return
    setError(null)
    setStarting(true)
    try {
      await startLobby(sessionId)
    } catch {
      setError(t.startFailedErr)
      setStarting(false)
    }
  }

  function copyId() {
    if (!sessionId) return
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const joinedSeats = seats.filter(s => s.joined)
  const freeSeats = seats.filter(s => !s.joined)
  const alreadyJoined = !!myPlayerId
  const canStart = joinedSeats.length >= 2

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoBox}>
          <div className={styles.logo}>Monopoly</div>
          <div className={styles.sub}>{t.waitingRoomSubtitle}</div>
        </div>

        <div className={styles.idRow}>
          <span className={styles.idLabel}>{t.gamePinLabel2}</span>
          <span className={styles.idCode}>{sessionId}</span>
          <button className={styles.copyBtn} onClick={copyId} title="Kopioi koodi">
            {copied ? '✓' : '⎘'}
          </button>
        </div>

        <div className={styles.seatSection}>
          <div className={styles.sectionTitle}>{t.seatsLabel(joinedSeats.length, seats.length)}</div>
          {joinedSeats.map(s => (
            <div key={s.seatId} className={styles.seatRow}>
              <span
                className={styles.seatDot}
                style={{ background: s.tokenColorHex }}
              />
              <span className={styles.seatName}>{s.displayName ?? '–'}</span>
              {s.playerId === myPlayerId && <span className={styles.meTag}>{t.youBadge}</span>}
            </div>
          ))}
          {freeSeats.map(s => (
            <div key={s.seatId} className={`${styles.seatRow} ${styles.freeSeat}`}>
              <span className={styles.seatDot} style={{ background: s.tokenColorHex, opacity: 0.3 }} />
              <span className={styles.seatNameFree}>{t.freeSeatLabel}</span>
            </div>
          ))}
        </div>

        {!alreadyJoined && (
          <div className={styles.joinSection}>
            <div className={styles.sectionTitle}>{t.joinGameTitle}</div>
            <div className={styles.joinRow}>
              <input
                className={styles.nameInput}
                type="text"
                placeholder={t.yourNamePlaceholder}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                disabled={joining}
                maxLength={20}
              />
              <button
                className={styles.joinBtn}
                onClick={handleJoin}
                disabled={joining || !name.trim() || freeSeats.length === 0}
              >
                {joining ? '…' : t.joinBtnLabel}
              </button>
            </div>
            {freeSeats.length === 0 && (
              <div className={styles.hint}>{t.lobbyFullMsg}</div>
            )}
          </div>
        )}

        {alreadyJoined && (
          <div className={styles.joinedBanner}>
            {t.joinedMsg}
          </div>
        )}

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button
          className={styles.startBtn}
          onClick={handleStart}
          disabled={starting || !canStart || status !== 'LOBBY'}
        >
          {starting ? t.startingBtn : canStart ? t.startBtn : t.needMorePlayers(joinedSeats.length, seats.length)}
        </button>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          {t.backBtn}
        </button>
      </div>
    </div>
  )
}

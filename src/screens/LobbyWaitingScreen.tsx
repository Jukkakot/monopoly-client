import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { joinLobby, addLobbyBot, removeLobbyBot, setLobbyReady, sseUrl, LobbyJoinError } from '../api/sessionApi'
import type { ClientSessionSnapshot, SeatState } from '../types/api'
import DiceSpinner from '../components/common/DiceSpinner'
import styles from './LobbyWaitingScreen.module.css'
import { useT } from '../i18n/LanguageContext'
import { TokenSvg } from '../components/board/TokenSvg'
import { ALL_SHAPES, savePlayerTokenShape, type TokenShape } from '../utils/tokenShapes'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']

export default function LobbyWaitingScreen() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const t = useT()

  const [seats, setSeats] = useState<SeatState[]>([])
  const [status, setStatus] = useState<string>('LOBBY')
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null)
  const [name, setName] = useState(() => {
    try { return localStorage.getItem('monopoly_last_name') ?? '' } catch { return '' }
  })
  const [color, setColor] = useState(() => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
  const [tokenShape, setTokenShape] = useState<TokenShape>(() => {
    const shapes = ALL_SHAPES.map(s => s.key) as TokenShape[]
    return shapes[Math.floor(Math.random() * shapes.length)]
  })
  const [myPlayerId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(`monopoly_player_${sessionId}`) } catch { return null }
  })
  const [myPlayerToken] = useState<string | null>(() => {
    try { return sessionStorage.getItem(`monopoly_token_${sessionId}`) } catch { return null }
  })
  const [hostToken] = useState<string | null>(() => {
    try { return localStorage.getItem(`monopoly_host_${sessionId}`) } catch { return null }
  })
  // Auto-pick a non-taken color when the seat list updates (avoids submitting with a taken color)
  useEffect(() => {
    if (alreadyJoined) return
    const takenColors = seats.map(s => s.tokenColorHex?.toUpperCase())
    if (takenColors.includes(color.toUpperCase())) {
      const free = PRESET_COLORS.find(c => !takenColors.includes(c.toUpperCase()))
      if (free) setColor(free)
    }
  }, [seats]) // eslint-disable-line react-hooks/exhaustive-deps

  const [joining, setJoining] = useState(false)
  const [settingReady, setSettingReady] = useState(false)
  const [addingBot, setAddingBot] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const navigatedRef = useRef(false)

  const isHost = !!hostToken
  const mySeat = seats.find(s => s.playerId === myPlayerId)
  const alreadyJoined = !!myPlayerId && !!mySeat
  const humanSeats = seats.filter(s => s.seatKind === 'HUMAN')
  const botSeats = seats.filter(s => s.seatKind === 'BOT')
  const readyCount = humanSeats.filter(s => s.ready).length
  const totalHumans = humanSeats.length
  const canAddBot = seats.length < 6

  useEffect(() => {
    if (!sessionId) return
    const es = new EventSource(sseUrl(sessionId))
    es.onmessage = (e) => {
      try {
        const snap: ClientSessionSnapshot = JSON.parse(e.data)
        if (snap.state) {
          setSeats(snap.state.seats)
          setStatus(snap.state.status)
          setHostPlayerId(snap.state.hostPlayerId)
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
      const res = await joinLobby(sessionId, name.trim(), color)
      try { sessionStorage.setItem(`monopoly_player_${sessionId}`, res.playerId) } catch {}
      try { sessionStorage.setItem(`monopoly_token_${sessionId}`, res.playerToken) } catch {}
      try { localStorage.setItem(`monopoly_token_${sessionId}_${res.playerId}`, res.playerToken) } catch {}
      try { localStorage.setItem('monopoly_last_name', name.trim()) } catch {}
      // Save chosen token shape so the game screen picks it up
      savePlayerTokenShape(sessionId, res.playerId, tokenShape)
      // Reload to pick up the new credentials from sessionStorage
      window.location.reload()
    } catch (e) {
      if (e instanceof LobbyJoinError) {
        if (e.code === 'name_taken') setError(t.nameTakenErr)
        else if (e.code === 'color_taken') setError(t.colorUsedByOther)
        else setError(t.joinFailedErr)
      } else {
        setError(t.joinFailedErr)
      }
      setJoining(false)
    }
  }

  async function handleReady(ready: boolean) {
    if (!sessionId || !myPlayerId || !myPlayerToken) return
    setSettingReady(true)
    try {
      await setLobbyReady(sessionId, myPlayerId, myPlayerToken, ready)
    } catch {
      setError(t.joinFailedErr)
    } finally {
      setSettingReady(false)
    }
  }

  async function handleAddBot() {
    if (!sessionId || !hostToken) return
    setAddingBot(true)
    try {
      await addLobbyBot(sessionId, hostToken)
    } catch {
      setError(t.joinFailedErr)
    } finally {
      setAddingBot(false)
    }
  }

  async function handleRemoveBot(seatId: string) {
    if (!sessionId || !hostToken) return
    try {
      await removeLobbyBot(sessionId, seatId, hostToken)
    } catch {
      setError(t.joinFailedErr)
    }
  }

  function copyId() {
    if (!sessionId) return
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const myReady = mySeat?.ready ?? false

  return (
    <div className={styles.page}>
      {joining && <DiceSpinner message={t.joiningLabel} overlay />}
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
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              {t.seatsLabel(humanSeats.filter(s => s.joined).length + botSeats.length, seats.length)}
            </span>
            {totalHumans > 0 && (
              <span className={styles.readyCount}>
                {t.readyCount(readyCount, totalHumans)}
              </span>
            )}
          </div>

          {humanSeats.map(s => (
            <div key={s.seatId} className={styles.seatRow}>
              <span className={styles.seatDot} style={{ background: s.tokenColorHex }} />
              <span className={styles.seatName}>
                {s.displayName ?? '–'}
                {s.playerId === hostPlayerId && <span className={styles.hostTag}> 👑</span>}
              </span>
              {s.playerId === myPlayerId && <span className={styles.meTag}>{t.youBadge}</span>}
              <span className={`${styles.readyBadge} ${s.ready ? styles.readyBadgeYes : styles.readyBadgeNo}`}>
                {s.ready ? '✓' : '…'}
              </span>
            </div>
          ))}

          {botSeats.map(s => (
            <div key={s.seatId} className={styles.seatRow}>
              <span className={styles.seatDot} style={{ background: s.tokenColorHex }} />
              <span className={styles.seatName}>🤖 {s.displayName ?? '–'}</span>
              {s.botDifficulty && (
                <span className={styles.diffBadge}>{s.botDifficulty === 'EASY' ? t.easyLabel : s.botDifficulty === 'STRONG' ? t.strongLabel : t.normalLabel}</span>
              )}
              <span className={`${styles.readyBadge} ${styles.readyBadgeYes}`}>✓</span>
              {isHost && (
                <button
                  className={styles.removeBotBtn}
                  onClick={() => handleRemoveBot(s.seatId)}
                  title={t.removeBotBtn}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Join form — for visitors who haven't joined yet */}
        {!alreadyJoined && status === 'LOBBY' && (
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
                disabled={joining || !name.trim() || seats.length >= 6}
              >
                {joining ? '…' : t.joinBtnLabel}
              </button>
            </div>
            <div className={styles.colorRow}>
              {PRESET_COLORS.map(c => {
                const taken = seats.some(s => s.tokenColorHex?.toUpperCase() === c.toUpperCase())
                return (
                  <button key={c}
                    className={`${styles.colorDot} ${color === c ? styles.colorDotSelected : ''} ${taken ? styles.colorDotTaken : ''}`}
                    style={{ background: c }}
                    title={taken ? 'Varattu' : c}
                    disabled={taken}
                    onClick={() => !taken && setColor(c)} />
                )
              })}
            </div>
            <div className={styles.shapeRow}>
              {ALL_SHAPES.map(s => (
                <button key={s.key}
                  className={`${styles.shapeBtn} ${tokenShape === s.key ? styles.shapeBtnSelected : ''}`}
                  style={tokenShape === s.key ? { borderColor: color } : {}}
                  onClick={() => setTokenShape(s.key as TokenShape)}>
                  <TokenSvg color={tokenShape === s.key ? color : '#bbb'} shape={s.key as TokenShape} size={20} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ready button — for joined human players */}
        {alreadyJoined && status === 'LOBBY' && (
          <button
            className={`${styles.readyBtn} ${myReady ? styles.readyBtnActive : ''}`}
            onClick={() => handleReady(!myReady)}
            disabled={settingReady}
          >
            {myReady ? t.cancelReadyBtn : t.readyBtn}
          </button>
        )}

        {/* Host: add bot button */}
        {isHost && status === 'LOBBY' && (
          <button
            className={styles.addBotBtn}
            onClick={handleAddBot}
            disabled={addingBot || !canAddBot}
          >
            + {t.addBotBtn}
          </button>
        )}

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.hint}>
          {status === 'LOBBY'
            ? t.waitingForReady(readyCount, totalHumans)
            : t.gameStarting}
        </div>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          {t.backBtn}
        </button>
      </div>
    </div>
  )
}

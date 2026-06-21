import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { createLobby, createBotsOnlySession, addLobbyBot, setLobbyReady, ApiError } from '../api/sessionApi'
import { ALL_SHAPES, savePlayerTokenShape, type TokenShape } from '../utils/tokenShapes'
import { randomHumanName } from '../utils/playerNames'
import { playButtonClick } from '../utils/sounds'
import { TokenSvg } from '../components/board/TokenSvg'
import Header from '../components/layout/Header'
import DiceSpinner from '../components/common/DiceSpinner'
import styles from './LobbyScreen.module.css'
import { useT } from '../i18n/LanguageContext'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']

type Mode = 'playing' | 'spectating'

function serverErrorMsg(e: unknown, t: ReturnType<typeof useT>): string {
  if (e instanceof ApiError && e.status === 503) {
    if (e.code === 'MAX_SESSIONS_REACHED') return t.serverFullErr
    return t.serverBusyErr
  }
  return t.lobbyFailedErr(String(e))
}

export default function LobbyScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const t = useT()

  const [mode, setMode] = useState<Mode>('playing')
  const [name, setName] = useState(() => randomHumanName([]))
  const [color, setColor] = useState(() => PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
  const [tokenShape, setTokenShape] = useState<TokenShape>(() => ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)].key)
  const [botCount, setBotCount] = useState(0)
  const [botStrategy, setBotStrategy] = useState<'pure-domain-v1' | 'utility-v1'>('utility-v1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function randomize() {
    playButtonClick()
    setName(randomHumanName([]))
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    setTokenShape(ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)].key)
  }

  const isPlaying = mode === 'playing'
  const minBots = isPlaying ? 0 : 2
  const maxBots = isPlaying ? 5 : 6

  function switchMode(m: Mode) {
    playButtonClick()
    setMode(m)
    if (m === 'spectating' && botCount < 2) setBotCount(2)
    setError(null)
  }

  async function handleCreateLobby() {
    if (!name.trim()) { setError(t.nameRequiredErr); return }
    setError(null)
    playButtonClick()
    setLoading(true)
    try {
      const result = await createLobby(name.trim(), color, botStrategy)
      savePlayerTokenShape(result.sessionId, result.playerId, tokenShape)
      try { localStorage.setItem(`monopoly_host_${result.sessionId}`, result.hostToken) } catch {}
      try { sessionStorage.setItem(`monopoly_player_${result.sessionId}`, result.playerId) } catch {}
      try { sessionStorage.setItem(`monopoly_token_${result.sessionId}`, result.playerToken) } catch {}
      try { localStorage.setItem(`monopoly_token_${result.sessionId}_${result.playerId}`, result.playerToken) } catch {}
      for (let i = 0; i < botCount; i++) {
        await addLobbyBot(result.sessionId, result.hostToken)
      }
      joinSession(result.sessionId)
      navigate(`/lobby-wait/${result.sessionId}`)
    } catch (e) {
      setError(serverErrorMsg(e, t))
      setLoading(false)
    }
  }

  async function handleStartNow() {
    if (isPlaying && !name.trim()) { setError(t.nameRequiredErr); return }
    setError(null)
    playButtonClick()
    setLoading(true)
    try {
      if (!isPlaying) {
        const { sessionId } = await createBotsOnlySession(botCount, botStrategy)
        joinSession(sessionId)
        navigate(`/game/${sessionId}`)
      } else {
        const result = await createLobby(name.trim(), color, botStrategy)
        savePlayerTokenShape(result.sessionId, result.playerId, tokenShape)
        try { localStorage.setItem(`monopoly_host_${result.sessionId}`, result.hostToken) } catch {}
        try { sessionStorage.setItem(`monopoly_player_${result.sessionId}`, result.playerId) } catch {}
        try { sessionStorage.setItem(`monopoly_token_${result.sessionId}`, result.playerToken) } catch {}
        try { localStorage.setItem(`monopoly_token_${result.sessionId}_${result.playerId}`, result.playerToken) } catch {}
        for (let i = 0; i < botCount; i++) {
          await addLobbyBot(result.sessionId, result.hostToken)
        }
        await setLobbyReady(result.sessionId, result.playerId, result.playerToken, true)
        joinSession(result.sessionId)
        navigate(`/game/${result.sessionId}`)
      }
    } catch (e) {
      setError(serverErrorMsg(e, t))
      setLoading(false)
    }
  }

  const canStartNow = isPlaying ? name.trim().length > 0 && botCount >= 1 : botCount >= 2
  const canCreateLobby = name.trim().length > 0

  return (
    <div className={styles.page}>
      <Header />
      {loading && <DiceSpinner message={t.creatingLabel} overlay />}
      <div className={styles.card}>
        <div className={styles.logoBox}>
          <div className={styles.logo}>Monopoly</div>
          <div className={styles.sub}>Helsinki Edition</div>
        </div>

        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${isPlaying ? styles.toggleActive : ''}`}
            onClick={() => switchMode('playing')}
          >
            {t.playingToggle}
          </button>
          <button
            className={`${styles.toggleBtn} ${!isPlaying ? styles.toggleActive : ''}`}
            onClick={() => switchMode('spectating')}
          >
            {t.spectatingToggle}
          </button>
        </div>

        {isPlaying && (
          <div className={styles.createSection}>
            <div className={styles.sectionTitle}>{t.yourNamePlaceholder}</div>
            <div className={styles.nameRow}>
              <input
                className={styles.nameInput}
                type="text"
                placeholder={t.yourNamePlaceholder}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateLobby()}
                disabled={loading}
                maxLength={20}
                autoFocus
              />
              <button className={styles.randomizeBtn} onClick={randomize} disabled={loading} title={t.randomizeBtn}>
                🎲
              </button>
            </div>
            <div className={styles.colorRow}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.colorDot} ${color === c ? styles.selected : ''}`}
                  style={{ background: c }}
                  onClick={() => { playButtonClick(); setColor(c) }}
                />
              ))}
            </div>
            <div className={styles.shapeRow}>
              {ALL_SHAPES.map(s => (
                <button
                  key={s.key}
                  className={`${styles.shapeBtn} ${tokenShape === s.key ? styles.shapeSelected : ''}`}
                  style={tokenShape === s.key ? { borderColor: color } : {}}
                  onClick={() => { playButtonClick(); setTokenShape(s.key) }}
                  title={s.key}
                >
                  <TokenSvg color={tokenShape === s.key ? color : '#bbb'} shape={s.key} size={20} />
                </button>
              ))}
              <div className={styles.tokenPreview}>
                <TokenSvg color={color} shape={tokenShape} size={32} />
              </div>
            </div>
          </div>
        )}

        <div className={styles.divider} />

        <div className={styles.botsSection}>
          <div className={styles.sectionTitle}>{t.opponentsTitle}</div>
          <div className={styles.botCountRow}>
            <button
              className={styles.botCountBtn}
              onClick={() => { playButtonClick(); setBotCount(c => Math.max(minBots, c - 1)) }}
              disabled={loading || botCount <= minBots}
            >−</button>
            <span className={styles.botCountLabel}>{t.computerPlayersLabel(botCount)}</span>
            <button
              className={styles.botCountBtn}
              onClick={() => { playButtonClick(); setBotCount(c => Math.min(maxBots, c + 1)) }}
              disabled={loading || botCount >= maxBots}
            >+</button>
          </div>
          <div className={styles.sectionTitle}>{t.botStrategyLabel}</div>
          <div className={styles.toggle}>
            <button
              className={`${styles.toggleBtn} ${botStrategy === 'pure-domain-v1' ? styles.toggleActive : ''}`}
              onClick={() => { playButtonClick(); setBotStrategy('pure-domain-v1') }}
              disabled={loading}
            >
              {t.botStrategyClassic}
            </button>
            <button
              className={`${styles.toggleBtn} ${botStrategy === 'utility-v1' ? styles.toggleActive : ''}`}
              onClick={() => { playButtonClick(); setBotStrategy('utility-v1') }}
              disabled={loading}
            >
              {t.botStrategyUtility}
            </button>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.actionBtns}>
          {isPlaying && (
            <div className={styles.btnGroup}>
              <button
                className={styles.createBtn}
                onClick={handleCreateLobby}
                disabled={loading || !canCreateLobby}
              >
                {t.createLobbyBtn}
              </button>
              <div className={styles.btnHint}>{t.lobbyWaitHint}</div>
            </div>
          )}
          <button
            className={styles.startNowBtn}
            onClick={handleStartNow}
            disabled={loading || !canStartNow}
          >
            {t.startNowBtn}
          </button>
        </div>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          {t.backBtn}
        </button>
      </div>
    </div>
  )
}

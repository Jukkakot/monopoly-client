import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { createLobby, createBotsOnlySession } from '../api/sessionApi'
import { ALL_SHAPES, saveTokenShapes, type TokenShape } from '../utils/tokenShapes'
import { randomHumanName } from '../utils/playerNames'
import { playButtonClick } from '../utils/sounds'
import { TokenSvg } from '../components/board/TokenSvg'
import Header from '../components/layout/Header'
import DiceSpinner from '../components/common/DiceSpinner'
import styles from './LobbyScreen.module.css'
import { useT } from '../i18n/LanguageContext'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']

export default function LobbyScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const t = useT()

  const [name, setName] = useState(() => {
    try { return localStorage.getItem('monopoly_last_name') ?? '' } catch { return '' }
  })
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [tokenShape, setTokenShape] = useState<TokenShape>('circle')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [botCount, setBotCount] = useState(3)
  const [startingBots, setStartingBots] = useState(false)

  function randomize() {
    playButtonClick()
    setName(randomHumanName([]))
    setColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
    setTokenShape(ALL_SHAPES[Math.floor(Math.random() * ALL_SHAPES.length)].key)
  }

  async function handleCreate() {
    if (!name.trim()) { setError(t.nameRequiredErr); return }
    setError(null)
    playButtonClick()
    setLoading(true)
    try {
      const result = await createLobby(name.trim(), color)
      saveTokenShapes(result.sessionId, [tokenShape])
      try { localStorage.setItem(`monopoly_host_${result.sessionId}`, result.hostToken) } catch {}
      try { sessionStorage.setItem(`monopoly_player_${result.sessionId}`, result.playerId) } catch {}
      try { sessionStorage.setItem(`monopoly_token_${result.sessionId}`, result.playerToken) } catch {}
      try { localStorage.setItem(`monopoly_token_${result.sessionId}_${result.playerId}`, result.playerToken) } catch {}
      try { localStorage.setItem('monopoly_last_name', name.trim()) } catch {}
      joinSession(result.sessionId)
      navigate(`/lobby-wait/${result.sessionId}`)
    } catch (e) {
      setError(t.lobbyFailedErr(String(e)))
      setLoading(false)
    }
  }

  async function handleStartBots() {
    setError(null)
    playButtonClick()
    setStartingBots(true)
    try {
      const { sessionId } = await createBotsOnlySession(botCount)
      joinSession(sessionId)
      navigate(`/game/${sessionId}`)
    } catch (e) {
      setError(t.lobbyFailedErr(String(e)))
      setStartingBots(false)
    }
  }

  return (
    <div className={styles.page}>
      <Header />
      {(loading || startingBots) && (
        <DiceSpinner
          message={startingBots ? t.startingLabel : t.creatingLabel}
          overlay
        />
      )}
      <div className={styles.card}>
        <div className={styles.logoBox}>
          <div className={styles.logo}>Monopoly</div>
          <div className={styles.sub}>Helsinki Edition</div>
        </div>

        <div className={styles.createSection}>
          <div className={styles.sectionTitle}>{t.yourNamePlaceholder}</div>
          <input
            className={styles.nameInput}
            type="text"
            placeholder={t.yourNamePlaceholder}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            disabled={loading}
            maxLength={20}
            autoFocus
          />
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

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.actionRow}>
          <button className={styles.randomBtn} onClick={randomize} disabled={loading} title={t.randomizeBtn}>
            {t.randomizeBtn}
          </button>
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={loading || !name.trim()}
          >
            {loading ? t.creatingLabel : t.createLobbyBtn}
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.botsSection}>
          <div className={styles.sectionTitle}>{t.watchBotsTitle}</div>
          <div className={styles.botCountRow}>
            <button
              className={styles.botCountBtn}
              onClick={() => { playButtonClick(); setBotCount(c => Math.max(2, c - 1)) }}
              disabled={startingBots || botCount <= 2}
            >−</button>
            <span className={styles.botCountLabel}>{t.botCountLabel(botCount)}</span>
            <button
              className={styles.botCountBtn}
              onClick={() => { playButtonClick(); setBotCount(c => Math.min(5, c + 1)) }}
              disabled={startingBots || botCount >= 5}
            >+</button>
          </div>
          <button
            className={styles.botsBtn}
            onClick={handleStartBots}
            disabled={startingBots || loading}
          >
            {startingBots ? t.startingLabel : t.startBotsBtn}
          </button>
        </div>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          {t.backBtn}
        </button>
      </div>
    </div>
  )
}

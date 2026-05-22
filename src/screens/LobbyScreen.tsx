import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { createLobby } from '../api/sessionApi'
import { playButtonClick } from '../utils/sounds'
import Header from '../components/layout/Header'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) { setError(t.nameRequiredErr); return }
    setError(null)
    playButtonClick()
    setLoading(true)
    try {
      const result = await createLobby(name.trim(), color)
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

  return (
    <div className={styles.page}>
      <Header snapshot={null} connectionStatus="LIVE" />
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
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button
          className={styles.createBtn}
          onClick={handleCreate}
          disabled={loading || !name.trim()}
        >
          {loading ? t.creatingLabel : t.createLobbyBtn}
        </button>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          {t.backBtn}
        </button>
      </div>
    </div>
  )
}

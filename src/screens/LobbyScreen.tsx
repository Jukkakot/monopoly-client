import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { joinLobby } from '../api/sessionApi'
import { GEOMETRIC_SHAPES, EMOJI_SHAPES, ALL_SHAPES, saveTokenShapes, type TokenShape } from '../utils/tokenShapes'
import { randomHumanName, randomBotName } from '../utils/playerNames'
import { playButtonClick } from '../utils/sounds'
import Header from '../components/layout/Header'
import styles from './LobbyScreen.module.css'
import { useT } from '../i18n/LanguageContext'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']
const DEFAULT_SHAPES: TokenShape[] = ['circle', 'star', 'square', 'diamond', 'triangle', 'hexagon']

interface PlayerRow {
  name: string
  isBot: boolean
  color: string
  tokenShape: TokenShape
}

function makeHumanRow(index: number, usedNames: string[]): PlayerRow {
  return { name: randomHumanName(usedNames), isBot: false, color: PRESET_COLORS[index % PRESET_COLORS.length], tokenShape: DEFAULT_SHAPES[index] ?? 'circle' }
}

function makeBotRow(index: number, usedNames: string[]): PlayerRow {
  return { name: randomBotName(usedNames), isBot: true, color: PRESET_COLORS[index % PRESET_COLORS.length], tokenShape: DEFAULT_SHAPES[index] ?? 'circle' }
}

export default function LobbyScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const t = useT()
  const [rows, setRows] = useState<PlayerRow[]>([makeHumanRow(0, [])])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addBot() {
    if (rows.length >= 6) return
    playButtonClick()
    setRows(prev => {
      const usedNames = prev.map(r => r.name)
      return [...prev, makeBotRow(prev.length, usedNames)]
    })
  }

  function removeRow(i: number) {
    if (i === 0) return
    playButtonClick()
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, patch: Partial<PlayerRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function randomizeAll() {
    playButtonClick()
    const usedNames: string[] = []
    const usedColors = new Set<string>()
    const usedShapes = new Set<TokenShape>()

    const availableColors = [...PRESET_COLORS].sort(() => Math.random() - 0.5)
    const availableShapes = [...ALL_SHAPES].sort(() => Math.random() - 0.5)

    setRows(prev => prev.map((r) => {
      const name = r.isBot ? randomBotName(usedNames) : randomHumanName(usedNames)
      usedNames.push(name)

      let color = availableColors.find(c => !usedColors.has(c)) ?? r.color
      usedColors.add(color)

      let shape = availableShapes.find(s => !usedShapes.has(s.key))?.key ?? r.tokenShape
      usedShapes.add(shape)

      return { ...r, name, color, tokenShape: shape }
    }))
  }

  async function handleCreate() {
    setError(null)
    const usedColors = new Set<string>()
    for (const r of rows) {
      if (!r.name.trim()) { setError(t.nameRequiredErr); return }
      if (usedColors.has(r.color)) { setError(t.colorsUniqueErr); return }
      usedColors.add(r.color)
    }
    playButtonClick()
    setLoading(true)
    try {
      const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
      const res = await fetch(`${BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyMode: true,
          names: rows.map(r => r.name.trim()),
          colors: rows.map(r => r.color),
          seatKinds: rows.map(r => r.isBot ? 'BOT' : 'HUMAN'),
        }),
      })
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const { sessionId, hostToken } = await res.json()
      try { localStorage.setItem(`monopoly_host_${sessionId}`, hostToken) } catch {}
      saveTokenShapes(sessionId, rows.map(r => r.tokenShape))
      const me = rows[0]
      const joined = await joinLobby(sessionId, me.name.trim(), me.color)
      try { sessionStorage.setItem(`monopoly_player_${sessionId}`, joined.playerId) } catch {}
      try { sessionStorage.setItem(`monopoly_token_${sessionId}`, joined.playerToken) } catch {}
      try { localStorage.setItem(`monopoly_token_${sessionId}_${joined.playerId}`, joined.playerToken) } catch {}
      try { localStorage.setItem('monopoly_last_name', me.name.trim()) } catch {}
      joinSession(sessionId)
      navigate(`/lobby-wait/${sessionId}`)
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

        <div className={styles.players}>
          {rows.map((row, i) => (
            <div key={i} className={`${styles.playerRow} ${row.isBot ? styles.playerRowBot : ''}`}>
              <div className={styles.colorRow}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    className={`${styles.colorDot} ${row.color === c ? styles.selected : ''}`}
                    style={{ background: c }}
                    onClick={() => { playButtonClick(); updateRow(i, { color: c }) }}
                    title={c}
                  />
                ))}
              </div>

              <div className={styles.shapeSection}>
                <div className={styles.shapeLabel}>{t.tokenLabel}</div>
                <div className={styles.shapeRow}>
                  {GEOMETRIC_SHAPES.map(s => (
                    <button
                      key={s.key}
                      className={`${styles.shapeBtn} ${row.tokenShape === s.key ? styles.shapeSelected : ''}`}
                      style={row.tokenShape === s.key ? { color: row.color, borderColor: row.color } : {}}
                      onClick={() => { playButtonClick(); updateRow(i, { tokenShape: s.key }) }}
                      title={s.key}
                    >
                      {s.label}
                    </button>
                  ))}
                  {EMOJI_SHAPES.map(s => (
                    <button
                      key={s.key}
                      className={`${styles.shapeBtn} ${row.tokenShape === s.key ? styles.shapeSelected : ''}`}
                      style={row.tokenShape === s.key ? { borderColor: row.color } : {}}
                      onClick={() => { playButtonClick(); updateRow(i, { tokenShape: s.key }) }}
                      title={s.key}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.nameKindRow}>
                <span className={`${styles.kindLabel} ${row.isBot ? styles.bot : styles.human}`}>
                  {row.isBot ? t.botLabel : t.humanLabel}
                </span>
                <input
                  className={styles.nameInput}
                  value={row.name}
                  onChange={e => updateRow(i, { name: e.target.value })}
                  maxLength={20}
                  placeholder={t.playerPlaceholder(i)}
                />
                {i > 0 && (
                  <button className={styles.removeBtn} onClick={() => removeRow(i)} title={t.removePlayerBtn}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {rows.length < 6 && (
          <button className={styles.addPlayerBtn} onClick={addBot} disabled={loading}>
            + {t.addBotBtn}
          </button>
        )}

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.actionRow}>
          <button className={styles.randomBtn} onClick={randomizeAll} disabled={loading} title={t.randomizeBtn}>
            {t.randomizeBtn}
          </button>
          <div className={styles.mainBtns}>
            <div className={styles.btnGroup}>
              <button className={styles.createBtn} onClick={handleCreate} disabled={loading}>
                {loading ? t.creatingLabel : t.createLobbyBtn}
              </button>
              <div className={styles.btnHint}>{t.lobbyHint}</div>
            </div>
          </div>
        </div>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          {t.backBtn}
        </button>
      </div>
    </div>
  )
}

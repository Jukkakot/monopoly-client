import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { createSession, joinLobby } from '../api/sessionApi'
import type { SeatKind } from '../types/api'
import { GEOMETRIC_SHAPES, EMOJI_SHAPES, saveTokenShapes, type TokenShape } from '../utils/tokenShapes'
import { randomHumanName, randomBotName } from '../utils/playerNames'
import styles from './LobbyScreen.module.css'
import { useT } from '../i18n/LanguageContext'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']
const DEFAULT_SHAPES: TokenShape[] = ['circle', 'star', 'square', 'triangle', 'hat', 'car']

interface PlayerRow {
  name: string
  kind: SeatKind
  color: string
  tokenShape: TokenShape
}

function makeRow(index: number, usedNames: string[], kind: SeatKind = 'HUMAN'): PlayerRow {
  const name = kind === 'BOT' ? randomBotName(usedNames) : randomHumanName(usedNames)
  return {
    name,
    kind,
    color: PRESET_COLORS[index % PRESET_COLORS.length],
    tokenShape: DEFAULT_SHAPES[index] ?? 'circle',
  }
}

export default function LobbyScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const t = useT()
  const [rows, setRows] = useState<PlayerRow[]>([makeRow(0, [])])
  const [loading, setLoading] = useState(false)
  const [lobbyLoading, setLobbyLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addPlayer() {
    if (rows.length >= 6) return
    setRows(prev => {
      const usedNames = prev.map(r => r.name)
      return [...prev, makeRow(prev.length, usedNames)]
    })
  }

  function removePlayer(i: number) {
    if (rows.length <= 1) return
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateRow(i: number, patch: Partial<PlayerRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function randomizeAll() {
    const usedNames: string[] = []
    setRows(prev => prev.map(r => {
      const name = r.kind === 'BOT' ? randomBotName(usedNames) : randomHumanName(usedNames)
      usedNames.push(name)
      return { ...r, name }
    }))
  }

  async function handleCreateLobby() {
    setError(null)
    const usedColors = new Set<string>()
    for (const r of rows) {
      if (!r.name.trim()) { setError(t.nameRequiredErr); return }
      if (usedColors.has(r.color)) { setError(t.colorsUniqueErr); return }
      usedColors.add(r.color)
    }
    setLobbyLoading(true)
    try {
      const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080'
      const res = await fetch(`${BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyMode: true,
          seatCount: rows.length,
          colors: rows.map(r => r.color),
        }),
      })
      if (!res.ok) throw new Error(`Backend returned ${res.status}`)
      const { sessionId, hostToken } = await res.json()
      try { localStorage.setItem(`monopoly_host_${sessionId}`, hostToken) } catch {}
      saveTokenShapes(sessionId, rows.map(r => r.tokenShape))
      const firstHuman = rows[0]
      const joined = await joinLobby(sessionId, firstHuman.name.trim(), firstHuman.color)
      try { sessionStorage.setItem(`monopoly_player_${sessionId}`, joined.playerId) } catch {}
      try { sessionStorage.setItem(`monopoly_token_${sessionId}`, joined.playerToken) } catch {}
      try { localStorage.setItem(`monopoly_token_${sessionId}_${joined.playerId}`, joined.playerToken) } catch {}
      try { localStorage.setItem('monopoly_last_name', firstHuman.name.trim()) } catch {}
      joinSession(sessionId)
      navigate(`/lobby-wait/${sessionId}`)
    } catch (e) {
      setError(t.lobbyFailedErr(String(e)))
      setLobbyLoading(false)
    }
  }

  async function handleCreate() {
    setError(null)
    const usedColors = new Set<string>()
    for (const r of rows) {
      if (!r.name.trim()) { setError(t.nameRequiredErr); return }
      if (usedColors.has(r.color)) { setError(t.colorsUniqueErr); return }
      usedColors.add(r.color)
    }
    setLoading(true)
    try {
      const { sessionId, hostToken } = await createSession({
        names: rows.map(r => r.name.trim()),
        colors: rows.map(r => r.color),
        seatKinds: rows.map(r => r.kind),
        difficulties: rows.map(() => 'STRONG'),
      })
      try { localStorage.setItem(`monopoly_host_${sessionId}`, hostToken) } catch {}
      saveTokenShapes(sessionId, rows.map(r => r.tokenShape))
      joinSession(sessionId)
      navigate(`/game/${sessionId}`)
    } catch (e) {
      setError(t.sessionFailedErr(String(e)))
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoBox}>
          <div className={styles.logo}>Monopoly</div>
          <div className={styles.sub}>Helsinki Edition</div>
        </div>

        <div className={styles.players}>
          {rows.map((row, i) => (
            <div key={i} className={styles.playerRow}>
              <div className={styles.colorRow}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    className={`${styles.colorDot} ${row.color === c ? styles.selected : ''}`}
                    style={{ background: c }}
                    onClick={() => updateRow(i, { color: c })}
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
                      onClick={() => updateRow(i, { tokenShape: s.key })}
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
                      onClick={() => updateRow(i, { tokenShape: s.key })}
                      title={s.key}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.nameKindRow}>
                <input
                  className={styles.nameInput}
                  value={row.name}
                  onChange={e => updateRow(i, { name: e.target.value })}
                  maxLength={20}
                  placeholder={t.playerPlaceholder(i)}
                />
                <button
                  className={`${styles.kindBtn} ${row.kind === 'HUMAN' ? styles.human : styles.bot}`}
                  onClick={() => {
                    const newKind: SeatKind = row.kind === 'HUMAN' ? 'BOT' : 'HUMAN'
                    const usedNames = rows.filter((_, j) => j !== i).map(r => r.name)
                    const newName = newKind === 'BOT' ? randomBotName(usedNames) : randomHumanName(usedNames)
                    updateRow(i, { kind: newKind, name: newName })
                  }}
                >
                  {row.kind === 'HUMAN' ? t.humanLabel : t.botLabel}
                </button>
                {rows.length > 1 && (
                  <button className={styles.removeBtn} onClick={() => removePlayer(i)} title={t.removePlayerBtn}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {rows.length < 6 && (
          <button className={styles.addPlayerBtn} onClick={addPlayer} disabled={loading || lobbyLoading}>
            + {t.addPlayerBtn}
          </button>
        )}

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.actionRow}>
          <button className={styles.randomBtn} onClick={randomizeAll} disabled={loading || lobbyLoading} title={t.randomizeNamesBtn}>
            {t.randomizeNamesBtn}
          </button>
          <div className={styles.mainBtns}>
            <div className={styles.btnGroup}>
              <button className={styles.createBtn} onClick={handleCreate} disabled={loading || lobbyLoading}>
                {loading ? t.startingLabel : t.startGameBtn}
              </button>
              <div className={styles.btnHint}>{t.immediateHint}</div>
            </div>
            <div className={styles.btnGroup}>
              <button className={styles.lobbyBtn} onClick={handleCreateLobby} disabled={loading || lobbyLoading}>
                {lobbyLoading ? t.creatingLabel : t.createLobbyBtn}
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

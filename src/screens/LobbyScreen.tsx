import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../store/GameContext'
import { createSession } from '../api/sessionApi'
import type { SeatKind, BotDifficulty } from '../types/api'
import styles from './LobbyScreen.module.css'

const PRESET_COLORS = ['#e53935', '#1e88e5', '#43a047', '#f9a825', '#8e24aa', '#ff7043', '#00acc1', '#6d4c41']

interface PlayerRow {
  name: string
  kind: SeatKind
  color: string
  difficulty: BotDifficulty
}

function defaultRows(count: number): PlayerRow[] {
  const names = ['Pelaaja 1', 'Pelaaja 2', 'Pelaaja 3', 'Pelaaja 4']
  return Array.from({ length: count }, (_, i) => ({
    name: names[i],
    kind: 'HUMAN' as SeatKind,
    color: PRESET_COLORS[i],
    difficulty: 'NORMAL' as BotDifficulty,
  }))
}

export default function LobbyScreen() {
  const navigate = useNavigate()
  const { joinSession } = useGame()
  const [playerCount, setPlayerCount] = useState(2)
  const [rows, setRows] = useState<PlayerRow[]>(defaultRows(2))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function changeCount(n: number) {
    setPlayerCount(n)
    setRows(prev => {
      if (n > prev.length) {
        return [...prev, ...defaultRows(n).slice(prev.length)]
      }
      return prev.slice(0, n)
    })
  }

  function updateRow(i: number, patch: Partial<PlayerRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  async function handleCreate() {
    setError(null)
    const usedColors = new Set<string>()
    for (const r of rows) {
      if (!r.name.trim()) { setError('Kaikilla pelaajilla pitää olla nimi.'); return }
      if (usedColors.has(r.color)) { setError('Jokaisella pelaajalla pitää olla eri väri.'); return }
      usedColors.add(r.color)
    }
    setLoading(true)
    try {
      const sessionId = await createSession({
        names: rows.map(r => r.name.trim()),
        colors: rows.map(r => r.color),
        seatKinds: rows.map(r => r.kind),
        difficulties: rows.map(r => r.difficulty),
      })
      joinSession(sessionId)
      navigate(`/game/${sessionId}`)
    } catch (e) {
      setError('Sessio ei onnistunut: ' + String(e))
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

        <div className={styles.countRow}>
          <label className={styles.label}>Pelaajia</label>
          <div className={styles.countBtns}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                className={`${styles.countBtn} ${playerCount === n ? styles.active : ''}`}
                onClick={() => changeCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
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
              <div className={styles.nameKindRow}>
                <input
                  className={styles.nameInput}
                  value={row.name}
                  onChange={e => updateRow(i, { name: e.target.value })}
                  maxLength={20}
                  placeholder={`Pelaaja ${i + 1}`}
                />
                <button
                  className={`${styles.kindBtn} ${row.kind === 'HUMAN' ? styles.human : styles.bot}`}
                  onClick={() => updateRow(i, { kind: row.kind === 'HUMAN' ? 'COMPUTER' : 'HUMAN' })}
                >
                  {row.kind === 'HUMAN' ? 'Ihminen' : 'Botti'}
                </button>
                {row.kind === 'COMPUTER' && (
                  <select
                    className={styles.diffSelect}
                    value={row.difficulty}
                    onChange={e => updateRow(i, { difficulty: e.target.value as BotDifficulty })}
                  >
                    <option value="EASY">Helppo</option>
                    <option value="NORMAL">Normaali</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <button className={styles.createBtn} onClick={handleCreate} disabled={loading}>
          {loading ? 'Luodaan…' : 'Aloita peli'}
        </button>

        <button className={styles.backBtn} onClick={() => navigate('/')}>
          Takaisin
        </button>
      </div>
    </div>
  )
}

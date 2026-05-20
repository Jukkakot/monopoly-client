import { useState } from 'react'
import styles from './DiceStats.module.css'
import { useGame } from '../../store/GameContext'
import { useT } from '../../i18n/LanguageContext'

function buildDistribution(history: [number, number][]): Map<number, number> {
  const dist = new Map<number, number>()
  for (let i = 2; i <= 12; i++) dist.set(i, 0)
  for (const [a, b] of history) dist.set(a + b, (dist.get(a + b) ?? 0) + 1)
  return dist
}

const THEORETICAL: Record<number, number> = {
  2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1,
}

export default function DiceStats() {
  const { state } = useGame()
  const t = useT()
  const [open, setOpen] = useState(false)
  const history = state.diceHistory

  if (history.length === 0) return null

  const dist = buildDistribution(history)
  const maxCount = Math.max(...Array.from(dist.values()), 1)
  const total = history.length

  const doublesCount = history.filter(([a, b]) => a === b).length
  const doublesPercent = total > 0 ? Math.round((doublesCount / total) * 100) : 0

  const mostCommon = Array.from(dist.entries()).reduce((best, curr) => curr[1] > best[1] ? curr : best, [7, 0])

  return (
    <div className={styles.wrapper}>
      <button className={styles.toggle} onClick={() => setOpen(v => !v)}>
        <span>{t.diceStatsTitle}</span>
        <span className={styles.toggleMeta}>{t.rollCount(total)}{open ? ' ▴' : ' ▾'}</span>
      </button>
      {open && (
        <div className={styles.chart}>
          <div className={styles.bars}>
            {Array.from(dist.entries()).map(([sum, count]) => {
              const heightPct = maxCount > 0 ? (count / maxCount) * 100 : 0
              const theoPct = (THEORETICAL[sum] ?? 0) / 6 * 100
              const isHot = count === maxCount && count > 0
              return (
                <div key={sum} className={styles.barCol}>
                  <div className={styles.barTrack}>
                    <div
                      className={`${styles.barFill} ${isHot ? styles.barHot : ''}`}
                      style={{ height: `${heightPct}%` }}
                      title={`${sum}: ${count}× (teoria ${((THEORETICAL[sum] ?? 0) / 36 * 100).toFixed(0)}%)`}
                    />
                    <div
                      className={styles.barTheo}
                      style={{ height: `${theoPct}%` }}
                    />
                  </div>
                  <div className={styles.barLabel}>{sum}</div>
                  {count > 0 && <div className={styles.barCount}>{count}</div>}
                </div>
              )
            })}
          </div>
          <div className={styles.meta}>
            <span>{t.mostCommonLabel} <strong>{mostCommon[1] > 0 ? mostCommon[0] : '—'}</strong></span>
            <span>{t.doublesStatLabel} <strong>{doublesPercent}%</strong></span>
            <span className={styles.legend}>
              <span className={styles.legendDot} style={{ background: '#2e7d32' }} /> {t.rolledLegend}
              <span className={styles.legendDot} style={{ background: 'rgba(0,0,0,0.12)', border: '1px dashed #aaa' }} /> {t.theoryLegend}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

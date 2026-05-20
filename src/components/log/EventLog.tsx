import { useEffect, useRef, useState } from 'react'
import styles from './EventLog.module.css'
import { useGame } from '../../store/GameContext'
import DiceStats from '../stats/DiceStats'

const ICON_CLASS: Record<string, string> = {
  '🏃': styles.typeMove,
  '⛓': styles.typeJail,
  '🔓': styles.typeJail,
  '🃏': styles.typeCard,
  '🏠': styles.typeBuy,
  '🏗': styles.typeBuild,
  '🏚': styles.typeMortgage,
  '🏦': styles.typeMortgage,
  '💳': styles.typeMortgage,
  '🔨': styles.typeAuction,
  '🤝': styles.typeTrade,
  '🚫': styles.typeTrade,
  '💀': styles.typeBankrupt,
  '🎊': styles.typeGameOver,
  '💰': styles.typeBuy,
  '💸': styles.typeRent,
  '🏆': styles.typeGameOver,
}

type FilterGroup = 'moves' | 'money' | 'property' | 'build' | 'trade' | 'jail'

const FILTER_ICONS: Record<FilterGroup, Set<string>> = {
  moves:    new Set(['🏃']),
  money:    new Set(['💰', '💸']),
  property: new Set(['🏠', '🔨']),
  build:    new Set(['🏗', '🏚', '🏦', '💳']),
  trade:    new Set(['🤝', '🚫']),
  jail:     new Set(['⛓', '🔓', '💀', '🃏', '🎊', '🏆']),
}

const FILTER_LABELS: Record<FilterGroup, string> = {
  moves:    '🏃',
  money:    '💸',
  property: '🏠',
  build:    '🏗',
  trade:    '🤝',
  jail:     '⛓',
}

function relativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 10) return 'juuri nyt'
  if (diff < 60) return `${diff}s sitten`
  const mins = Math.floor(diff / 60)
  if (mins < 60) return `${mins}m sitten`
  return new Date(timestamp).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
}

export default function EventLog() {
  const { state } = useGame()
  const [activeFilters, setActiveFilters] = useState<Set<FilterGroup>>(new Set())
  const [mineOnly, setMineOnly] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [state.events.length])

  function toggleFilter(f: FilterGroup) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  const filtered = [...state.events]
    .filter(e => {
      if (activeFilters.size === 0) return true
      for (const group of activeFilters) {
        if (FILTER_ICONS[group].has(e.icon)) return true
      }
      return false
    })
    .filter(e => !mineOnly || !state.myPlayerId || e.relatedPlayerIds.length === 0 || e.relatedPlayerIds.includes(state.myPlayerId))
    .reverse()

  return (
    <div className={styles.logWrapper}>
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${activeFilters.size === 0 ? styles.filterActive : ''}`}
          onClick={() => setActiveFilters(new Set())}
        >
          Kaikki
        </button>
        {(Object.keys(FILTER_LABELS) as FilterGroup[]).map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${activeFilters.has(f) ? styles.filterActive : ''}`}
            onClick={() => toggleFilter(f)}
            title={f}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        {state.myPlayerId && (
          <button
            className={`${styles.filterBtn} ${mineOnly ? styles.filterMine : ''}`}
            onClick={() => setMineOnly(v => !v)}
            title="Näytä vain omat tapahtumat"
          >
            ⭐
          </button>
        )}
      </div>
      <DiceStats />
      <div className={styles.log}>
        <div ref={topRef} />
        {filtered.length === 0 && (
          <div className={styles.empty}>Ei tapahtumia vielä.</div>
        )}
        {filtered.map(event => {
          const isRelated = state.myPlayerId && event.relatedPlayerIds.includes(state.myPlayerId)
          const typeClass = ICON_CLASS[event.icon] ?? ''
          return (
            <div key={event.id} className={`${styles.entry} ${typeClass} ${isRelated ? styles.mine : ''}`}>
              <span className={styles.icon}>{event.icon}</span>
              <span className={styles.message}>{event.message}</span>
              <span className={styles.time} title={new Date(event.timestamp).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}>
                {relativeTime(event.timestamp)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

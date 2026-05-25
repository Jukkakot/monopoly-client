import { memo, useEffect, useRef, useState, useMemo } from 'react'
import styles from './EventLog.module.css'
import type { GameEvent } from '../../store/events'
import { useT } from '../../i18n/LanguageContext'
import { STREET_COLORS } from '../../types/spots'

const ICON_CLASS: Record<string, string> = {
  '🎲': styles.typeDice,
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

type FilterGroup = 'dice' | 'moves' | 'money' | 'property' | 'build' | 'trade' | 'jail'

const FILTER_ICONS: Record<FilterGroup, Set<string>> = {
  dice:     new Set(['🎲']),
  moves:    new Set(['🏃']),
  money:    new Set(['💰', '💸']),
  property: new Set(['🏠', '🔨']),
  build:    new Set(['🏗', '🏚', '🏦', '💳']),
  trade:    new Set(['🤝', '🚫']),
  jail:     new Set(['⛓', '🔓', '💀', '🃏', '🎊', '🏆']),
}

const FILTER_LABELS: Record<FilterGroup, string> = {
  dice:     '🎲',
  moves:    '🏃',
  money:    '💸',
  property: '🏠',
  build:    '🏗',
  trade:    '🤝',
  jail:     '⛓',
}

interface EntryProps {
  event: GameEvent
  myPlayerId: string | null
}

const EventEntry = memo(function EventEntry({ event, myPlayerId }: EntryProps) {
  const t = useT()
  const isRelated = !!(myPlayerId && event.relatedPlayerIds.includes(myPlayerId))
  const typeClass = ICON_CLASS[event.icon] ?? ''
  const buildColor = event.kind?.includes(':')
    ? STREET_COLORS[event.kind.split(':')[1]] ?? null
    : null
  const entryStyle = buildColor ? { borderLeftColor: buildColor } : undefined

  function relativeTime(timestamp: number): string {
    const diff = Math.floor((Date.now() - timestamp) / 1000)
    if (diff < 10) return t.justNow
    if (diff < 60) return t.secondsAgo(diff)
    const mins = Math.floor(diff / 60)
    if (mins < 60) return t.minutesAgo(mins)
    return new Date(timestamp).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className={`${styles.entry} ${typeClass} ${isRelated ? styles.mine : ''}`} style={entryStyle}>
      <span className={styles.icon}>{event.icon}</span>
      {buildColor && <span className={styles.buildDot} style={{ background: buildColor }} />}
      <span className={styles.message}>{event.message}</span>
      <span className={styles.time} title={new Date(event.timestamp).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}>
        {relativeTime(event.timestamp)}
      </span>
    </div>
  )
})

interface Props {
  events: GameEvent[]
  myPlayerId: string | null
}

export default memo(function EventLog({ events, myPlayerId }: Props) {
  const t = useT()
  const [activeFilters, setActiveFilters] = useState<Set<FilterGroup>>(new Set())
  const [mineOnly, setMineOnly] = useState(false)
  const topRef = useRef<HTMLDivElement>(null)
  const [releasedIds, setReleasedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const now = Date.now()
    const timers: ReturnType<typeof setTimeout>[] = []
    for (const e of events) {
      if (e.releaseAt && e.releaseAt > now && !releasedIds.has(e.id)) {
        timers.push(setTimeout(() => {
          setReleasedIds(prev => new Set(prev).add(e.id))
        }, e.releaseAt - now))
      }
    }
    return () => timers.forEach(clearTimeout)
  }, [events])

  const visibleEvents = useMemo(
    () => events.filter(e => !e.releaseAt || e.releaseAt <= Date.now() || releasedIds.has(e.id)),
    [events, releasedIds]
  )

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [visibleEvents.length])

  const filtered = useMemo(() => {
    let result = visibleEvents
    if (activeFilters.size > 0) {
      result = result.filter(e => {
        for (const group of activeFilters) {
          if (FILTER_ICONS[group].has(e.icon)) return true
        }
        return false
      })
    }
    if (mineOnly && myPlayerId) {
      result = result.filter(e => e.relatedPlayerIds.length === 0 || e.relatedPlayerIds.includes(myPlayerId))
    }
    return [...result].reverse()
  }, [visibleEvents, activeFilters, mineOnly, myPlayerId])

  function toggleFilter(f: FilterGroup) {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(f)) next.delete(f)
      else next.add(f)
      return next
    })
  }

  return (
    <div className={styles.logWrapper}>
      <div className={styles.filterRow}>
        <button
          className={`${styles.filterBtn} ${activeFilters.size === 0 ? styles.filterActive : ''}`}
          onClick={() => setActiveFilters(new Set())}
        >
          {t.filterAll}
        </button>
        {(Object.keys(FILTER_LABELS) as FilterGroup[]).map(f => (
          <button
            key={f}
            className={`${styles.filterBtn} ${activeFilters.has(f) ? styles.filterActive : ''}`}
            onClick={() => toggleFilter(f)}
            title={t.filterTitles[f]}
            data-label={t.filterTitles[f]}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
        {myPlayerId && (
          <button
            className={`${styles.filterBtn} ${mineOnly ? styles.filterMine : ''}`}
            onClick={() => setMineOnly(v => !v)}
            title={t.showMineOnly}
          >
            ⭐
          </button>
        )}
      </div>
      <div className={styles.log}>
        <div ref={topRef} />
        {filtered.length === 0 && (
          <div className={styles.empty}>{t.noEventsYet}</div>
        )}
        {filtered.map(event => (
          <EventEntry key={event.id} event={event} myPlayerId={myPlayerId} />
        ))}
      </div>
    </div>
  )
})

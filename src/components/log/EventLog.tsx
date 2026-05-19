import { useEffect, useRef } from 'react'
import styles from './EventLog.module.css'
import { useGame } from '../../store/GameContext'

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
}

export default function EventLog() {
  const { state } = useGame()
  const events = [...state.events].reverse()
  const topRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [state.events.length])

  return (
    <div className={styles.log}>
      <div ref={topRef} />
      {events.length === 0 && (
        <div className={styles.empty}>Ei tapahtumia vielä.</div>
      )}
      {events.map(event => {
        const isRelated = state.myPlayerId && event.relatedPlayerIds.includes(state.myPlayerId)
        const typeClass = ICON_CLASS[event.icon] ?? ''
        return (
          <div key={event.id} className={`${styles.entry} ${typeClass} ${isRelated ? styles.mine : ''}`}>
            <span className={styles.icon}>{event.icon}</span>
            <span className={styles.message}>{event.message}</span>
            <span className={styles.time}>
              {new Date(event.timestamp).toLocaleTimeString('fi-FI', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

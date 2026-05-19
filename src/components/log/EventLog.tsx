import styles from './EventLog.module.css'
import { useGame } from '../../store/GameContext'

export default function EventLog() {
  const { state } = useGame()
  const events = [...state.events].reverse()

  return (
    <div className={styles.log}>
      {events.length === 0 && (
        <div className={styles.empty}>Ei tapahtumia vielä.</div>
      )}
      {events.map(event => {
        const isRelated = state.myPlayerId && event.relatedPlayerIds.includes(state.myPlayerId)
        return (
          <div key={event.id} className={`${styles.entry} ${isRelated ? styles.mine : ''}`}>
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

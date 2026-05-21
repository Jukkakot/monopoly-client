import styles from './DiceStats.module.css'
import { useGame } from '../../store/GameContext'

export default function DiceStats() {
  const { state } = useGame()
  const diceEvents = state.events
    .filter(e => e.icon === '🎲' && e.kind)
    .slice(-8)
    .reverse()

  if (diceEvents.length === 0) return null

  return (
    <div className={styles.wrapper}>
      <div className={styles.rolls}>
        {diceEvents.map(e => {
          const [d1s, d2s] = (e.kind ?? '').split('_')
          const d1 = parseInt(d1s), d2 = parseInt(d2s)
          const isDoubles = d1 === d2
          const shortName = e.message.split(' ')[0]
          return (
            <div key={e.id} className={`${styles.roll} ${isDoubles ? styles.rollDoubles : ''}`}>
              <span className={styles.rollName}>{shortName}</span>
              <span className={styles.rollDice}>{d1}+{d2}</span>
              <span className={styles.rollSum}>{d1+d2}</span>
              {isDoubles && <span className={styles.rollDoublesTag}>×2</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

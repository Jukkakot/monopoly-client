import { useState, useEffect, useRef } from 'react'
import styles from './DiceDisplay.module.css'
import { useT } from '../../i18n/LanguageContext'

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.72], [0.72, 0.28]],
  3: [[0.28, 0.72], [0.5, 0.5], [0.72, 0.28]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.25], [0.72, 0.25], [0.28, 0.5], [0.72, 0.5], [0.28, 0.75], [0.72, 0.75]],
}

export function DieFace({ value, size }: { value: number; size: number }) {
  const positions = DOT_POSITIONS[value] ?? []
  const s = size
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <rect x="1.5" y="1.5" width={s - 3} height={s - 3} rx={s * 0.16} fill="white"
        stroke="rgba(0,0,0,0.15)" strokeWidth="1"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} />
      {positions.map(([fx, fy], i) => (
        <circle key={i} cx={fx * s} cy={fy * s} r={s * 0.088} fill="#1a1a2e" />
      ))}
    </svg>
  )
}

interface AnimatedDiceProps {
  dice: [number, number] | null
  rollKey: number
  size?: number
  showSum?: boolean
  className?: string
}

export function AnimatedDice({ dice, rollKey, size = 36, showSum, className }: AnimatedDiceProps) {
  const t = useT()
  const [d1, setD1] = useState(dice?.[0] ?? 1)
  const [d2, setD2] = useState(dice?.[1] ?? 1)
  const [rolling, setRolling] = useState(false)
  const prevKeyRef = useRef(rollKey)
  // Always points to the latest dice prop so the interval's final frame is never stale.
  const diceRef = useRef(dice)
  diceRef.current = dice

  useEffect(() => {
    const d = diceRef.current
    if (!d || rollKey === prevKeyRef.current) return
    prevKeyRef.current = rollKey
    setRolling(true)

    let frame = 0
    const FRAMES = 11
    const id = setInterval(() => {
      frame++
      if (frame >= FRAMES) {
        clearInterval(id)
        const latest = diceRef.current
        setD1(latest?.[0] ?? 1)
        setD2(latest?.[1] ?? 1)
        setRolling(false)
      } else {
        setD1(Math.ceil(Math.random() * 6))
        setD2(Math.ceil(Math.random() * 6))
      }
    }, 50)
    // Reset rolling on cleanup so the sync effect can recover if this effect is interrupted
    // (e.g. component unmounts or rollKey changes while animation is mid-run).
    return () => { clearInterval(id); setRolling(false) }
  }, [rollKey])

  // Sync to real values when not rolling
  useEffect(() => {
    if (!rolling && dice) { setD1(dice[0]); setD2(dice[1]) }
  }, [dice, rolling])

  if (!dice) return null
  const isDoubles = dice[0] === dice[1]
  const sum = dice[0] + dice[1]

  return (
    <div className={`${styles.row} ${className ?? ''}`}>
      <span className={rolling ? styles.rolling : styles.settled} key={`d1-${rollKey}`}>
        <DieFace value={d1} size={size} />
      </span>
      <span className={rolling ? styles.rollingDelayed : styles.settledDelayed} key={`d2-${rollKey}`}>
        <DieFace value={d2} size={size} />
      </span>
      {showSum && !rolling && (
        <span className={styles.sum}>{sum}</span>
      )}
      {isDoubles && !rolling && (
        <span className={styles.doubles}>{t.doublesLabel}</span>
      )}
    </div>
  )
}

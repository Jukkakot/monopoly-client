import { useEffect, useRef, useState } from 'react'
import styles from './Celebration.module.css'
import type { CelebrationData } from '../../utils/celebration'

/**
 * A brief, non-blocking celebration flourish for a player milestone (monopoly, purchase,
 * auction win, hotel). Auto-dismisses after ~2.5s. Reduced-motion collapses to a fade.
 */
export default function Celebration({ data, onDone }: {
  data: CelebrationData
  onDone: () => void
}) {
  const [leaving, setLeaving] = useState(false)

  // Keep the latest onDone without making it an effect dependency: the parent passes an
  // inline arrow that changes every render, and it re-renders constantly during play. If
  // onDone were a dep, the fade/dismiss timers would reset on every parent render and the
  // celebration could linger far past 2.5s. Run the timers once per celebration (data.id).
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])
  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 2000)
    const done = setTimeout(() => onDoneRef.current(), 2500)
    return () => { clearTimeout(fade); clearTimeout(done) }
  }, [data.id])

  return (
    <div className={`${styles.overlay} ${leaving ? styles.leaving : ''}`} aria-hidden="true">
      <div className={styles.rays} style={{ ['--ray' as string]: data.accentColor }} />
      <div className={styles.card} style={{ ['--group' as string]: data.accentColor }}>
        <div className={styles.icon}>{data.icon}</div>
        <div className={styles.title}>{data.title}</div>
        <div className={styles.swatch} style={{ background: data.accentColor }} />
        {data.subtitle && <div className={styles.sub}>{data.subtitle}</div>}
        {data.price && <div className={styles.price}>{data.price}</div>}
        {data.playerName && <div className={styles.player} style={{ color: data.playerColor }}>{data.playerName}</div>}
      </div>
    </div>
  )
}
